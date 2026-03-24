// src/workers/render/captions.ts

/**
 * Generates ASS (Advanced SubStation Alpha) subtitle files for caption overlay.
 * Supports multiple caption styles with word-level highlighting and speaker colors.
 */

export interface WordTimestamp {
  word: string;
  start: number; // seconds relative to clip start
  end: number;
  speakerId?: string;
}

export interface CaptionStyle {
  name: string;
  fontName: string;
  fontSize: number;
  primaryColor: string;    // ASS color format: &HAABBGGRR
  highlightColor: string;  // Color for the currently spoken word
  outlineColor: string;
  backColor: string;
  alignment: number;       // ASS alignment: 2=bottom-center, 8=top-center, 5=center
  marginV: number;         // Vertical margin from edge
  outline: number;
  shadow: number;
  bold: boolean;
}

export interface SpeakerColor {
  speakerId: string;
  color: string; // ASS color format
}

// ============================================================
// PREDEFINED STYLES
// ============================================================

export const CAPTION_STYLES: Record<string, CaptionStyle> = {
  karaoke: {
    name: 'Karaoke',
    fontName: 'Arial Bold',
    fontSize: 52,
    primaryColor: '&H00FFFFFF',       // White
    highlightColor: '&H004646E5',     // Indigo (BGR format)
    outlineColor: '&H00000000',       // Black
    backColor: '&H80000000',          // Semi-transparent black
    alignment: 2,                      // Bottom-center
    marginV: 80,
    outline: 3,
    shadow: 0,
    bold: true,
  },

  boxed: {
    name: 'Boxed',
    fontName: 'Arial',
    fontSize: 44,
    primaryColor: '&H00FFFFFF',
    highlightColor: '&H004646E5',
    outlineColor: '&H00000000',
    backColor: '&HC0000000',          // More opaque background
    alignment: 2,
    marginV: 60,
    outline: 0,
    shadow: 0,
    bold: true,
  },

  minimal: {
    name: 'Minimal',
    fontName: 'Arial',
    fontSize: 40,
    primaryColor: '&H00FFFFFF',
    highlightColor: '&H0000D4FF',     // Amber/gold (BGR)
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    alignment: 8,                      // Top-center
    marginV: 120,
    outline: 2,
    shadow: 1,
    bold: false,
  },

  impact: {
    name: 'Impact',
    fontName: 'Impact',
    fontSize: 58,
    primaryColor: '&H00FFFFFF',
    highlightColor: '&H000000FF',     // Red (BGR)
    outlineColor: '&H00000000',
    backColor: '&H00000000',
    alignment: 2,
    marginV: 100,
    outline: 4,
    shadow: 2,
    bold: false,
  },

  subtitle: {
    name: 'Subtitle',
    fontName: 'Arial',
    fontSize: 36,
    primaryColor: '&H00FFFFFF',
    highlightColor: '&H00FFFFFF',     // No highlight (same as primary)
    outlineColor: '&H00000000',
    backColor: '&H80000000',
    alignment: 2,
    marginV: 40,
    outline: 1,
    shadow: 0,
    bold: false,
  },
};

// ============================================================
// ASS FILE GENERATION
// ============================================================

/**
 * Generate a complete ASS subtitle file from word timestamps.
 *
 * @param words - Word-level timestamps relative to clip start (0-based)
 * @param styleName - Key from CAPTION_STYLES
 * @param targetWidth - Video width (for positioning calculations)
 * @param targetHeight - Video height
 * @param speakerColors - Optional speaker-specific colors
 */
export function generateAssFile(
  words: WordTimestamp[],
  styleName: string,
  targetWidth: number,
  targetHeight: number,
  speakerColors?: SpeakerColor[],
): string {
  const style = CAPTION_STYLES[styleName] ?? CAPTION_STYLES.karaoke;

  // Group words into display lines (max ~5 words per line for readability)
  const lines = groupWordsIntoLines(words, 5);

  const header = buildAssHeader(style, targetWidth, targetHeight);
  const events = lines.map((line) =>
    buildKaraokeEvent(line, style, speakerColors)
  ).join('\n');

  return `${header}\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events}\n`;
}

/**
 * Generate a simple subtitle file (no word-level highlighting).
 * Used for the 'subtitle' style or when word timestamps aren't available.
 */
export function generateSimpleAssFile(
  segments: Array<{ text: string; start: number; end: number; speakerId?: string }>,
  styleName: string,
  targetWidth: number,
  targetHeight: number,
): string {
  const style = CAPTION_STYLES[styleName] ?? CAPTION_STYLES.subtitle;

  const header = buildAssHeader(style, targetWidth, targetHeight);
  const events = segments.map((seg) => {
    const start = formatAssTime(seg.start);
    const end = formatAssTime(seg.end);
    const text = escapeAssText(seg.text);
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  }).join('\n');

  return `${header}\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events}\n`;
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function buildAssHeader(style: CaptionStyle, width: number, height: number): string {
  const boldFlag = style.bold ? -1 : 0;

  return `[Script Info]
Title: OriginClipAI Captions
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontName},${style.fontSize},${style.primaryColor},${style.highlightColor},${style.outlineColor},${style.backColor},${boldFlag},0,0,0,100,100,0,0,${style.backColor !== '&H00000000' ? 3 : 1},${style.outline},${style.shadow},${style.alignment},20,20,${style.marginV},1
Style: Highlight,${style.fontName},${style.fontSize},${style.highlightColor},${style.primaryColor},${style.outlineColor},${style.backColor},${boldFlag},0,0,0,100,100,0,0,${style.backColor !== '&H00000000' ? 3 : 1},${style.outline},${style.shadow},${style.alignment},20,20,${style.marginV},1`;
}

/**
 * Group consecutive words into display lines.
 * Each line shows ~maxWordsPerLine words at a time.
 */
function groupWordsIntoLines(
  words: WordTimestamp[],
  maxWordsPerLine: number,
): WordTimestamp[][] {
  const lines: WordTimestamp[][] = [];
  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    lines.push(words.slice(i, i + maxWordsPerLine));
  }
  return lines;
}

/**
 * Build a karaoke-style dialogue event where each word highlights in sequence.
 * Uses ASS override tags for word-level color changes.
 */
function buildKaraokeEvent(
  lineWords: WordTimestamp[],
  style: CaptionStyle,
  speakerColors?: SpeakerColor[],
): string {
  if (lineWords.length === 0) return '';

  const lineStart = lineWords[0].start;
  const lineEnd = lineWords[lineWords.length - 1].end;

  const start = formatAssTime(lineStart);
  const end = formatAssTime(lineEnd);

  // Build karaoke text with \k tags for word-level timing
  // \kf = smooth fill karaoke effect
  const textParts = lineWords.map((word, i) => {
    const wordDurationCs = Math.round((word.end - word.start) * 100); // centiseconds
    const gapCs = i > 0
      ? Math.max(0, Math.round((word.start - lineWords[i - 1].end) * 100))
      : 0;

    // Add gap before word if there's a pause
    const gap = gapCs > 0 ? `{\\k${gapCs}} ` : (i > 0 ? ' ' : '');

    // Speaker-specific color override
    let colorTag = '';
    if (speakerColors && word.speakerId) {
      const sc = speakerColors.find(c => c.speakerId === word.speakerId);
      if (sc) {
        colorTag = `{\\1c${sc.color}}`;
      }
    }

    return `${gap}${colorTag}{\\kf${wordDurationCs}}${escapeAssText(word.word)}`;
  });

  return `Dialogue: 0,${start},${end},Default,,0,0,0,,${textParts.join('')}`;
}

/**
 * Format seconds to ASS timestamp: H:MM:SS.CC
 */
function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);

  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Escape special ASS characters in text.
 */
function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\N');
}

// ============================================================
// SRT/VTT EXPORT
// ============================================================

/**
 * Generate SRT subtitle file from word timestamps grouped into segments.
 */
export function generateSrt(
  segments: Array<{ text: string; start: number; end: number }>,
): string {
  return segments.map((seg, i) => {
    const start = formatSrtTime(seg.start);
    const end = formatSrtTime(seg.end);
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
  }).join('\n');
}

/**
 * Generate VTT subtitle file from word timestamps grouped into segments.
 */
export function generateVtt(
  segments: Array<{ text: string; start: number; end: number }>,
): string {
  const cues = segments.map((seg) => {
    const start = formatVttTime(seg.start);
    const end = formatVttTime(seg.end);
    return `${start} --> ${end}\n${seg.text}`;
  }).join('\n\n');

  return `WEBVTT\n\n${cues}\n`;
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
