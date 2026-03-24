// src/lib/fixtures/demo-job.ts
//
// Realistic fixture data for a fully completed demo job.
// Used by: mock providers, seed-demo script, and tests.
// Content simulates a ~12min podcast interview about content creation.

import type {
  TranscriptSegment,
  Speaker,
  WordTimestamp,
  ClipCandidate,
  ScoreFactors,
} from "@/types";

// ─── Source Metadata ────────────────────────────────────────────────

export const DEMO_SOURCE = {
  title: "The Art of Content Repurposing — Interview with Sarah Chen",
  url: "https://www.youtube.com/watch?v=demo_fixture_id",
  durationSeconds: 724,
  description:
    "In this episode, we sit down with Sarah Chen, a solo creator who grew from 500 to 50,000 followers by repurposing one weekly video into 15 platform-native posts.",
  thumbnail: "https://img.youtube.com/vi/demo_fixture_id/maxresdefault.jpg",
  author: "OriginClipAI Demo",
};

// ─── Speakers ───────────────────────────────────────────────────────

export const DEMO_SPEAKERS: Speaker[] = [
  {
    id: "speaker_0",
    label: "Speaker A",
    role: "host",
    talkTimePct: 35,
    talkTimeSeconds: 253,
  },
  {
    id: "speaker_1",
    label: "Speaker B",
    role: "guest",
    talkTimePct: 65,
    talkTimeSeconds: 471,
  },
];

// ─── Transcript Segments ────────────────────────────────────────────

export const DEMO_SEGMENTS: TranscriptSegment[] = [
  { start: 0.0, end: 8.5, text: "Welcome back to the show. Today I'm really excited because we have Sarah Chen joining us. Sarah, you've built an incredible following by repurposing content. Tell us how it started.", speakerId: "speaker_0", confidence: 0.95 },
  { start: 9.0, end: 22.3, text: "Thanks for having me. Honestly, it started from a place of frustration. I was spending 20 hours a week creating content for each platform separately. YouTube, LinkedIn, Twitter, TikTok — each one felt like a full-time job.", speakerId: "speaker_1", confidence: 0.94 },
  { start: 22.8, end: 35.1, text: "And the crazy thing is, I was saying the same things across all of them, just in different formats. One day I thought, why am I recreating the wheel every single time? That was the turning point.", speakerId: "speaker_1", confidence: 0.93 },
  { start: 35.5, end: 45.2, text: "So you went from creating unique content for each platform to a repurposing-first workflow. Walk us through what that actually looks like week to week.", speakerId: "speaker_0", confidence: 0.96 },
  { start: 45.8, end: 62.0, text: "Sure. Every Monday I record one long-form video, usually 15 to 20 minutes. That's my anchor content. From that single video I extract 3 to 5 short clips for TikTok and Reels, 2 LinkedIn posts, an X thread, and a newsletter section. Everything comes from that one video.", speakerId: "speaker_1", confidence: 0.95 },
  { start: 62.5, end: 78.3, text: "The key insight that changed everything for me was realizing that repurposing isn't about copying and pasting. It's about translating. Each platform has its own language, its own rhythm. A great YouTube moment might make a terrible TikTok if you just chop it up blindly.", speakerId: "speaker_1", confidence: 0.97 },
  { start: 79.0, end: 88.5, text: "That's a really important distinction. Can you give us a concrete example of what that translation looks like?", speakerId: "speaker_0", confidence: 0.94 },
  { start: 89.0, end: 112.4, text: "Absolutely. Say I have a 3-minute segment in my YouTube video where I'm explaining a framework. For TikTok, I need to hook people in the first second, so I'll pull the most surprising insight from that segment and lead with it. For LinkedIn, I'll turn the framework into a numbered list with a personal story at the top. Same ideas, completely different delivery.", speakerId: "speaker_1", confidence: 0.96 },
  { start: 113.0, end: 125.8, text: "What about the time savings? Before you mentioned 20 hours a week. Where are you now?", speakerId: "speaker_0", confidence: 0.95 },
  { start: 126.2, end: 145.6, text: "I'm down to about 5 hours total. One hour to record, one hour to review and approve the clips and text outputs, and maybe 3 hours for light editing and scheduling. The biggest time save was automating the clip detection. I used to watch my own videos back looking for quotable moments — now AI handles that initial scan.", speakerId: "speaker_1", confidence: 0.94 },
  { start: 146.0, end: 160.3, text: "And the quality didn't drop. If anything, it went up because I'm spending my energy on the creative decisions — which clips to approve, how to tweak the captions — rather than the mechanical work of cutting and formatting.", speakerId: "speaker_1", confidence: 0.93 },
  { start: 161.0, end: 175.5, text: "Let's talk about the results. You went from 500 followers to 50,000 in about a year. What was the growth trajectory like?", speakerId: "speaker_0", confidence: 0.95 },
  { start: 176.0, end: 198.2, text: "The first three months were slow. I was still figuring out what worked. But around month four, one of my repurposed clips went semi-viral on TikTok — about 200,000 views. That clip was literally a 45-second segment from a YouTube video that had only gotten 300 views. Same content, different platform, completely different result.", speakerId: "speaker_1", confidence: 0.96 },
  { start: 199.0, end: 215.8, text: "That experience taught me something crucial: your best content already exists. You don't need to create more — you need to distribute better. Most creators are sitting on a goldmine of content that's only been seen by a fraction of their potential audience.", speakerId: "speaker_1", confidence: 0.97 },
  { start: 216.5, end: 230.0, text: "That's a powerful insight. For someone just starting with repurposing, what would you say is the number one mistake to avoid?", speakerId: "speaker_0", confidence: 0.94 },
  { start: 230.5, end: 252.3, text: "Trying to be everywhere at once. Pick two platforms maximum when you're starting. Master the translation between your anchor content and those two platforms. Get really good at that before adding a third. I see so many creators burn out because they're trying to maintain six platforms from day one.", speakerId: "speaker_1", confidence: 0.95 },
  { start: 253.0, end: 268.4, text: "The other mistake is not having a review step. Automated tools are amazing for the first pass, but you need human judgment for the final cut. What makes a clip resonate isn't just the words — it's the energy, the timing, the authenticity. Always review before you publish.", speakerId: "speaker_1", confidence: 0.96 },
  { start: 269.0, end: 285.1, text: "Speaking of authenticity, how do you maintain your voice across all these platforms? Doesn't the automation risk making everything feel generic?", speakerId: "speaker_0", confidence: 0.95 },
  { start: 285.5, end: 305.8, text: "Great question. The anchor content is where your voice lives. If your long-form video is authentically you, then the repurposed pieces carry that DNA. The automation handles the formatting and the cutting — it doesn't rewrite your words or change your personality. Think of it like a photographer who shoots in RAW and then crops for different frame sizes. The photo is still theirs.", speakerId: "speaker_1", confidence: 0.97 },
  { start: 306.5, end: 320.0, text: "I love that analogy. Let's wrap up with some rapid-fire advice. What's the one tool, besides OriginClip, that every solo creator needs?", speakerId: "speaker_0", confidence: 0.93 },
  { start: 320.5, end: 338.2, text: "A scheduling tool. Doesn't matter which one. The ability to batch-schedule a week's worth of content in one sitting is a game changer. It separates the creative work from the publishing work, and that separation is what prevents burnout.", speakerId: "speaker_1", confidence: 0.95 },
  { start: 339.0, end: 350.0, text: "Sarah, this has been incredible. Thank you for sharing your workflow and your results. For everyone listening, the links to Sarah's content are in the show notes. Until next time.", speakerId: "speaker_0", confidence: 0.94 },
  { start: 350.5, end: 358.0, text: "Thanks for having me. And remember — create once, distribute everywhere. That's the mantra.", speakerId: "speaker_1", confidence: 0.96 },
];

// ─── Word Timestamps (simplified — first ~60 words for caption testing) ──

export const DEMO_WORD_TIMESTAMPS: WordTimestamp[] = buildWordTimestamps(DEMO_SEGMENTS);

function buildWordTimestamps(segments: TranscriptSegment[]): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  for (const seg of segments) {
    const segWords = seg.text.split(/\s+/);
    const segDuration = seg.end - seg.start;
    const wordDuration = segDuration / segWords.length;
    for (let i = 0; i < segWords.length; i++) {
      words.push({
        word: segWords[i],
        start: parseFloat((seg.start + i * wordDuration).toFixed(2)),
        end: parseFloat((seg.start + (i + 1) * wordDuration).toFixed(2)),
        speakerId: seg.speakerId,
      });
    }
  }
  return words;
}

// ─── Full Transcript Text ───────────────────────────────────────────

export const DEMO_FULL_TEXT: string = DEMO_SEGMENTS.map((s) => s.text).join(" ");

// ─── Clip Candidates ───────────────────────────────────────────────

export const DEMO_CLIPS: ClipCandidate[] = [
  {
    startTime: 62.5,
    endTime: 112.4,
    title: "Repurposing Is Translation, Not Copy-Paste",
    hook: "The key insight that changed everything: repurposing isn't about copying — it's about translating.",
    transcriptExcerpt: "The key insight that changed everything for me was realizing that repurposing isn't about copying and pasting. It's about translating. Each platform has its own language, its own rhythm...",
    score: 94,
    scoreFactors: { coherence: 95, hookStrength: 96, topicClarity: 92, emotionalEnergy: 90 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 85 }, { id: "speaker_0", talkPct: 15 }],
    socialCaption: "Repurposing isn't copy-paste. It's translation. Each platform speaks its own language. 🎯",
    hashtags: ["contentcreation", "repurposing", "creatoreconomy"],
  },
  {
    startTime: 176.0,
    endTime: 215.8,
    title: "Your Best Content Already Exists",
    hook: "A 45-second clip from a video with 300 views got 200,000 on TikTok. Same content, different platform.",
    transcriptExcerpt: "One of my repurposed clips went semi-viral on TikTok — about 200,000 views. That clip was literally a 45-second segment from a YouTube video that had only gotten 300 views...",
    score: 92,
    scoreFactors: { coherence: 90, hookStrength: 95, topicClarity: 90, emotionalEnergy: 93 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 100 }],
    socialCaption: "300 views on YouTube. 200,000 on TikTok. Same content. Your best stuff already exists — you just need to distribute it better.",
    hashtags: ["contentrepurposing", "tiktokgrowth", "creatortips"],
  },
  {
    startTime: 126.2,
    endTime: 160.3,
    title: "From 20 Hours to 5 Hours a Week",
    hook: "I went from 20 hours of content creation down to 5. Here's exactly how the time breaks down.",
    transcriptExcerpt: "I'm down to about 5 hours total. One hour to record, one hour to review and approve the clips and text outputs, and maybe 3 hours for light editing and scheduling...",
    score: 89,
    scoreFactors: { coherence: 92, hookStrength: 88, topicClarity: 91, emotionalEnergy: 85 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 90 }, { id: "speaker_0", talkPct: 10 }],
    socialCaption: "20 hours → 5 hours. That's the power of a repurposing-first workflow. The secret? Automate the mechanical, keep the creative.",
    hashtags: ["productivity", "contentworkflow", "solocreator"],
  },
  {
    startTime: 230.5,
    endTime: 268.4,
    title: "The #1 Mistake New Creators Make",
    hook: "Stop trying to be on six platforms at once. Pick two. Master the translation. Then expand.",
    transcriptExcerpt: "Trying to be everywhere at once. Pick two platforms maximum when you're starting. Master the translation between your anchor content and those two platforms...",
    score: 88,
    scoreFactors: { coherence: 90, hookStrength: 90, topicClarity: 87, emotionalEnergy: 84 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 100 }],
    socialCaption: "The #1 repurposing mistake? Trying to be everywhere at once. Start with 2 platforms. Master those. Then expand.",
    hashtags: ["creatoradvice", "contentmarketing", "platformstrategy"],
  },
  {
    startTime: 285.5,
    endTime: 320.0,
    title: "Your Voice Lives in the Anchor Content",
    hook: "Automation doesn't kill authenticity. Think of it like a photographer cropping for different frames.",
    transcriptExcerpt: "The anchor content is where your voice lives. If your long-form video is authentically you, then the repurposed pieces carry that DNA...",
    score: 86,
    scoreFactors: { coherence: 88, hookStrength: 85, topicClarity: 86, emotionalEnergy: 85 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 80 }, { id: "speaker_0", talkPct: 20 }],
    socialCaption: "Does automation kill authenticity? No. Your voice lives in the anchor content. Think of it like cropping a photo — the image is still yours.",
    hashtags: ["authenticity", "contentcreation", "creatortools"],
  },
  {
    startTime: 45.8,
    endTime: 78.3,
    title: "The One-Video-to-15-Posts Workflow",
    hook: "Every Monday: one 15-minute video. By Friday: 5 clips, 2 LinkedIn posts, an X thread, and a newsletter.",
    transcriptExcerpt: "Every Monday I record one long-form video, usually 15 to 20 minutes. That's my anchor content. From that single video I extract 3 to 5 short clips...",
    score: 85,
    scoreFactors: { coherence: 87, hookStrength: 86, topicClarity: 88, emotionalEnergy: 80 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 100 }],
    socialCaption: "1 video → 15 pieces of content. Here's the exact weekly workflow that took me from 500 to 50,000 followers.",
    hashtags: ["contentworkflow", "repurposing", "solocreator"],
  },
  {
    startTime: 320.5,
    endTime: 358.0,
    title: "Batch Scheduling Prevents Burnout",
    hook: "The one tool every creator needs: a scheduling tool. Separate the creative work from the publishing work.",
    transcriptExcerpt: "A scheduling tool. Doesn't matter which one. The ability to batch-schedule a week's worth of content in one sitting is a game changer...",
    score: 82,
    scoreFactors: { coherence: 85, hookStrength: 80, topicClarity: 84, emotionalEnergy: 78 },
    primarySpeakerId: "speaker_1",
    speakerRole: "guest",
    speakersPresent: [{ id: "speaker_1", talkPct: 70 }, { id: "speaker_0", talkPct: 30 }],
    socialCaption: "The one tool every solo creator needs (besides OriginClip): a scheduling tool. Separate creative work from publishing. That's the burnout fix.",
    hashtags: ["creatortools", "scheduling", "burnoutprevention"],
  },
];

// ─── Text Outputs (pre-generated) ──────────────────────────────────

export const DEMO_SUMMARY = `Sarah Chen shares her journey from spending 20 hours per week creating platform-specific content to just 5 hours using a repurposing-first workflow. Her key insight: repurposing isn't copy-pasting — it's translation. Each platform has its own language and rhythm. Starting with one anchor video per week, she extracts clips, LinkedIn posts, X threads, and newsletter sections. The approach took her from 500 to 50,000 followers in a year, with one repurposed TikTok clip hitting 200K views from a YouTube video that had only 300.

Key Insights:
- Create once, distribute everywhere — your best content already exists
- Repurposing is translation, not duplication
- Automate the mechanical work, keep creative judgment human
- Start with 2 platforms max, master the translation before expanding
- Batch scheduling separates creative work from publishing, preventing burnout`;

export const DEMO_LINKEDIN_POSTS = [
  {
    label: "LinkedIn Post 1: The Translation Framework",
    content: `I used to spend 20 hours/week creating content for each platform separately.\n\nNow it's 5 hours. Same (actually better) results.\n\nThe shift? I stopped treating repurposing as copy-paste.\n\nRepurposing is TRANSLATION.\n\nA 3-minute YouTube segment becomes:\n→ A hook-first 45s TikTok\n→ A numbered framework on LinkedIn\n→ A thread opener on X\n\nSame ideas. Completely different delivery.\n\nEach platform speaks its own language. When you learn to translate instead of duplicate, everything changes.\n\nWhat's your anchor content format? Drop it below 👇`,
    wordCount: 86,
  },
  {
    label: "LinkedIn Post 2: The 300-to-200K Story",
    content: `A YouTube video with 300 views.\nA TikTok clip from that same video: 200,000 views.\n\nSame content. Different platform. Completely different result.\n\nThis taught me the most important lesson of my creator journey:\n\nYour best content ALREADY exists.\n\nYou don't need to create more.\nYou need to distribute better.\n\nMost creators are sitting on a goldmine of content that's only been seen by a fraction of their potential audience.\n\nStop creating. Start distributing.`,
    wordCount: 78,
  },
  {
    label: "LinkedIn Post 3: The Burnout Fix",
    content: `The #1 mistake I see creators make with repurposing:\n\nTrying to be on 6 platforms from day one.\n\nHere's what actually works:\n\n1. Pick TWO platforms (that's it)\n2. Master the translation from your anchor content\n3. Get really good at those two\n4. Then — and only then — add a third\n\nThe other thing: always have a human review step.\n\nAI is amazing for the first pass. But what makes a clip resonate isn't just the words — it's the energy, the timing, the authenticity.\n\nAutomate the mechanical. Keep the creative.`,
    wordCount: 95,
  },
];

export const DEMO_X_THREADS = [
  {
    label: "X Thread 1: The Repurposing Playbook",
    focusTopic: "Content Repurposing Playbook",
    posts: [
      { postNumber: 1, text: "I went from 500 → 50,000 followers in a year.\n\nNot by creating more content.\nBy distributing the same content better.\n\nHere's my exact repurposing playbook 🧵" },
      { postNumber: 2, text: "Step 1: Record ONE long-form video per week (15-20 min)\n\nThat's your anchor content. Everything else flows from this.\n\nOne input. Fifteen outputs." },
      { postNumber: 3, text: "Step 2: Extract, don't duplicate.\n\nFrom one video I get:\n• 3-5 short clips (TikTok/Reels)\n• 2 LinkedIn posts\n• 1 X thread\n• 1 newsletter section\n\nTotal time: 5 hours/week (down from 20)" },
      { postNumber: 4, text: "The key insight most people miss:\n\nRepurposing ≠ copy-paste\nRepurposing = translation\n\nA great YouTube moment might be terrible on TikTok if you just chop it.\n\nEach platform has its own language. Learn it." },
      { postNumber: 5, text: "The proof:\n\n• YouTube video: 300 views\n• 45-second clip from that video on TikTok: 200,000 views\n\nYour best content already exists.\nYou just need to put it where people can find it." },
      { postNumber: 6, text: "One more thing: always keep a human review step.\n\nAI handles the first pass.\nYou make the creative decisions.\n\nAutomate the mechanical. Keep the authentic.\n\nCreate once, distribute everywhere. That's the mantra." },
    ],
    wordCount: 195,
  },
];

export const DEMO_NEWSLETTER_SECTIONS = [
  {
    label: "Newsletter: The Translation Framework",
    content: `## The Content Translation Framework\n\nMost creators think repurposing means taking a long video and chopping it into shorter pieces. That's not repurposing — that's just cutting.\n\nReal repurposing is *translation*. Each platform has its own language, its own rhythm, its own expectations. A 3-minute YouTube segment explaining a framework becomes a hook-first 45-second TikTok, a numbered list on LinkedIn, and a thread opener on X. Same core idea, completely different delivery.\n\nSarah Chen demonstrated this perfectly: a YouTube video with 300 views yielded a TikTok clip that hit 200,000 views. The content was identical. The translation made it work.\n\n**Your action item this week:** Take your best-performing piece of content from the last month. Don't repost it. Translate it for one other platform. Match the format, the pacing, and the hook style that platform rewards.`,
    wordCount: 148,
  },
  {
    label: "Newsletter: The 5-Hour Creator Week",
    content: `## How to Run a 5-Hour Content Week\n\nSarah's weekly content schedule breaks down like this:\n\n- **Monday (1 hour):** Record one 15-20 minute anchor video\n- **Tuesday (1 hour):** Review AI-generated clips and text outputs. Approve, tweak, or skip.\n- **Wed-Thu (2-3 hours):** Light editing, caption tweaks, scheduling\n\nThat's it. Five hours total, down from twenty.\n\nThe critical shift was automating *clip detection*. She used to rewatch her own videos hunting for quotable moments. Now AI handles the initial scan, and she spends her energy on creative decisions — which clips to approve, how to tweak the hooks.\n\n**The rule:** automate the mechanical, keep the creative. Batch-schedule everything in one sitting. Separate the publishing from the creating. That's what prevents burnout.`,
    wordCount: 145,
  },
];

export const DEMO_CHAPTER_MARKERS = `0:00 Introduction
0:09 Sarah's content creation frustration
0:35 The repurposing-first workflow
1:02 Translation vs. copy-paste
1:29 Concrete example: YouTube to TikTok to LinkedIn
1:53 Time savings breakdown: 20 hours to 5
2:41 Growth trajectory: 500 to 50,000 followers
2:56 The 300-view video that got 200K on TikTok
3:36 #1 mistake: trying to be everywhere at once
4:29 Maintaining authenticity with automation
5:06 Rapid-fire advice: scheduling tools
5:39 Closing`;

export const DEMO_KEY_INSIGHTS = [
  {
    insight: "Repurposing content is fundamentally about translation, not duplication. Each platform has its own language and rhythm that requires adapting the core message.",
    significance: "high" as const,
    speakerId: "speaker_1",
    approximateTimestamp: 62.5,
    tags: ["repurposing", "platform-strategy", "content-creation"],
    confidence: 0.95,
  },
  {
    insight: "The most efficient content workflow starts with a single anchor piece (15-20 min video) that feeds all other platforms, reducing weekly time from 20 hours to 5.",
    significance: "high" as const,
    speakerId: "speaker_1",
    approximateTimestamp: 45.8,
    tags: ["workflow", "efficiency", "anchor-content"],
    confidence: 0.93,
  },
  {
    insight: "Your best-performing content already exists but may be on the wrong platform. A YouTube video with 300 views generated 200,000 views as a TikTok clip.",
    significance: "high" as const,
    speakerId: "speaker_1",
    approximateTimestamp: 176.0,
    tags: ["distribution", "platform-mismatch", "growth"],
    confidence: 0.96,
  },
  {
    insight: "The biggest repurposing mistake is trying to maintain presence on too many platforms simultaneously. Start with two, master the translation, then expand.",
    significance: "medium" as const,
    speakerId: "speaker_1",
    approximateTimestamp: 230.5,
    tags: ["strategy", "focus", "platform-selection"],
    confidence: 0.92,
  },
  {
    insight: "Automated clip detection saves the most time by eliminating the need to rewatch content for quotable moments, but human review remains essential for quality.",
    significance: "medium" as const,
    speakerId: "speaker_1",
    approximateTimestamp: 126.2,
    tags: ["automation", "ai-tools", "quality-control"],
    confidence: 0.91,
  },
  {
    insight: "Separating creative work from publishing work through batch scheduling is the primary mechanism for preventing creator burnout.",
    significance: "medium" as const,
    speakerId: "speaker_1",
    approximateTimestamp: 320.5,
    tags: ["scheduling", "burnout", "workflow"],
    confidence: 0.90,
  },
];

export const DEMO_NOTABLE_QUOTES = [
  {
    quote: "The key insight that changed everything for me was realizing that repurposing isn't about copying and pasting. It's about translating.",
    speakerId: "speaker_1",
    speakerLabel: "Sarah Chen",
    approximateTimestamp: 62.5,
    context: "Explaining her fundamental shift in approach to content repurposing",
    impact: "high" as const,
    socialReady: true,
  },
  {
    quote: "Your best content already exists. You don't need to create more — you need to distribute better.",
    speakerId: "speaker_1",
    speakerLabel: "Sarah Chen",
    approximateTimestamp: 199.0,
    context: "After sharing the story of a 300-view YouTube video getting 200K on TikTok",
    impact: "high" as const,
    socialReady: true,
  },
  {
    quote: "Think of it like a photographer who shoots in RAW and then crops for different frame sizes. The photo is still theirs.",
    speakerId: "speaker_1",
    speakerLabel: "Sarah Chen",
    approximateTimestamp: 285.5,
    context: "Addressing concerns about automation killing authenticity",
    impact: "medium" as const,
    socialReady: true,
  },
  {
    quote: "Create once, distribute everywhere. That's the mantra.",
    speakerId: "speaker_1",
    speakerLabel: "Sarah Chen",
    approximateTimestamp: 350.5,
    context: "Closing statement summarizing the entire philosophy",
    impact: "high" as const,
    socialReady: true,
  },
  {
    quote: "What makes a clip resonate isn't just the words — it's the energy, the timing, the authenticity. Always review before you publish.",
    speakerId: "speaker_1",
    speakerLabel: "Sarah Chen",
    approximateTimestamp: 253.0,
    context: "Arguing for human review even when using automated tools",
    impact: "medium" as const,
    socialReady: true,
  },
];
