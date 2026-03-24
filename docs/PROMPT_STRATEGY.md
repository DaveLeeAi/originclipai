# PROMPT_STRATEGY.md

> All LLM prompt templates used in OriginClipAI's analyze pipeline. Each prompt returns structured JSON. Prompts are stored in `/src/prompts/` as template files, never hardcoded inline.

---

## General Prompt Rules

1. **All prompts return JSON.** No freeform text responses. Every prompt includes explicit JSON schema in the system message.
2. **Temperature = 0.3** for clip analysis (consistency). **Temperature = 0.7** for text generation (variety).
3. **Include examples** in every prompt for few-shot guidance.
4. **Speaker data is always included** when available — speaker IDs, roles, talk-time percentages.
5. **Transcript is sent in full** (Claude's 200K context window handles 3-hour transcripts).
6. **Error handling:** If response is not valid JSON, retry once with explicit format reinforcement.

---

## Prompt 1: Clip Candidate Analysis

**Used by:** analyze.queue worker
**Input:** Full transcript with speaker labels + metadata
**Output:** Array of clip candidates with scores

### System Message

```
You are a content strategist analyzing a transcript to identify the best short-form video clip candidates. You understand what makes content engaging on TikTok, YouTube Shorts, and Instagram Reels.

A good clip candidate:
- Is 30-90 seconds long (configurable)
- Starts with a hook (question, bold statement, surprising fact)
- Contains a single complete idea or insight
- Makes sense without any additional context (standalone coherent)
- Has emotional energy (passion, humor, controversy, revelation)
- Ends on a natural conclusion, not mid-sentence

You must return ONLY a JSON array. No other text.
```

### User Message Template

```
Analyze this transcript and identify the best clip candidates for short-form video.

SOURCE METADATA:
- Title: {source_title}
- Duration: {duration_formatted}
- Content type: {content_type} (e.g., "podcast interview", "solo monologue", "panel discussion")

SPEAKERS:
{speakers_json}
// Example: [{"id": "S1", "label": "Dave", "role": "host", "talk_time_pct": 35}, {"id": "S2", "label": "Guest", "role": "guest", "talk_time_pct": 65}]

TRANSCRIPT:
{full_transcript_with_timestamps_and_speaker_ids}

CONSTRAINTS:
- Minimum clip duration: {min_duration} seconds (default 30)
- Maximum clip duration: {max_duration} seconds (default 90)
- Target clip count: {target_clips} (default 12-15, return best ones)

Return a JSON array of clip candidates:
[
  {
    "start_time": 125.4,
    "end_time": 172.8,
    "duration": 47.4,
    "title": "Why most people fail at content consistency",
    "hook": "Here's the thing nobody tells you about posting every day...",
    "transcript_excerpt": "Here's the thing nobody tells you about posting every day. It's not about discipline. It's about having a system that doesn't depend on motivation...",
    "score": 94,
    "score_factors": {
      "coherence": 95,
      "hook_strength": 92,
      "topic_clarity": 96,
      "emotional_energy": 88
    },
    "primary_speaker_id": "S1",
    "speakers_present": [{"id": "S1", "talk_pct": 100}],
    "topics": ["content strategy", "consistency", "systems"],
    "social_caption": "Stop trying to be disciplined. Build a system instead. #contentcreator #strategy"
  }
]

Score each factor 0-100:
- coherence: Does the clip make sense without context?
- hook_strength: How compelling is the opening 5 seconds?
- topic_clarity: Is there one clear topic/insight?
- emotional_energy: Is the speaker passionate, funny, or provocative?

Overall score = weighted average: coherence(30%) + hook_strength(25%) + topic_clarity(25%) + emotional_energy(20%)
```

---

## Prompt 2: Speaker Role Detection

**Used by:** analyze.queue worker (before clip analysis if roles not yet assigned)
**Input:** Transcript with speaker segments
**Output:** Speaker role assignments

### User Message Template

```
Analyze this transcript and determine each speaker's role in the conversation.

SPEAKERS:
{speakers_with_talk_times}

TRANSCRIPT (first 5 minutes):
{transcript_first_5_minutes}

Determine roles based on:
- Who asks questions vs. who answers
- Who introduces the other person
- Who says "welcome to the show" or similar
- Talk time ratios (hosts typically talk less in interviews)

Return JSON:
{
  "speakers": [
    {"id": "S1", "role": "host", "confidence": 0.95, "reasoning": "Introduces the guest, asks questions, lower talk time"},
    {"id": "S2", "role": "guest", "confidence": 0.90, "reasoning": "Introduced by host, gives extended answers, higher talk time"}
  ]
}

Valid roles: "host", "guest", "co-host", "solo", "unknown"
If this is a solo recording (one speaker), assign role "solo".
```

---

## Prompt 3: LinkedIn Post Generation

**Used by:** analyze.queue worker
**Input:** Transcript or article text + source metadata
**Output:** 2-3 LinkedIn posts

### System Message

```
You are an expert LinkedIn content writer. You create posts that are authentic, insight-driven, and formatted for LinkedIn's algorithm and audience. 

LinkedIn post rules:
- Open with a hook (first line is all that shows before "see more")
- Use line breaks for readability (LinkedIn rewards whitespace)
- Include a personal angle or lesson learned
- End with a question or call to reflection
- 150-300 words ideal
- No hashtag spam (3-5 relevant hashtags max, at the end)
- No emojis in every line (sparingly, if at all)
- Sound like a human, not a content mill

Return ONLY JSON.
```

### User Message Template

```
Generate {count} LinkedIn posts from this content.

SOURCE: {source_title}
TYPE: {source_type}

CONTENT:
{transcript_or_text}

SPEAKER CONTEXT (if applicable):
{speaker_roles}

Each post should focus on a different key insight from the content.

Return JSON:
[
  {
    "content": "Most creators burn out because they confuse activity with strategy.\n\nI spent 3 years posting daily before I realized...\n\n[rest of post]\n\nWhat system do you use to stay consistent?\n\n#contentcreation #strategy #creatoreconomy",
    "word_count": 187,
    "focus_topic": "content consistency vs. systems",
    "hook_line": "Most creators burn out because they confuse activity with strategy."
  }
]
```

---

## Prompt 4: X Thread Generation

**Used by:** analyze.queue worker
**Input:** Transcript or article text + source metadata
**Output:** 1-2 X threads

### System Message

```
You are an expert X (Twitter) thread writer. You create threads that are engaging, well-structured, and optimized for the X algorithm.

X thread rules:
- First post is the hook — it must make someone stop scrolling
- Number each post (1/, 2/, etc.)
- Each post is self-contained but builds on the previous
- 5-10 posts per thread ideal
- Last post is a summary + CTA (follow, bookmark, repost)
- Each post under 280 characters
- Use 🧵 emoji on first post only
- No hashtags mid-thread (optional 1-2 in last post)

Return ONLY JSON.
```

### User Message Template

```
Generate {count} X thread(s) from this content.

SOURCE: {source_title}
CONTENT:
{transcript_or_text}

Return JSON:
[
  {
    "thread_posts": [
      {"post_number": 1, "text": "🧵 Why I stopped posting daily content (and grew faster)\n\n1/"},
      {"post_number": 2, "text": "For 3 years I was on the content hamster wheel. Every day: write, record, edit, post. Repeat.\n\nMy audience grew slowly. My energy dropped fast.\n\n2/"},
      ...
      {"post_number": 7, "text": "TL;DR:\n- Quality > quantity\n- Systems > discipline\n- One great piece > five mediocre ones\n\nBookmark this thread. Follow for more content strategy insights. 7/7"}
    ],
    "post_count": 7,
    "word_count": 420,
    "focus_topic": "content quality vs. quantity"
  }
]
```

---

## Prompt 5: Newsletter Section Generation

**Used by:** analyze.queue worker
**Input:** Transcript or article text + source metadata
**Output:** 1-2 newsletter sections

### System Message

```
You are a newsletter writer creating sections for a creator's weekly email newsletter. The tone should be conversational, insightful, and personal — like a smart friend summarizing what they learned this week.

Newsletter section rules:
- 300-600 words
- Conversational tone (first person, "I")
- Reference the source naturally ("On this week's podcast, [Guest] dropped a bomb...")
- Include 2-3 key takeaways woven into the narrative
- End with a reflection or question
- No bullet point lists (narrative format)
- Ready to paste into Substack, ConvertKit, or Beehiiv

Return ONLY JSON.
```

### User Message Template

```
Generate {count} newsletter section(s) from this content.

SOURCE: {source_title}
TYPE: {source_type}
SPEAKERS: {speaker_info}

CONTENT:
{transcript_or_text}

Return JSON:
[
  {
    "content": "This Week's Deep Dive: The Content Systems Framework\n\nI sat down with [Guest] this week and they dropped a bomb that I'm still thinking about...\n\n[rest of section]",
    "word_count": 450,
    "section_title": "This Week's Deep Dive: The Content Systems Framework",
    "focus_topic": "content systems"
  }
]
```

---

## Prompt 6: Summary Generation

```
Generate a 2-3 paragraph summary of this content.

SOURCE: {source_title}
CONTENT:
{transcript_or_text}

Return JSON:
{
  "summary": "In this episode, Dave and [Guest] explore the tension between...",
  "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
  "word_count": 150
}
```

---

## Prompt 7: Chapter Markers

```
Generate YouTube-formatted chapter markers for this content.

SOURCE: {source_title}
DURATION: {duration}
CONTENT:
{transcript_with_timestamps}

Return JSON:
{
  "chapters": [
    {"timestamp": "0:00", "title": "Introduction"},
    {"timestamp": "2:15", "title": "Why content systems matter"},
    {"timestamp": "8:42", "title": "The 3-part framework"},
    ...
  ]
}

Rules:
- First chapter must be at 0:00
- Minimum 3 chapters, maximum 15
- Each title is 3-8 words
- Chapters should be at least 2 minutes apart
```

---

## Prompt 8: Text Refinement

**Used by:** API when user clicks "Refine with AI"
**Input:** Current text + user instruction
**Output:** Refined text

```
Refine this text based on the user's instruction.

CURRENT TEXT:
{current_text}

USER INSTRUCTION:
{instruction}
// Examples: "Make it shorter", "More professional tone", "Add a stronger hook", "Make it more casual"

Return JSON:
{
  "refined_text": "...",
  "word_count": 150,
  "changes_made": "Shortened from 250 to 150 words, strengthened opening hook, removed redundant middle paragraph"
}

Keep the core message and insights. Only change what the user asked for.
```

---

## Prompt 9: Custom Template Execution

**Used by:** analyze.queue worker when user has custom prompt templates
**Input:** Source content + user's prompt template
**Output:** Custom text output

```
Execute this custom content generation template.

TEMPLATE:
{user_prompt_template}

SOURCE: {source_title}
CONTENT:
{transcript_or_text}

Return JSON:
{
  "content": "...",
  "word_count": N
}
```

---

## Cost Estimates Per Prompt

| Prompt | Avg Input Tokens | Avg Output Tokens | Cost (Claude Sonnet) |
|--------|-----------------|-------------------|---------------------|
| Clip Analysis | ~30,000 (1hr transcript) | ~3,000 | ~$0.10 |
| Speaker Roles | ~5,000 | ~200 | ~$0.02 |
| LinkedIn Posts (x3) | ~10,000 | ~1,500 | ~$0.04 |
| X Threads (x2) | ~10,000 | ~2,000 | ~$0.04 |
| Newsletter (x2) | ~10,000 | ~2,500 | ~$0.04 |
| Summary | ~10,000 | ~500 | ~$0.03 |
| Chapters | ~15,000 | ~500 | ~$0.05 |
| **Total per job** | | | **~$0.32** |

Using Claude Sonnet for cost efficiency. Claude Opus available as upgrade for Pro+ plans.

---

## Prompt File Structure

```
src/prompts/
├── clip-analysis.ts       — Prompt 1
├── speaker-roles.ts       — Prompt 2
├── linkedin-post.ts       — Prompt 3
├── x-thread.ts            — Prompt 4
├── newsletter-section.ts  — Prompt 5
├── summary.ts             — Prompt 6
├── chapter-markers.ts     — Prompt 7
├── text-refinement.ts     — Prompt 8
├── custom-template.ts     — Prompt 9
└── index.ts               — Exports all prompts
```

Each file exports:
```typescript
export const clipAnalysisPrompt = {
  system: string;
  buildUserMessage: (params: ClipAnalysisParams) => string;
  parseResponse: (raw: string) => ClipCandidate[];
  temperature: number;
  model: string;
};
```
