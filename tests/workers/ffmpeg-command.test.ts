import { describe, it, expect } from 'vitest';
import {
  buildProbeArgs,
  buildExtractClipArgs,
  buildRenderArgs,
  buildRenderFromExtractedArgs,
  buildExtractAudioArgs,
  buildVideoFilterChain,
  buildAudioFilterChain,
  getTargetDimensions,
  calculateCropRect,
  escapeFfmpegPath,
  type AspectRatio,
  type CropRect,
} from '@/workers/render/ffmpeg-command';

// ─── Probe Args ──────────────────────────────────────────────────────

describe('buildProbeArgs', () => {
  it('generates correct ffprobe arguments', () => {
    const args = buildProbeArgs({ inputPath: '/tmp/video.mp4' });
    expect(args).toEqual([
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      '/tmp/video.mp4',
    ]);
  });

  it('handles paths with spaces', () => {
    const args = buildProbeArgs({ inputPath: '/tmp/my video file.mp4' });
    expect(args[args.length - 1]).toBe('/tmp/my video file.mp4');
  });
});

// ─── Extract Clip Args ───────────────────────────────────────────────

describe('buildExtractClipArgs', () => {
  it('generates stream-copy extraction arguments', () => {
    const args = buildExtractClipArgs({
      inputPath: '/tmp/source.mp4',
      outputPath: '/tmp/segment.mp4',
      startTime: 10.5,
      endTime: 40.2,
    });

    expect(args).toContain('-y');
    expect(args).toContain('-c');
    expect(args[args.indexOf('-c') + 1]).toBe('copy');
    expect(args).toContain('-ss');
    expect(args[args.indexOf('-ss') + 1]).toBe('10.500');
    expect(args).toContain('-t');
    expect(args[args.indexOf('-t') + 1]).toBe('29.700');
    expect(args).toContain('-avoid_negative_ts');
    expect(args[args.length - 1]).toBe('/tmp/segment.mp4');
  });

  it('handles zero start time', () => {
    const args = buildExtractClipArgs({
      inputPath: '/tmp/source.mp4',
      outputPath: '/tmp/out.mp4',
      startTime: 0,
      endTime: 15,
    });
    expect(args[args.indexOf('-ss') + 1]).toBe('0.000');
    expect(args[args.indexOf('-t') + 1]).toBe('15.000');
  });

  it('calculates duration from end - start', () => {
    const args = buildExtractClipArgs({
      inputPath: 'in.mp4',
      outputPath: 'out.mp4',
      startTime: 100,
      endTime: 130,
    });
    expect(args[args.indexOf('-t') + 1]).toBe('30.000');
  });
});

// ─── Video Filter Chain ──────────────────────────────────────────────

describe('buildVideoFilterChain', () => {
  it('includes trim for full render', () => {
    const chain = buildVideoFilterChain({
      startTime: 5,
      duration: 20,
      targetWidth: 1080,
      targetHeight: 1920,
    });
    expect(chain).toContain('trim=start=5.000:duration=20.000');
    expect(chain).toContain('setpts=PTS-STARTPTS');
  });

  it('skips trim when skipTrim is true', () => {
    const chain = buildVideoFilterChain({
      startTime: 5,
      duration: 20,
      targetWidth: 1080,
      targetHeight: 1920,
      skipTrim: true,
    });
    expect(chain).not.toContain('trim=');
    expect(chain).not.toContain('setpts=');
  });

  it('includes crop filter when crop rect provided', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      crop: { x: 420, y: 0, w: 608, h: 1080 },
      targetWidth: 1080,
      targetHeight: 1920,
    });
    expect(chain).toContain('crop=608:1080:420:0');
  });

  it('omits crop filter when no crop rect', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      targetWidth: 1920,
      targetHeight: 1080,
    });
    expect(chain).not.toContain('crop=');
  });

  it('always includes scale and pad', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      targetWidth: 1080,
      targetHeight: 1080,
    });
    expect(chain).toContain('scale=1080:1080:force_original_aspect_ratio=decrease');
    expect(chain).toContain('pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black');
  });

  it('includes ass subtitle filter when subtitle path provided', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      targetWidth: 1080,
      targetHeight: 1920,
      subtitlePath: '/tmp/captions.ass',
    });
    expect(chain).toContain('ass=/tmp/captions.ass');
  });

  it('does not include ass filter when no subtitle path', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      targetWidth: 1080,
      targetHeight: 1920,
    });
    expect(chain).not.toContain('ass=');
  });

  it('filter order is: trim → crop → scale → pad → ass', () => {
    const chain = buildVideoFilterChain({
      startTime: 1,
      duration: 5,
      crop: { x: 100, y: 0, w: 600, h: 1080 },
      targetWidth: 1080,
      targetHeight: 1920,
      subtitlePath: '/tmp/cap.ass',
    });
    const parts = chain.split(',');
    const trimIdx = parts.findIndex(p => p.startsWith('trim='));
    const cropIdx = parts.findIndex(p => p.startsWith('crop='));
    const scaleIdx = parts.findIndex(p => p.startsWith('scale='));
    const padIdx = parts.findIndex(p => p.startsWith('pad='));
    const assIdx = parts.findIndex(p => p.startsWith('ass='));

    expect(trimIdx).toBeLessThan(cropIdx);
    expect(cropIdx).toBeLessThan(scaleIdx);
    expect(scaleIdx).toBeLessThan(padIdx);
    expect(padIdx).toBeLessThan(assIdx);
  });

  it('escapes Windows paths in subtitle filter', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      targetWidth: 1080,
      targetHeight: 1920,
      subtitlePath: 'C:\\Users\\test\\captions.ass',
    });
    // Backslashes → forward slashes, then colons get escaped
    // C:\ → C\:/ (colon in drive letter is escaped)
    expect(chain).toContain('ass=C\\:/Users/test/captions.ass');
  });

  it('escapes colons in subtitle path', () => {
    const chain = buildVideoFilterChain({
      startTime: 0,
      duration: 10,
      targetWidth: 1080,
      targetHeight: 1920,
      subtitlePath: 'C:/path/to/file.ass',
    });
    // C: should become C\:
    expect(chain).toContain('C\\:/path/to/file.ass');
  });
});

// ─── Audio Filter Chain ──────────────────────────────────────────────

describe('buildAudioFilterChain', () => {
  it('returns atrim filter for full render', () => {
    const filter = buildAudioFilterChain({ startTime: 5, duration: 20 });
    expect(filter).toBe('atrim=start=5.000:duration=20.000,asetpts=PTS-STARTPTS');
  });

  it('returns null when skipTrim is true', () => {
    const filter = buildAudioFilterChain({ startTime: 5, duration: 20, skipTrim: true });
    expect(filter).toBeNull();
  });
});

// ─── Full Render Args ────────────────────────────────────────────────

describe('buildRenderArgs', () => {
  const baseOptions = {
    inputPath: '/tmp/source.mp4',
    outputPath: '/tmp/output.mp4',
    startTime: 10,
    endTime: 40,
    aspectRatio: '9x16' as AspectRatio,
  };

  it('includes all required encoding parameters', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args).toContain('-c:v');
    expect(args[args.indexOf('-c:v') + 1]).toBe('libx264');
    expect(args).toContain('-c:a');
    expect(args[args.indexOf('-c:a') + 1]).toBe('aac');
    expect(args).toContain('-movflags');
    expect(args[args.indexOf('-movflags') + 1]).toBe('+faststart');
  });

  it('uses default CRF 23', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args).toContain('-crf');
    expect(args[args.indexOf('-crf') + 1]).toBe('23');
  });

  it('respects custom CRF', () => {
    const args = buildRenderArgs({ ...baseOptions, crf: 18 });
    expect(args[args.indexOf('-crf') + 1]).toBe('18');
  });

  it('uses default preset medium', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args).toContain('-preset');
    expect(args[args.indexOf('-preset') + 1]).toBe('medium');
  });

  it('respects custom preset', () => {
    const args = buildRenderArgs({ ...baseOptions, preset: 'ultrafast' });
    expect(args[args.indexOf('-preset') + 1]).toBe('ultrafast');
  });

  it('normalizes to 30fps by default', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args).toContain('-r');
    expect(args[args.indexOf('-r') + 1]).toBe('30');
  });

  it('respects custom fps', () => {
    const args = buildRenderArgs({ ...baseOptions, fps: 24 });
    expect(args[args.indexOf('-r') + 1]).toBe('24');
  });

  it('respects custom audio bitrate', () => {
    const args = buildRenderArgs({ ...baseOptions, audioBitrate: '192k' });
    expect(args[args.indexOf('-b:a') + 1]).toBe('192k');
  });

  it('has -y flag for overwrite', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args[0]).toBe('-y');
  });

  it('includes both -vf and -af filters', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args).toContain('-vf');
    expect(args).toContain('-af');
  });

  it('includes crop in video filter when crop provided', () => {
    const crop: CropRect = { x: 420, y: 0, w: 608, h: 1080 };
    const args = buildRenderArgs({ ...baseOptions, crop });
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).toContain('crop=608:1080:420:0');
  });

  it('includes subtitle in video filter when subtitlePath provided', () => {
    const args = buildRenderArgs({ ...baseOptions, subtitlePath: '/tmp/cap.ass' });
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).toContain('ass=');
  });

  it('output path is last argument', () => {
    const args = buildRenderArgs(baseOptions);
    expect(args[args.length - 1]).toBe('/tmp/output.mp4');
  });
});

// ─── Render From Extracted Args ──────────────────────────────────────

describe('buildRenderFromExtractedArgs', () => {
  const baseOptions = {
    inputPath: '/tmp/extracted.mp4',
    outputPath: '/tmp/output.mp4',
    aspectRatio: '9x16' as AspectRatio,
  };

  it('does not include trim filter', () => {
    const args = buildRenderFromExtractedArgs(baseOptions);
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).not.toContain('trim=');
  });

  it('does not include -af audio filter', () => {
    const args = buildRenderFromExtractedArgs(baseOptions);
    expect(args).not.toContain('-af');
  });

  it('still includes scale and pad', () => {
    const args = buildRenderFromExtractedArgs(baseOptions);
    const vfIdx = args.indexOf('-vf');
    const vf = args[vfIdx + 1];
    expect(vf).toContain('scale=1080:1920');
    expect(vf).toContain('pad=1080:1920');
  });

  it('includes crop when provided', () => {
    const crop: CropRect = { x: 100, y: 0, w: 608, h: 1080 };
    const args = buildRenderFromExtractedArgs({ ...baseOptions, crop });
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).toContain('crop=608:1080:100:0');
  });
});

// ─── Extract Audio Args ──────────────────────────────────────────────

describe('buildExtractAudioArgs', () => {
  it('defaults to WAV 16kHz mono for Whisper', () => {
    const args = buildExtractAudioArgs({
      inputPath: '/tmp/video.mp4',
      outputPath: '/tmp/audio.wav',
    });
    expect(args).toContain('-vn');
    expect(args).toContain('-c:a');
    expect(args[args.indexOf('-c:a') + 1]).toBe('pcm_s16le');
    expect(args).toContain('-ar');
    expect(args[args.indexOf('-ar') + 1]).toBe('16000');
    expect(args).toContain('-ac');
    expect(args[args.indexOf('-ac') + 1]).toBe('1');
  });

  it('uses MP3 codec when format is mp3', () => {
    const args = buildExtractAudioArgs({
      inputPath: '/tmp/video.mp4',
      outputPath: '/tmp/audio.mp3',
      format: 'mp3',
    });
    expect(args[args.indexOf('-c:a') + 1]).toBe('libmp3lame');
    expect(args).toContain('-b:a');
    expect(args[args.indexOf('-b:a') + 1]).toBe('128k');
  });
});

// ─── Path Escaping ───────────────────────────────────────────────────

describe('escapeFfmpegPath', () => {
  it('converts backslashes to forward slashes and escapes drive colon', () => {
    // Order: backslash→forward slash first, then colon escaping
    expect(escapeFfmpegPath('C:\\Users\\test\\file.ass')).toBe('C\\:/Users/test/file.ass');
  });

  it('escapes colons', () => {
    expect(escapeFfmpegPath('C:/path/file.ass')).toBe('C\\:/path/file.ass');
  });

  it('handles mixed Windows path', () => {
    // C:\Users\test:dir\file.ass → C/Users/test:dir/file.ass → C\:/Users/test\:dir/file.ass
    expect(escapeFfmpegPath('C:\\Users\\test:dir\\file.ass'))
      .toBe('C\\:/Users/test\\:dir/file.ass');
  });

  it('returns Unix paths unchanged (except colons)', () => {
    expect(escapeFfmpegPath('/tmp/captions.ass')).toBe('/tmp/captions.ass');
  });

  it('escapes single quotes', () => {
    expect(escapeFfmpegPath("/tmp/it's a file.ass")).toBe("/tmp/it'\\''s a file.ass");
  });
});

// ─── Dimension and Crop (duplicated from render.test.ts for command module) ──

describe('getTargetDimensions (command module)', () => {
  it('9x16 → 1080x1920', () => {
    expect(getTargetDimensions('9x16')).toEqual({ width: 1080, height: 1920 });
  });
  it('1x1 → 1080x1080', () => {
    expect(getTargetDimensions('1x1')).toEqual({ width: 1080, height: 1080 });
  });
  it('16x9 → 1920x1080', () => {
    expect(getTargetDimensions('16x9')).toEqual({ width: 1920, height: 1080 });
  });
});

describe('calculateCropRect (command module)', () => {
  it('crops 1920x1080 to 9:16 with even dimensions', () => {
    const crop = calculateCropRect(1920, 1080, '9x16');
    expect(crop.w % 2).toBe(0);
    expect(crop.h % 2).toBe(0);
    expect(crop.w / crop.h).toBeCloseTo(9 / 16, 1);
  });

  it('16:9 passthrough on 16:9 source', () => {
    const crop = calculateCropRect(1920, 1080, '16x9');
    expect(crop).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it('handles non-standard source dimensions', () => {
    // 4:3 source → 9:16 target
    const crop = calculateCropRect(1440, 1080, '9x16');
    expect(crop.w).toBeLessThanOrEqual(1440);
    expect(crop.h).toBeLessThanOrEqual(1080);
    expect(crop.w % 2).toBe(0);
    expect(crop.h % 2).toBe(0);
  });

  it('clamps face position near edges', () => {
    // Face at bottom-right corner
    const crop = calculateCropRect(1920, 1080, '9x16', 1910, 1070);
    expect(crop.x + crop.w).toBeLessThanOrEqual(1920);
    expect(crop.y + crop.h).toBeLessThanOrEqual(1080);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
  });

  it('clamps face position near origin', () => {
    const crop = calculateCropRect(1920, 1080, '9x16', 5, 5);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });
});

// ─── Preset Combinations ─────────────────────────────────────────────

describe('render presets for all aspect ratios', () => {
  const aspects: AspectRatio[] = ['9x16', '1x1', '16x9'];

  for (const aspect of aspects) {
    it(`generates valid args for ${aspect}`, () => {
      const args = buildRenderArgs({
        inputPath: 'in.mp4',
        outputPath: 'out.mp4',
        startTime: 0,
        endTime: 30,
        aspectRatio: aspect,
      });

      const target = getTargetDimensions(aspect);
      const vfIdx = args.indexOf('-vf');
      const vf = args[vfIdx + 1];

      expect(vf).toContain(`scale=${target.width}:${target.height}`);
      expect(vf).toContain(`pad=${target.width}:${target.height}`);
      expect(args).toContain('-c:v');
      expect(args).toContain('-c:a');
    });
  }

  for (const aspect of aspects) {
    it(`generates valid extracted args for ${aspect}`, () => {
      const args = buildRenderFromExtractedArgs({
        inputPath: 'in.mp4',
        outputPath: 'out.mp4',
        aspectRatio: aspect,
      });

      const target = getTargetDimensions(aspect);
      const vfIdx = args.indexOf('-vf');
      const vf = args[vfIdx + 1];

      expect(vf).toContain(`scale=${target.width}:${target.height}`);
      expect(vf).not.toContain('trim=');
    });
  }
});

// ─── Caption + Crop Combination ──────────────────────────────────────

describe('render with crop + captions combined', () => {
  it('includes both crop and ass filters in correct order', () => {
    const args = buildRenderArgs({
      inputPath: 'in.mp4',
      outputPath: 'out.mp4',
      startTime: 0,
      endTime: 30,
      aspectRatio: '9x16',
      crop: { x: 420, y: 0, w: 608, h: 1080 },
      subtitlePath: '/tmp/captions.ass',
    });

    const vfIdx = args.indexOf('-vf');
    const vf = args[vfIdx + 1];
    const cropPos = vf.indexOf('crop=');
    const assPos = vf.indexOf('ass=');

    expect(cropPos).toBeGreaterThan(-1);
    expect(assPos).toBeGreaterThan(-1);
    expect(cropPos).toBeLessThan(assPos);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles very short clip (0.1s)', () => {
    const args = buildRenderArgs({
      inputPath: 'in.mp4',
      outputPath: 'out.mp4',
      startTime: 10,
      endTime: 10.1,
      aspectRatio: '9x16',
    });
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).toContain('duration=0.100');
  });

  it('handles very long clip (3600s)', () => {
    const args = buildRenderArgs({
      inputPath: 'in.mp4',
      outputPath: 'out.mp4',
      startTime: 0,
      endTime: 3600,
      aspectRatio: '16x9',
    });
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).toContain('duration=3600.000');
  });

  it('handles fractional start/end times', () => {
    const args = buildExtractClipArgs({
      inputPath: 'in.mp4',
      outputPath: 'out.mp4',
      startTime: 10.333,
      endTime: 25.667,
    });
    expect(args[args.indexOf('-ss') + 1]).toBe('10.333');
    expect(args[args.indexOf('-t') + 1]).toBe('15.334');
  });

  it('crop at 0,0 when source matches target aspect', () => {
    const crop = calculateCropRect(1080, 1920, '9x16');
    expect(crop).toEqual({ x: 0, y: 0, w: 1080, h: 1920 });
  });
});
