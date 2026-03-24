# V1_SCOPE_RECOMMENDATION.md

> Disciplined v1 scope for OriginClipAI, justified by competitive research. Every inclusion and exclusion has a reason.

---

## V1 Product Thesis

OriginClipAI v1 is a **content repurposing engine for solo creators** that accepts diverse inputs (YouTube URLs, video uploads, audio files, article URLs, PDFs), generates both video clips and text outputs, provides a structured review workflow, and includes scheduling to core platforms.

The v1 must prove one thing: **a single tool can replace the OpusClip + Castmagic + manual scheduling stack** for a solo YouTuber/podcaster.

---

## V1 Scope: In

### Input Pipeline

| Feature | Justification |
|---------|---------------|
| YouTube URL ingestion | Table stakes — every competitor does this. Non-negotiable. |
| MP4 video upload | Table stakes. Required for creators not on YouTube. |
| Audio file upload (MP3, WAV, M4A) | Vizard supports this; OpusClip doesn't. Easy win. Podcasters need it. |
| Article/blog URL ingestion | **Zero competitors do this.** Key differentiator. Extract text + metadata via scraping. |
| PDF upload | **Zero competitors do this.** Text extraction is straightforward. Unlocks whitepaper/ebook repurposing. |
| Max 3 hours per source | Matches OpusClip's limit. Keeps processing costs bounded. |

### Transcription

| Feature | Justification |
|---------|---------------|
| Auto-transcription (Whisper primary) | Cost-effective, multilingual, self-hostable. |
| AssemblyAI fallback for production quality | Better speaker diarization, fewer hallucinations. Used when accuracy matters. |
| Speaker diarization | Required for speaker-aware clipping. Non-negotiable. |
| Speaker role detection (host vs. guest) | **V1 differentiator.** Infer from talk-time ratios, question patterns, intro cues. |
| Word-level timestamps | Required for captioning and clip boundary precision. |
| Hallucination post-filter | Whisper hallucinates in silent segments. Filter known patterns ("Thank you for watching", "Subscribe"). |
| Basic transcript editing | Correct errors before outputs are generated. Light-touch, not a full editor. |

### AI Clip Detection

| Feature | Justification |
|---------|---------------|
| Transcript-based clip scoring | LLM analyzes transcript for topic changes, standalone coherence, emotional peaks, key arguments. |
| Audio energy analysis | Supplement text analysis with volume/pace signals. Cheaper than full multimodal. |
| 8-20 clips per hour of input | Competitive with OpusClip (10-25) and Vizard (10-20). |
| Engagement score (not "virality score") | Honest naming. Score based on standalone coherence, hook strength, topic clarity. |
| Speaker-filtered clipping | "Show me clips where the guest speaks" — first in market. |
| Prompt-based clip requests | Match Vizard Spark capability: "Find clips about pricing strategy." |
| Configurable clip duration range | Let creators set min/max (e.g., 30s–90s). Most tools don't offer this. |

### Video Processing

| Feature | Justification |
|---------|---------------|
| Auto-reframe for 9:16, 1:1, 16:9 | Table stakes. 9:16 is primary for Shorts/Reels/TikTok. |
| Face tracking for reframe | Required for solo talking-head and interview content. |
| Auto-captions (3-5 animated styles) | Table stakes. Word-level karaoke highlighting. Speaker color coding. |
| Custom caption font/color/position | Expected by creators. Minimal UI surface area. |
| 1080p output | Standard quality. 4K is v2 — adds significant processing cost. |
| SRT/VTT caption export | Required for accessibility and platform upload. |

### Text Repurposing (First-Class)

| Feature | Justification |
|---------|---------------|
| LinkedIn posts (2-3 per source) | **Key differentiator.** No video clipper generates these. Platform-specific formatting. |
| X threads (1-2 per source) | **Key differentiator.** Structured multi-post threads, not just single tweets. |
| Newsletter sections (1-2 per source) | **Key differentiator.** Ready to paste into Substack/ConvertKit/Beehiiv. |
| Social captions per clip | Table stakes alongside video clips. |
| Summary / key insights | Standard feature. Useful for show notes and descriptions. |
| Chapter markers | Standard feature. YouTube timestamp format. |
| Custom prompt templates | Match Castmagic. Let creators define their own output formats. |

### Review Workflow

| Feature | Justification |
|---------|---------------|
| Structured review queue | **Key differentiator.** Approve/edit/skip per clip. Not a dump-grid. |
| Unified clips + text review | **Zero competitors unify both.** Two tabs, one workflow. |
| In-context clip preview (9:16) | Required for review. Must show captions rendered. |
| Text output preview and inline edit | Required for text review before scheduling. |
| Regenerate single output | "I don't like this LinkedIn post — regenerate it." Castmagic does this. |
| Batch approve/reject | Speed up review for prolific creators. |

### Scheduling & Distribution (Core)

| Feature | Justification |
|---------|---------------|
| YouTube Shorts scheduling | Primary platform for creators. YouTube Data API v3. |
| TikTok scheduling | Second-largest short-form platform. Requires content audit approval. |
| LinkedIn text post scheduling | Matches OriginClipAI's text-output strength. Marketing API. |
| X/Twitter text post scheduling | Matches OriginClipAI's text-output strength. |
| Content queue with set times | Basic scheduling UX — set date/time per output. |
| OAuth-based account connection | Standard pattern. Per-platform auth. |

### Export

| Feature | Justification |
|---------|---------------|
| Individual MP4 download per clip | Table stakes. |
| Batch export (all clips as ZIP) | Table stakes on paid plans. |
| Text outputs export (MD, TXT) | Required for newsletter/blog workflows. |
| Full export package (clips + text + transcript + captions as ZIP) | **Zero competitors bundle this.** |
| SRT/VTT per clip | Standard. |

### API / Headless

| Feature | Justification |
|---------|---------------|
| Self-serve API keys on all paid plans | Only Vizard matches. Major differentiator. |
| REST API covering: ingest, status, list outputs, download | Core headless functionality. |
| Webhook on job completion | Required for automation workflows. |
| Zapier/Make.com integration | Opens automation community. |

### Pricing (Target)

| Tier | Price | Limits | Justification |
|------|-------|--------|---------------|
| Free | $0 | 30 min/month, watermark on clips, 720p | Lower than OpusClip/Vizard (60 min) but includes text outputs. Net value is higher. |
| Creator | $19/mo | 300 min, no watermark, 1080p, all outputs | Undercuts OpusClip ($29 Pro) while including text outputs they don't have. |
| Pro | $39/mo | 900 min, API access, custom prompts, priority processing | Replaces OpusClip Pro + Castmagic Starter ($29 + $23 = $52). |
| Business | $79/mo | 2400 min, team seats (v2), white-label export, SLA | Matches OpusClip Business. |

---

## V1 Scope: Out (with reasoning)

| Feature | Why NOT v1 | When |
|---------|-----------|------|
| Instagram Reels scheduling | Instagram's API is the most restrictive and breaks most often. Ship TikTok + YouTube first. | v1.1 |
| Facebook scheduling | Lower priority for solo creators vs. TikTok/YouTube/LinkedIn/X. | v1.1 |
| 4K export | Doubles rendering cost. 1080p is sufficient for short-form. | v2 |
| AI B-Roll generation | Complex feature (stock footage matching or AI image generation). Not core to the pipeline. | v2 |
| Brand voice training | Requires feedback loop and fine-tuning infrastructure. Custom prompts are sufficient for v1. | v2 |
| Multi-seat / team collaboration | Solo creators first. Teams are v2 monetization expansion. | v2 |
| Brand kits | Nice-to-have. Manual caption customization covers the need for v1. | v2 |
| RSS feed monitoring | Automation feature. Manual URL input is sufficient for v1 PLG. | v2 |
| Cloud storage integration (Drive, Dropbox) | Convenience feature. Direct upload covers the need. | v2 |
| Calendar view for schedule | Content queue with timestamps is sufficient. Full calendar is polish. | v2 |
| XML export (Premiere/DaVinci) | Niche pro feature. MP4 export covers 95% of creators. | v2 |
| 4:5 aspect ratio | Instagram-specific. 9:16 + 1:1 + 16:9 covers primary needs. | v1.1 |
| Emoji insertion in captions | Nice-to-have. Not core. | v1.1 |
| Client review links | Agency feature. Not for solo creators. | v2 |
| Content analytics | Requires platform API read access and dashboard. Separate product surface. | v2 |
| Multimodal clip analysis (visual) | Expensive. Transcript + audio energy is 80% of the value at 20% of the cost. | v2 |

---

## V1 Success Criteria

### Launch Criteria (must hit before public beta)

1. YouTube URL → 8+ scored clips with captions + 4+ text outputs in < 5 minutes
2. MP4 upload → same pipeline, < 5 minutes per hour of source
3. Article URL → 3+ text outputs in < 60 seconds
4. PDF upload → 3+ text outputs in < 60 seconds
5. Speaker diarization correctly identifies 2+ speakers in 90%+ of podcast content
6. Scheduling successfully posts to TikTok and YouTube in 95%+ of attempts
7. API endpoint processes a job and returns results via webhook
8. Free tier → paid conversion tracked and measurable

### 90-Day Post-Launch Targets

- 1,000 free signups
- 50 paid conversions (5% conversion rate)
- < 3% churn in first cohort
- NPS > 40 among active paid users
- API used by 10+ automation builders

---

## Build Priority Order

The v1 should be built in this sequence, with each phase producing a shippable increment:

### Phase 1: Core Pipeline (weeks 1-4)
- Ingest: YouTube URL + MP4 upload
- Transcription: Whisper + speaker diarization
- Clip detection: transcript-based scoring
- Text generation: LinkedIn posts, X threads, summaries
- Export: MP4 + text downloads
- **Milestone:** CLI/API can process a YouTube URL end-to-end

### Phase 2: Video Processing (weeks 5-7)
- Auto-reframe (9:16, 1:1, 16:9)
- Face tracking
- Caption rendering (3 styles, word-level highlighting)
- **Milestone:** Clips export with captions and correct aspect ratio

### Phase 3: Dashboard & Review (weeks 8-10)
- Web dashboard (Next.js)
- Ingest UI (URL paste, file upload)
- Review queue (clips tab + text tab)
- Approve/edit/skip workflow
- **Milestone:** End-to-end GUI workflow functional

### Phase 4: Scheduling & Polish (weeks 11-13)
- OAuth connection for TikTok, YouTube, LinkedIn, X
- Scheduling queue with timestamps
- Audio + article URL + PDF input
- Custom prompt templates
- Export packages (ZIP bundles)
- **Milestone:** Full v1 feature set complete

### Phase 5: API & Launch Prep (weeks 14-16)
- REST API documentation
- Webhook implementation
- Free tier limits and billing
- Stripe integration
- Onboarding flow
- Landing page
- **Milestone:** Public beta launch
