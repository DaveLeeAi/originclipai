// src/workers/render/face-detect.ts

/**
 * Face detection for auto-reframe.
 * Samples keyframes, detects faces, and produces a smooth crop path.
 *
 * v1 approach: Use FFmpeg's built-in face detection or a lightweight
 * external detector. This module defines the interface and provides
 * a center-crop fallback when no face is detected.
 *
 * The face detection provider is abstracted so we can swap between:
 * - FFmpeg cropdetect (basic, no face detection)
 * - MediaPipe Face Detection (accurate, needs Python bridge)
 * - YOLO-face (fast, needs model file)
 * - External API (e.g., AWS Rekognition — expensive)
 */

export interface FaceBox {
  /** Center X as fraction of frame width (0.0 - 1.0) */
  cx: number;
  /** Center Y as fraction of frame height (0.0 - 1.0) */
  cy: number;
  /** Width as fraction of frame width */
  w: number;
  /** Height as fraction of frame height */
  h: number;
  /** Detection confidence (0.0 - 1.0) */
  confidence: number;
}

export interface KeyframeFaces {
  /** Time in seconds from clip start */
  time: number;
  /** Detected faces at this keyframe */
  faces: FaceBox[];
  /** Primary face (largest or most central) */
  primary: FaceBox | null;
}

export interface FaceTrack {
  /** Sequence of primary face positions over time */
  keyframes: Array<{
    time: number;
    cx: number; // Face center X as fraction
    cy: number; // Face center Y as fraction
  }>;
  /** Whether any face was detected at all */
  hasFace: boolean;
  /** Number of keyframes with a detected face */
  detectedCount: number;
  /** Total keyframes sampled */
  totalKeyframes: number;
}

export interface FaceDetectionProvider {
  /**
   * Detect faces at sampled keyframes throughout a video clip.
   * @param videoPath - Path to the video file
   * @param sampleIntervalSec - How often to sample (default: 0.5s)
   * @returns Face detection results per keyframe
   */
  detectFaces(
    videoPath: string,
    sampleIntervalSec?: number,
  ): Promise<KeyframeFaces[]>;
}

// ============================================================
// FACE TRACK BUILDER
// ============================================================

/**
 * Build a smooth face track from keyframe detections.
 * Interpolates between detected positions and handles gaps.
 */
export function buildFaceTrack(keyframes: KeyframeFaces[]): FaceTrack {
  const detected = keyframes.filter(kf => kf.primary !== null);

  if (detected.length === 0) {
    // No faces detected — center crop
    return {
      keyframes: keyframes.map(kf => ({
        time: kf.time,
        cx: 0.5,
        cy: 0.5,
      })),
      hasFace: false,
      detectedCount: 0,
      totalKeyframes: keyframes.length,
    };
  }

  // Build track with interpolation for gaps
  const track: FaceTrack['keyframes'] = [];

  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i];

    if (kf.primary) {
      track.push({
        time: kf.time,
        cx: kf.primary.cx,
        cy: kf.primary.cy,
      });
    } else {
      // No face at this keyframe — interpolate from nearest detections
      const prev = findNearest(keyframes, i, -1);
      const next = findNearest(keyframes, i, 1);

      if (prev && next) {
        // Interpolate between previous and next detection
        const totalSpan = next.time - prev.time;
        const t = totalSpan > 0 ? (kf.time - prev.time) / totalSpan : 0.5;
        track.push({
          time: kf.time,
          cx: lerp(prev.primary!.cx, next.primary!.cx, t),
          cy: lerp(prev.primary!.cy, next.primary!.cy, t),
        });
      } else if (prev) {
        // Only previous — hold position
        track.push({ time: kf.time, cx: prev.primary!.cx, cy: prev.primary!.cy });
      } else if (next) {
        // Only next — hold position
        track.push({ time: kf.time, cx: next.primary!.cx, cy: next.primary!.cy });
      } else {
        // Should not happen (detected.length > 0), but fallback to center
        track.push({ time: kf.time, cx: 0.5, cy: 0.5 });
      }
    }
  }

  // Apply smoothing to reduce jitter
  const smoothed = smoothTrack(track, 3);

  return {
    keyframes: smoothed,
    hasFace: true,
    detectedCount: detected.length,
    totalKeyframes: keyframes.length,
  };
}

/**
 * Get the crop center position at a specific time by interpolating the face track.
 */
export function getCropCenterAtTime(
  track: FaceTrack,
  time: number,
): { cx: number; cy: number } {
  const kfs = track.keyframes;

  if (kfs.length === 0) return { cx: 0.5, cy: 0.5 };
  if (kfs.length === 1) return { cx: kfs[0].cx, cy: kfs[0].cy };
  if (time <= kfs[0].time) return { cx: kfs[0].cx, cy: kfs[0].cy };
  if (time >= kfs[kfs.length - 1].time) {
    return { cx: kfs[kfs.length - 1].cx, cy: kfs[kfs.length - 1].cy };
  }

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    if (time >= kfs[i].time && time <= kfs[i + 1].time) {
      const span = kfs[i + 1].time - kfs[i].time;
      const t = span > 0 ? (time - kfs[i].time) / span : 0;
      return {
        cx: lerp(kfs[i].cx, kfs[i + 1].cx, t),
        cy: lerp(kfs[i].cy, kfs[i + 1].cy, t),
      };
    }
  }

  return { cx: 0.5, cy: 0.5 };
}

// ============================================================
// FALLBACK: CENTER CROP PROVIDER
// ============================================================

/**
 * Fallback face detection that always returns center.
 * Used when no face detection engine is available.
 */
export class CenterCropFallback implements FaceDetectionProvider {
  async detectFaces(
    videoPath: string,
    sampleIntervalSec: number = 0.5,
  ): Promise<KeyframeFaces[]> {
    // We still need to know the duration to generate keyframes
    // Import dynamically to avoid circular dependency
    const { probeVideo } = await import('./ffmpeg');
    const probe = await probeVideo(videoPath);
    const keyframes: KeyframeFaces[] = [];

    for (let t = 0; t < probe.duration; t += sampleIntervalSec) {
      keyframes.push({
        time: t,
        faces: [],
        primary: null, // No detection — buildFaceTrack will center
      });
    }

    return keyframes;
  }
}

// ============================================================
// HELPERS
// ============================================================

function findNearest(
  keyframes: KeyframeFaces[],
  fromIndex: number,
  direction: -1 | 1,
): KeyframeFaces | null {
  let i = fromIndex + direction;
  while (i >= 0 && i < keyframes.length) {
    if (keyframes[i].primary) return keyframes[i];
    i += direction;
  }
  return null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Simple moving average smoothing to reduce jitter in face tracking.
 */
function smoothTrack(
  track: FaceTrack['keyframes'],
  windowSize: number,
): FaceTrack['keyframes'] {
  if (track.length <= windowSize) return track;

  const half = Math.floor(windowSize / 2);

  return track.map((point, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(track.length - 1, i + half);
    const window = track.slice(start, end + 1);

    const avgCx = window.reduce((sum, p) => sum + p.cx, 0) / window.length;
    const avgCy = window.reduce((sum, p) => sum + p.cy, 0) / window.length;

    return { time: point.time, cx: avgCx, cy: avgCy };
  });
}
