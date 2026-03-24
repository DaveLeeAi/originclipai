import { describe, it, expect } from 'vitest';
import {
  expandedScoreFactorsSchema,
  keyInsightsResponseSchema,
  notableQuotesResponseSchema,
  hookTitleResponseSchema,
  scoredClipCandidateSchema,
  SCORE_WEIGHTS,
} from '@/prompts/schemas/intelligence';

describe('expandedScoreFactorsSchema', () => {
  it('validates all 8 dimensions', () => {
    const valid = {
      standaloneClarity: 80,
      hookStrength: 85,
      novelty: 70,
      emotionalIntensity: 75,
      shareability: 72,
      ctaPotential: 60,
      speakerContinuity: 90,
      durationFit: 80,
    };
    expect(() => expandedScoreFactorsSchema.parse(valid)).not.toThrow();
  });

  it('rejects values outside 0-100', () => {
    const invalid = {
      standaloneClarity: 110,
      hookStrength: 85,
      novelty: 70,
      emotionalIntensity: 75,
      shareability: 72,
      ctaPotential: 60,
      speakerContinuity: 90,
      durationFit: 80,
    };
    expect(() => expandedScoreFactorsSchema.parse(invalid)).toThrow();
  });

  it('rejects negative values', () => {
    const invalid = {
      standaloneClarity: -5,
      hookStrength: 85,
      novelty: 70,
      emotionalIntensity: 75,
      shareability: 72,
      ctaPotential: 60,
      speakerContinuity: 90,
      durationFit: 80,
    };
    expect(() => expandedScoreFactorsSchema.parse(invalid)).toThrow();
  });

  it('rejects non-integer values', () => {
    const invalid = {
      standaloneClarity: 80.5,
      hookStrength: 85,
      novelty: 70,
      emotionalIntensity: 75,
      shareability: 72,
      ctaPotential: 60,
      speakerContinuity: 90,
      durationFit: 80,
    };
    expect(() => expandedScoreFactorsSchema.parse(invalid)).toThrow();
  });
});

describe('SCORE_WEIGHTS', () => {
  it('weights sum to 1.0', () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it('has exactly 8 weights matching the schema', () => {
    expect(Object.keys(SCORE_WEIGHTS)).toHaveLength(8);
  });
});

describe('keyInsightsResponseSchema', () => {
  it('validates well-formed insights', () => {
    const valid = {
      insights: [
        {
          insight: 'Systems beat willpower for consistent output over time.',
          significance: 'Most creators rely on motivation which is unreliable.',
          speakerId: 'S2',
          approximateTimestamp: 240,
          tags: ['productivity', 'systems'],
          confidence: 0.9,
        },
      ],
      topicSummary: 'A discussion about building sustainable creative systems.',
    };
    expect(() => keyInsightsResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty insights array', () => {
    const invalid = { insights: [], topicSummary: 'Something' };
    expect(() => keyInsightsResponseSchema.parse(invalid)).toThrow();
  });

  it('accepts insights without speaker info', () => {
    const valid = {
      insights: [
        {
          insight: 'An insight from an article without speakers present.',
          significance: 'Applies to text-only content sources.',
          speakerId: null,
          approximateTimestamp: null,
          tags: ['general'],
          confidence: 0.8,
        },
      ],
      topicSummary: 'Article summary.',
    };
    expect(() => keyInsightsResponseSchema.parse(valid)).not.toThrow();
  });
});

describe('notableQuotesResponseSchema', () => {
  it('validates well-formed quotes', () => {
    const valid = {
      quotes: [
        {
          quote: 'The best marketing is a product that speaks for itself.',
          speakerId: 'S2',
          speakerLabel: 'Guest',
          approximateTimestamp: 350,
          context: 'Discussing organic growth strategies.',
          impact: 'insightful',
          socialReady: true,
        },
      ],
    };
    expect(() => notableQuotesResponseSchema.parse(valid)).not.toThrow();
  });

  it('validates all impact types', () => {
    const impacts = ['provocative', 'insightful', 'humorous', 'vulnerable', 'contrarian', 'motivational', 'practical'];
    for (const impact of impacts) {
      const valid = {
        quotes: [
          {
            quote: 'A sufficiently long quote for validation purposes here.',
            speakerId: 'S1',
            context: 'Some context here.',
            impact,
            socialReady: false,
          },
        ],
      };
      expect(() => notableQuotesResponseSchema.parse(valid)).not.toThrow();
    }
  });

  it('rejects invalid impact types', () => {
    const invalid = {
      quotes: [
        {
          quote: 'A sufficiently long quote for validation purposes here.',
          speakerId: 'S1',
          context: 'Some context.',
          impact: 'boring', // not a valid impact
          socialReady: false,
        },
      ],
    };
    expect(() => notableQuotesResponseSchema.parse(invalid)).toThrow();
  });
});

describe('hookTitleResponseSchema', () => {
  it('validates well-formed hook/title pairs', () => {
    const valid = {
      options: [
        {
          title: 'Why Most Creators Fail at Consistency',
          hook: 'Here is what nobody tells you about building a daily habit...',
          hookType: 'bold_claim',
          scrollStopScore: 85,
        },
      ],
    };
    expect(() => hookTitleResponseSchema.parse(valid)).not.toThrow();
  });

  it('validates all hook types', () => {
    const types = ['question', 'bold_claim', 'surprising_fact', 'story_opener', 'contrarian', 'teaser', 'confession'];
    for (const hookType of types) {
      const valid = {
        options: [
          {
            title: 'Valid Title Here',
            hook: 'Valid hook line that is long enough.',
            hookType,
            scrollStopScore: 70,
          },
        ],
      };
      expect(() => hookTitleResponseSchema.parse(valid)).not.toThrow();
    }
  });

  it('rejects empty options', () => {
    expect(() => hookTitleResponseSchema.parse({ options: [] })).toThrow();
  });
});

describe('scoredClipCandidateSchema', () => {
  it('validates a full scored clip', () => {
    const valid = {
      startTime: 10,
      endTime: 55,
      duration: 45,
      title: 'Why systems beat discipline',
      hook: 'Nobody tells you this...',
      transcriptExcerpt: 'Here is what nobody tells you about consistency and systems...',
      score: 88,
      scoreFactors: {
        standaloneClarity: 90,
        hookStrength: 85,
        novelty: 80,
        emotionalIntensity: 82,
        shareability: 78,
        ctaPotential: 65,
        speakerContinuity: 95,
        durationFit: 90,
      },
      primarySpeakerId: 'S2',
      speakersPresent: [{ id: 'S2', talkPct: 100 }],
      topics: ['systems', 'consistency'],
      socialCaption: 'Stop relying on motivation.',
      selectionReason: 'Strong guest insight with clean hook.',
    };
    expect(() => scoredClipCandidateSchema.parse(valid)).not.toThrow();
  });

  it('rejects duration outside 10-180 range', () => {
    const invalid = {
      startTime: 0,
      endTime: 5,
      duration: 5, // too short
      title: 'Too short',
      transcriptExcerpt: 'Not long enough for a clip really but still valid text here.',
      score: 50,
      scoreFactors: {
        standaloneClarity: 50, hookStrength: 50, novelty: 50,
        emotionalIntensity: 50, shareability: 50, ctaPotential: 50,
        speakerContinuity: 50, durationFit: 50,
      },
      primarySpeakerId: 'S1',
      speakersPresent: [{ id: 'S1', talkPct: 100 }],
      topics: [],
    };
    expect(() => scoredClipCandidateSchema.parse(invalid)).toThrow();
  });
});
