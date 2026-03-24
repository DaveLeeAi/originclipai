import { describe, it, expect } from "vitest";
import {
  calculateCropRect,
  getTargetDimensions,
  type AspectRatio,
} from "@/workers/render/ffmpeg";
import {
  buildFaceTrack,
  getCropCenterAtTime,
  CenterCropFallback,
  type KeyframeFaces,
  type FaceBox,
} from "@/workers/render/face-detect";
import {
  generateAssFile,
  generateSimpleAssFile,
  generateSrt,
  generateVtt,
  CAPTION_STYLES,
  type WordTimestamp,
} from "@/workers/render/captions";

// ─── Aspect Ratio Dimensions ────────────────────────────────────────

describe("getTargetDimensions", () => {
  it("returns 1080x1920 for 9:16 vertical", () => {
    const dims = getTargetDimensions("9x16");
    expect(dims).toEqual({ width: 1080, height: 1920 });
  });

  it("returns 1080x1080 for 1:1 square", () => {
    const dims = getTargetDimensions("1x1");
    expect(dims).toEqual({ width: 1080, height: 1080 });
  });

  it("returns 1920x1080 for 16:9 landscape", () => {
    const dims = getTargetDimensions("16x9");
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });
});

// ─── Crop Rectangle Calculation ─────────────────────────────────────

describe("calculateCropRect", () => {
  it("crops width for 9:16 from 1920x1080 source (solo speaker)", () => {
    const crop = calculateCropRect(1920, 1080, "9x16");
    // Should crop width to fit 9:16 aspect from 16:9 source
    expect(crop.w).toBeLessThan(1920);
    expect(crop.h).toBe(1080);
    expect(crop.w / crop.h).toBeCloseTo(9 / 16, 1);
    // Centered when no face specified
    expect(crop.x).toBeGreaterThan(0);
    expect(crop.y).toBe(0);
  });

  it("centers crop on face position", () => {
    const crop = calculateCropRect(1920, 1080, "9x16", 400, 540);
    // Crop should be biased toward x=400
    expect(crop.x + crop.w / 2).toBeCloseTo(400, -1);
  });

  it("clamps crop to frame boundaries", () => {
    // Face at far right edge
    const crop = calculateCropRect(1920, 1080, "9x16", 1900, 540);
    expect(crop.x + crop.w).toBeLessThanOrEqual(1920);
    expect(crop.x).toBeGreaterThanOrEqual(0);
  });

  it("clamps crop at left edge", () => {
    const crop = calculateCropRect(1920, 1080, "9x16", 10, 540);
    expect(crop.x).toBe(0);
  });

  it("returns even dimensions (FFmpeg requirement)", () => {
    const testCases: Array<[number, number, AspectRatio]> = [
      [1920, 1080, "9x16"],
      [1920, 1080, "1x1"],
      [1280, 720, "9x16"],
      [1280, 720, "1x1"],
      [3840, 2160, "9x16"],
    ];

    for (const [w, h, ratio] of testCases) {
      const crop = calculateCropRect(w, h, ratio);
      expect(crop.w % 2).toBe(0);
      expect(crop.h % 2).toBe(0);
    }
  });

  it("16:9 passthrough on 16:9 source crops minimally", () => {
    const crop = calculateCropRect(1920, 1080, "16x9");
    // For 16:9 source to 16:9 target, crop should be full frame or very close
    expect(crop.w).toBe(1920);
    expect(crop.h).toBe(1080);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });

  it("1:1 from 1920x1080 crops width to 1080x1080", () => {
    const crop = calculateCropRect(1920, 1080, "1x1");
    expect(crop.w).toBe(1080);
    expect(crop.h).toBe(1080);
  });

  it("handles 2-person interview: face at 1/3 position", () => {
    // Face at left-third of a 1920x1080 frame
    const crop = calculateCropRect(1920, 1080, "9x16", 640, 400);
    expect(crop.x + crop.w / 2).toBeCloseTo(640, -2);
  });
});

// ─── Face Track Builder ─────────────────────────────────────────────

describe("buildFaceTrack", () => {
  it("returns center crop when no faces detected", () => {
    const keyframes: KeyframeFaces[] = [
      { time: 0, faces: [], primary: null },
      { time: 0.5, faces: [], primary: null },
      { time: 1.0, faces: [], primary: null },
    ];

    const track = buildFaceTrack(keyframes);
    expect(track.hasFace).toBe(false);
    expect(track.detectedCount).toBe(0);
    expect(track.totalKeyframes).toBe(3);
    expect(track.keyframes[0].cx).toBeCloseTo(0.5);
    expect(track.keyframes[0].cy).toBeCloseTo(0.5);
  });

  it("tracks single face across all keyframes", () => {
    const face: FaceBox = { cx: 0.3, cy: 0.4, w: 0.2, h: 0.3, confidence: 0.9 };
    const keyframes: KeyframeFaces[] = [
      { time: 0, faces: [face], primary: face },
      { time: 0.5, faces: [face], primary: face },
      { time: 1.0, faces: [face], primary: face },
    ];

    const track = buildFaceTrack(keyframes);
    expect(track.hasFace).toBe(true);
    expect(track.detectedCount).toBe(3);
    // All positions should be near 0.3, 0.4 (smoothing may shift slightly)
    for (const kf of track.keyframes) {
      expect(kf.cx).toBeCloseTo(0.3, 1);
      expect(kf.cy).toBeCloseTo(0.4, 1);
    }
  });

  it("interpolates across gaps (face lost mid-clip)", () => {
    const faceStart: FaceBox = { cx: 0.3, cy: 0.5, w: 0.2, h: 0.3, confidence: 0.9 };
    const faceEnd: FaceBox = { cx: 0.7, cy: 0.5, w: 0.2, h: 0.3, confidence: 0.9 };

    const keyframes: KeyframeFaces[] = [
      { time: 0, faces: [faceStart], primary: faceStart },
      { time: 0.5, faces: [], primary: null }, // Gap
      { time: 1.0, faces: [faceEnd], primary: faceEnd },
    ];

    const track = buildFaceTrack(keyframes);
    expect(track.hasFace).toBe(true);
    expect(track.detectedCount).toBe(2);
    // Middle keyframe should be interpolated between 0.3 and 0.7
    const mid = track.keyframes[1];
    expect(mid.cx).toBeGreaterThan(0.3);
    expect(mid.cx).toBeLessThan(0.7);
  });

  it("handles 2-person interview with face switching", () => {
    const face1: FaceBox = { cx: 0.25, cy: 0.4, w: 0.15, h: 0.2, confidence: 0.85 };
    const face2: FaceBox = { cx: 0.75, cy: 0.4, w: 0.15, h: 0.2, confidence: 0.80 };

    // Primary face switches from face1 to face2
    const keyframes: KeyframeFaces[] = [
      { time: 0, faces: [face1, face2], primary: face1 },
      { time: 0.5, faces: [face1, face2], primary: face1 },
      { time: 1.0, faces: [face1, face2], primary: face2 },
      { time: 1.5, faces: [face1, face2], primary: face2 },
    ];

    const track = buildFaceTrack(keyframes);
    expect(track.hasFace).toBe(true);
    // Smoothing should create a gradual transition
    expect(track.keyframes.length).toBe(4);
  });
});

describe("getCropCenterAtTime", () => {
  it("returns center for empty track", () => {
    const center = getCropCenterAtTime(
      { keyframes: [], hasFace: false, detectedCount: 0, totalKeyframes: 0 },
      0.5,
    );
    expect(center.cx).toBe(0.5);
    expect(center.cy).toBe(0.5);
  });

  it("returns single keyframe position", () => {
    const center = getCropCenterAtTime(
      {
        keyframes: [{ time: 0, cx: 0.3, cy: 0.4 }],
        hasFace: true,
        detectedCount: 1,
        totalKeyframes: 1,
      },
      0.5,
    );
    expect(center.cx).toBe(0.3);
    expect(center.cy).toBe(0.4);
  });

  it("interpolates between keyframes", () => {
    const center = getCropCenterAtTime(
      {
        keyframes: [
          { time: 0, cx: 0.2, cy: 0.5 },
          { time: 1.0, cx: 0.8, cy: 0.5 },
        ],
        hasFace: true,
        detectedCount: 2,
        totalKeyframes: 2,
      },
      0.5,
    );
    expect(center.cx).toBeCloseTo(0.5, 1);
    expect(center.cy).toBeCloseTo(0.5, 1);
  });

  it("clamps before first keyframe", () => {
    const center = getCropCenterAtTime(
      {
        keyframes: [
          { time: 1.0, cx: 0.3, cy: 0.4 },
          { time: 2.0, cx: 0.7, cy: 0.6 },
        ],
        hasFace: true,
        detectedCount: 2,
        totalKeyframes: 2,
      },
      0,
    );
    expect(center.cx).toBe(0.3);
    expect(center.cy).toBe(0.4);
  });

  it("clamps after last keyframe", () => {
    const center = getCropCenterAtTime(
      {
        keyframes: [
          { time: 0, cx: 0.3, cy: 0.4 },
          { time: 1.0, cx: 0.7, cy: 0.6 },
        ],
        hasFace: true,
        detectedCount: 2,
        totalKeyframes: 2,
      },
      5.0,
    );
    expect(center.cx).toBe(0.7);
    expect(center.cy).toBe(0.6);
  });
});

// ─── Caption Generation ─────────────────────────────────────────────

describe("CAPTION_STYLES", () => {
  it("defines all 5 required styles", () => {
    expect(Object.keys(CAPTION_STYLES)).toEqual(
      expect.arrayContaining(["karaoke", "boxed", "minimal", "impact", "subtitle"]),
    );
    expect(Object.keys(CAPTION_STYLES).length).toBe(5);
  });

  it("karaoke style has bottom-center alignment", () => {
    expect(CAPTION_STYLES.karaoke.alignment).toBe(2);
    expect(CAPTION_STYLES.karaoke.bold).toBe(true);
  });

  it("minimal style has top-center alignment", () => {
    expect(CAPTION_STYLES.minimal.alignment).toBe(8);
  });

  it("all styles have valid ASS color format", () => {
    for (const [name, style] of Object.entries(CAPTION_STYLES)) {
      expect(style.primaryColor).toMatch(/^&H[0-9A-Fa-f]{8}$/);
      expect(style.highlightColor).toMatch(/^&H[0-9A-Fa-f]{8}$/);
      expect(style.outlineColor).toMatch(/^&H[0-9A-Fa-f]{8}$/);
    }
  });
});

describe("generateAssFile", () => {
  const words: WordTimestamp[] = [
    { word: "Hello", start: 0, end: 0.3, speakerId: "s1" },
    { word: "world", start: 0.35, end: 0.7, speakerId: "s1" },
    { word: "this", start: 0.8, end: 1.0, speakerId: "s1" },
    { word: "is", start: 1.05, end: 1.2, speakerId: "s1" },
    { word: "a", start: 1.25, end: 1.35, speakerId: "s1" },
    { word: "test", start: 1.4, end: 1.7, speakerId: "s1" },
  ];

  it("generates valid ASS file structure", () => {
    const ass = generateAssFile(words, "karaoke", 1080, 1920);
    expect(ass).toContain("[Script Info]");
    expect(ass).toContain("[V4+ Styles]");
    expect(ass).toContain("[Events]");
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("PlayResY: 1920");
  });

  it("groups words into lines of max 5", () => {
    const ass = generateAssFile(words, "karaoke", 1080, 1920);
    const dialogueLines = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    // 6 words / 5 per line = 2 lines
    expect(dialogueLines.length).toBe(2);
  });

  it("includes karaoke timing tags", () => {
    const ass = generateAssFile(words, "karaoke", 1080, 1920);
    expect(ass).toContain("\\kf"); // karaoke fill tags
  });

  it("applies speaker colors when provided", () => {
    const speakerColors = [{ speakerId: "s1", color: "&H00FF0000" }];
    const ass = generateAssFile(words, "karaoke", 1080, 1920, speakerColors);
    expect(ass).toContain("\\1c&H00FF0000");
  });

  it("uses correct style for each named style", () => {
    for (const styleName of Object.keys(CAPTION_STYLES)) {
      const ass = generateAssFile(words, styleName, 1080, 1920);
      expect(ass).toContain("[Script Info]");
      expect(ass).toContain("Dialogue:");
    }
  });

  it("falls back to karaoke for unknown style", () => {
    const ass = generateAssFile(words, "nonexistent", 1080, 1920);
    expect(ass).toContain("[Script Info]");
    expect(ass).toContain("Dialogue:");
  });
});

describe("generateSimpleAssFile", () => {
  it("generates subtitle-style ASS without karaoke tags", () => {
    const segments = [
      { text: "Hello world", start: 0, end: 1.5 },
      { text: "This is a test", start: 1.5, end: 3.0 },
    ];
    const ass = generateSimpleAssFile(segments, "subtitle", 1080, 1920);
    expect(ass).toContain("[Events]");
    expect(ass).not.toContain("\\kf"); // No karaoke tags
    expect(ass).toContain("Hello world");
    expect(ass).toContain("This is a test");
  });
});

// ─── SRT/VTT Generation ─────────────────────────────────────────────

describe("generateSrt", () => {
  const segments = [
    { text: "Hello world", start: 0, end: 1.5 },
    { text: "This is a test", start: 2.0, end: 4.0 },
    { text: "Final segment", start: 5.0, end: 7.5 },
  ];

  it("generates valid SRT format", () => {
    const srt = generateSrt(segments);
    expect(srt).toContain("1\n");
    expect(srt).toContain("2\n");
    expect(srt).toContain("3\n");
    expect(srt).toContain("00:00:00,000 --> 00:00:01,500");
    expect(srt).toContain("Hello world");
  });

  it("uses comma for millisecond separator (SRT standard)", () => {
    const srt = generateSrt(segments);
    expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
  });

  it("handles timestamps over 1 hour", () => {
    const longSegments = [
      { text: "Late in the video", start: 3661.5, end: 3665.0 },
    ];
    const srt = generateSrt(longSegments);
    expect(srt).toContain("01:01:01,500");
  });
});

describe("generateVtt", () => {
  const segments = [
    { text: "Hello world", start: 0, end: 1.5 },
    { text: "This is a test", start: 2.0, end: 4.0 },
  ];

  it("starts with WEBVTT header", () => {
    const vtt = generateVtt(segments);
    expect(vtt).toMatch(/^WEBVTT\n/);
  });

  it("uses period for millisecond separator (VTT standard)", () => {
    const vtt = generateVtt(segments);
    expect(vtt).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  it("contains all segment text", () => {
    const vtt = generateVtt(segments);
    expect(vtt).toContain("Hello world");
    expect(vtt).toContain("This is a test");
  });
});

// ─── Speaker Color Coding ───────────────────────────────────────────

describe("speaker color coding in captions", () => {
  it("applies different colors for host vs guest", () => {
    const words: WordTimestamp[] = [
      { word: "Host", start: 0, end: 0.3, speakerId: "host1" },
      { word: "speaks", start: 0.35, end: 0.7, speakerId: "host1" },
      { word: "Guest", start: 0.8, end: 1.0, speakerId: "guest1" },
      { word: "responds", start: 1.05, end: 1.4, speakerId: "guest1" },
    ];

    const speakerColors = [
      { speakerId: "host1", color: "&H004646E5" }, // Indigo
      { speakerId: "guest1", color: "&H00FFFF00" }, // Cyan
    ];

    const ass = generateAssFile(words, "karaoke", 1080, 1920, speakerColors);
    expect(ass).toContain("\\1c&H004646E5"); // Host color
    expect(ass).toContain("\\1c&H00FFFF00"); // Guest color
  });
});

// ─── Caption Timing Sync ────────────────────────────────────────────

describe("caption timing sync", () => {
  it("word-level timestamps are preserved in karaoke output", () => {
    const words: WordTimestamp[] = [
      { word: "One", start: 0, end: 0.5 },
      { word: "Two", start: 0.6, end: 1.0 },
      { word: "Three", start: 1.1, end: 1.5 },
    ];

    const ass = generateAssFile(words, "karaoke", 1080, 1920);
    // Should contain dialogue starting at 0:00:00.00
    expect(ass).toContain("0:00:00.00");
    // Should contain duration tags in centiseconds
    expect(ass).toMatch(/\\kf\d+/);
  });

  it("handles gaps between words", () => {
    const words: WordTimestamp[] = [
      { word: "Before", start: 0, end: 0.5 },
      { word: "After", start: 2.0, end: 2.5 }, // 1.5s gap
    ];

    const ass = generateAssFile(words, "karaoke", 1080, 1920);
    const dialogues = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    // Both words in same line (< 5 words)
    expect(dialogues.length).toBe(1);
    // Gap should be encoded as \k tag
    expect(ass).toMatch(/\\k\d+/);
  });
});

// ─── CenterCropFallback ─────────────────────────────────────────────

describe("CenterCropFallback", () => {
  it("implements FaceDetectionProvider interface", () => {
    const fallback = new CenterCropFallback();
    expect(typeof fallback.detectFaces).toBe("function");
  });
});
