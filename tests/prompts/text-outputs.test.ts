import { describe, it, expect } from "vitest";
import {
  linkedinPostsResponseSchema,
  xThreadsResponseSchema,
  newsletterSectionsResponseSchema,
  summarySchema,
  chapterMarkersSchema,
  speakerRoleResultSchema,
} from "@/prompts";

describe("LinkedIn post schema", () => {
  it("validates well-formed posts", () => {
    const valid = [
      {
        content: "Most creators burn out because they confuse activity with strategy.\n\nI spent 3 years posting daily...\n\n#content",
        wordCount: 150,
        focusTopic: "content strategy",
        hookLine: "Most creators burn out because they confuse activity with strategy.",
      },
    ];
    expect(() => linkedinPostsResponseSchema.parse(valid)).not.toThrow();
  });

  it("rejects posts with too-short content", () => {
    const invalid = [
      { content: "Short", wordCount: 1, focusTopic: "test", hookLine: "Short hook line" },
    ];
    expect(() => linkedinPostsResponseSchema.parse(invalid)).toThrow();
  });
});

describe("X thread schema", () => {
  it("validates well-formed threads", () => {
    const valid = [
      {
        threadPosts: [
          { postNumber: 1, text: "First post of the thread 1/" },
          { postNumber: 2, text: "Second post with more context 2/" },
          { postNumber: 3, text: "Third post wrapping up 3/3" },
        ],
        postCount: 3,
        wordCount: 50,
        focusTopic: "testing",
      },
    ];
    expect(() => xThreadsResponseSchema.parse(valid)).not.toThrow();
  });

  it("rejects threads with < 3 posts", () => {
    const invalid = [
      {
        threadPosts: [
          { postNumber: 1, text: "Only one post" },
        ],
        postCount: 1,
        wordCount: 5,
        focusTopic: "test",
      },
    ];
    expect(() => xThreadsResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects posts over 280 characters", () => {
    const invalid = [
      {
        threadPosts: [
          { postNumber: 1, text: "a".repeat(281) },
          { postNumber: 2, text: "valid post" },
          { postNumber: 3, text: "valid post" },
        ],
        postCount: 3,
        wordCount: 100,
        focusTopic: "test",
      },
    ];
    expect(() => xThreadsResponseSchema.parse(invalid)).toThrow();
  });
});

describe("Newsletter section schema", () => {
  it("validates well-formed sections", () => {
    const valid = [
      {
        content: "a".repeat(150),
        wordCount: 150,
        sectionTitle: "This Week's Deep Dive",
        focusTopic: "content systems",
      },
    ];
    expect(() => newsletterSectionsResponseSchema.parse(valid)).not.toThrow();
  });
});

describe("Summary schema", () => {
  it("validates well-formed summary", () => {
    const valid = {
      summary: "In this episode, the host and guest explore content strategy and systems thinking. The key takeaway is that consistency comes from systems, not willpower.",
      keyInsights: [
        "Systems beat willpower",
        "Quality over quantity",
      ],
      wordCount: 30,
    };
    expect(() => summarySchema.parse(valid)).not.toThrow();
  });

  it("requires at least 2 key insights", () => {
    const invalid = {
      summary: "A valid summary text that is long enough to pass validation checks.",
      keyInsights: ["Only one"],
      wordCount: 10,
    };
    expect(() => summarySchema.parse(invalid)).toThrow();
  });
});

describe("Chapter markers schema", () => {
  it("validates well-formed chapters", () => {
    const valid = {
      chapters: [
        { timestamp: "0:00", title: "Introduction" },
        { timestamp: "5:30", title: "Main topic" },
        { timestamp: "12:45", title: "Conclusion" },
      ],
    };
    expect(() => chapterMarkersSchema.parse(valid)).not.toThrow();
  });

  it("rejects chapters with invalid timestamp format", () => {
    const invalid = {
      chapters: [
        { timestamp: "abc", title: "Introduction" },
        { timestamp: "5:30", title: "Main" },
        { timestamp: "12:45", title: "End" },
      ],
    };
    expect(() => chapterMarkersSchema.parse(invalid)).toThrow();
  });

  it("requires at least 3 chapters", () => {
    const invalid = {
      chapters: [
        { timestamp: "0:00", title: "Start" },
        { timestamp: "5:00", title: "End" },
      ],
    };
    expect(() => chapterMarkersSchema.parse(invalid)).toThrow();
  });
});

describe("Speaker roles schema", () => {
  it("validates well-formed speaker roles", () => {
    const valid = {
      speakers: [
        { id: "S1", role: "host", confidence: 0.95, reasoning: "Asks questions" },
        { id: "S2", role: "guest", confidence: 0.9, reasoning: "Answers questions" },
      ],
    };
    expect(() => speakerRoleResultSchema.parse(valid)).not.toThrow();
  });

  it("accepts solo role", () => {
    const valid = {
      speakers: [
        { id: "S1", role: "solo", confidence: 1.0, reasoning: "Only speaker" },
      ],
    };
    expect(() => speakerRoleResultSchema.parse(valid)).not.toThrow();
  });
});
