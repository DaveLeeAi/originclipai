import { describe, it, expect } from 'vitest';
import {
  computeCompositeScore,
  getScoreBreakdown,
  rankClips,
  adjustDurationFit,
  adjustSpeakerContinuity,
  expandLegacyScoreFactors,
  validateScoreFactors,
} from '@/lib/intelligence/clip-scorer';
import type { ExpandedScoreFactors } from '@/prompts/schemas/intelligence';
import type { ScoredClipCandidate } from '@/prompts/schemas/intelligence';

const makeFactors = (overrides?: Partial<ExpandedScoreFactors>): ExpandedScoreFactors => ({
  standaloneClarity: 80,
  hookStrength: 85,
  novelty: 70,
  emotionalIntensity: 75,
  shareability: 72,
  ctaPotential: 60,
  speakerContinuity: 90,
  durationFit: 80,
  ...overrides,
});

const makeClip = (score: number, factors?: Partial<ExpandedScoreFactors>): ScoredClipCandidate => ({
  startTime: 10,
  endTime: 50,
  duration: 40,
  title: 'Test clip',
  hook: 'Test hook',
  transcriptExcerpt: 'This is a test clip excerpt that is long enough',
  score,
  scoreFactors: makeFactors(factors),
  primarySpeakerId: 'S1',
  speakersPresent: [{ id: 'S1', talkPct: 100 }],
  topics: ['test'],
  socialCaption: null,
  selectionReason: null,
});

describe('computeCompositeScore', () => {
  it('computes a weighted score between 0 and 100', () => {
    const factors = makeFactors();
    const score = computeCompositeScore(factors);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns 0 for all-zero factors', () => {
    const factors = makeFactors({
      standaloneClarity: 0,
      hookStrength: 0,
      novelty: 0,
      emotionalIntensity: 0,
      shareability: 0,
      ctaPotential: 0,
      speakerContinuity: 0,
      durationFit: 0,
    });
    expect(computeCompositeScore(factors)).toBe(0);
  });

  it('returns 100 for all-100 factors', () => {
    const factors = makeFactors({
      standaloneClarity: 100,
      hookStrength: 100,
      novelty: 100,
      emotionalIntensity: 100,
      shareability: 100,
      ctaPotential: 100,
      speakerContinuity: 100,
      durationFit: 100,
    });
    expect(computeCompositeScore(factors)).toBe(100);
  });

  it('weights hookStrength highest (0.20)', () => {
    const baseline = makeFactors({
      standaloneClarity: 50,
      hookStrength: 50,
      novelty: 50,
      emotionalIntensity: 50,
      shareability: 50,
      ctaPotential: 50,
      speakerContinuity: 50,
      durationFit: 50,
    });
    const boostedHook = { ...baseline, hookStrength: 100 };

    const baseScore = computeCompositeScore(baseline);
    const hookScore = computeCompositeScore(boostedHook);

    // hookStrength boost should add 10 points (50 * 0.20 = 10)
    expect(hookScore - baseScore).toBe(10);
  });
});

describe('getScoreBreakdown', () => {
  it('returns composite score and tier', () => {
    const breakdown = getScoreBreakdown(makeFactors());
    expect(breakdown.composite).toBeGreaterThan(0);
    expect(['exceptional', 'strong', 'good', 'decent', 'weak']).toContain(breakdown.tier);
  });

  it('identifies weak dimensions', () => {
    const factors = makeFactors({ ctaPotential: 30, novelty: 20 });
    const breakdown = getScoreBreakdown(factors);
    expect(breakdown.weakDimensions).toContain('ctaPotential');
    expect(breakdown.weakDimensions).toContain('novelty');
  });

  it('identifies strong dimensions', () => {
    const factors = makeFactors({ hookStrength: 95, speakerContinuity: 90 });
    const breakdown = getScoreBreakdown(factors);
    expect(breakdown.strongDimensions).toContain('hookStrength');
    expect(breakdown.strongDimensions).toContain('speakerContinuity');
  });

  it('assigns correct tier labels', () => {
    expect(getScoreBreakdown(makeFactors({
      standaloneClarity: 100, hookStrength: 100, novelty: 100,
      emotionalIntensity: 100, shareability: 100, ctaPotential: 100,
      speakerContinuity: 100, durationFit: 100,
    })).tier).toBe('exceptional');

    expect(getScoreBreakdown(makeFactors({
      standaloneClarity: 10, hookStrength: 10, novelty: 10,
      emotionalIntensity: 10, shareability: 10, ctaPotential: 10,
      speakerContinuity: 10, durationFit: 10,
    })).tier).toBe('weak');
  });
});

describe('rankClips', () => {
  it('sorts clips by score descending', () => {
    const clips = [makeClip(50), makeClip(90), makeClip(70)];
    const ranked = rankClips(clips);
    expect(ranked[0].score).toBe(90);
    expect(ranked[1].score).toBe(70);
    expect(ranked[2].score).toBe(50);
  });

  it('does not mutate the original array', () => {
    const clips = [makeClip(50), makeClip(90)];
    const ranked = rankClips(clips);
    expect(clips[0].score).toBe(50); // original unchanged
    expect(ranked[0].score).toBe(90);
  });
});

describe('adjustDurationFit', () => {
  it('leaves sweet spot durations unchanged', () => {
    const factors = makeFactors({ durationFit: 80 });
    const adjusted = adjustDurationFit(factors, 60);
    expect(adjusted.durationFit).toBe(80);
  });

  it('penalizes very short clips', () => {
    const factors = makeFactors({ durationFit: 80 });
    const adjusted = adjustDurationFit(factors, 10);
    expect(adjusted.durationFit).toBeLessThanOrEqual(20);
  });

  it('penalizes very long clips', () => {
    const factors = makeFactors({ durationFit: 80 });
    const adjusted = adjustDurationFit(factors, 150);
    expect(adjusted.durationFit).toBeLessThanOrEqual(40);
  });

  it('mildly penalizes slightly long clips', () => {
    const factors = makeFactors({ durationFit: 80 });
    const adjusted = adjustDurationFit(factors, 110);
    expect(adjusted.durationFit).toBeLessThanOrEqual(70);
  });
});

describe('adjustSpeakerContinuity', () => {
  it('boosts solo speaker clips', () => {
    const factors = makeFactors({ speakerContinuity: 60 });
    const adjusted = adjustSpeakerContinuity(factors, [{ id: 'S1', talkPct: 100 }]);
    expect(adjusted.speakerContinuity).toBeGreaterThanOrEqual(90);
  });

  it('boosts dominant speaker clips', () => {
    const factors = makeFactors({ speakerContinuity: 60 });
    const adjusted = adjustSpeakerContinuity(factors, [
      { id: 'S1', talkPct: 85 },
      { id: 'S2', talkPct: 15 },
    ]);
    expect(adjusted.speakerContinuity).toBeGreaterThanOrEqual(80);
  });

  it('penalizes evenly split speaker clips', () => {
    const factors = makeFactors({ speakerContinuity: 80 });
    const adjusted = adjustSpeakerContinuity(factors, [
      { id: 'S1', talkPct: 50 },
      { id: 'S2', talkPct: 50 },
    ]);
    expect(adjusted.speakerContinuity).toBeLessThanOrEqual(55);
  });
});

describe('expandLegacyScoreFactors', () => {
  it('maps 4 legacy dimensions to 8 expanded dimensions', () => {
    const expanded = expandLegacyScoreFactors({
      coherence: 90,
      hookStrength: 85,
      topicClarity: 80,
      emotionalEnergy: 75,
    });

    expect(expanded.standaloneClarity).toBe(90); // from coherence
    expect(expanded.hookStrength).toBe(85);
    expect(expanded.emotionalIntensity).toBe(75); // from emotionalEnergy
    expect(expanded.novelty).toBe(78); // avg(topicClarity, emotionalEnergy)
    expect(expanded.shareability).toBe(80); // avg(hookStrength, emotionalEnergy)
    expect(expanded.ctaPotential).toBe(59); // Math.round(85 * 0.7) = 59.5 → 59
    expect(expanded.speakerContinuity).toBe(75); // default
    expect(expanded.durationFit).toBe(75); // default
  });
});

describe('validateScoreFactors', () => {
  it('validates correct factors', () => {
    const factors = makeFactors();
    expect(() => validateScoreFactors(factors)).not.toThrow();
  });

  it('rejects out-of-range values', () => {
    expect(() => validateScoreFactors({ ...makeFactors(), hookStrength: 150 })).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => validateScoreFactors({ hookStrength: 50 })).toThrow();
  });
});
