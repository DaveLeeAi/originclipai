# FEATURE_MATRIX.md

> Side-by-side comparison of all major competitors across every product dimension relevant to OriginClipAI.

---

## Input Sources

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | Repurpose.io | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|--------------|-------------------|
| YouTube URL | ✅ | ✅ | ❌ | ❌ | ✅ | Monitor only | ✅ |
| Public video URL | ✅ (limited) | ✅ (limited) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Article / blog URL | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| PDF upload | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Video upload (MP4) | ✅ | ✅ | ✅ | ✅ (limited) | ✅ | ❌ | ✅ |
| Audio upload (MP3/WAV) | ❌ | ✅ | ✅ | ✅ (native) | ✅ | ❌ | ✅ |
| RSS feed | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | v2 |
| Cloud storage (Drive/Dropbox) | ✅ (Pro+) | ✅ | ❌ | ❌ | ❌ | ❌ | v2 |
| Max input length | 3 hours | 2 hours | Unlimited | Session-based | No hard limit | N/A | 3 hours (v1) |

---

## Transcription

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|-------------------|
| Auto-transcription | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Engine | Proprietary + Gemini | Proprietary (Spark) | Proprietary | Proprietary | Likely Whisper/Deepgram | Whisper + AssemblyAI fallback |
| Speaker diarization | ✅ | ✅ (best-in-class) | ✅ | ✅ (native tracks) | ✅ | ✅ |
| Transcript editing | Basic | Basic | ✅ (core paradigm) | Basic | ❌ | Basic (v1) |
| Multilingual | ✅ (40+ langs) | ✅ (30+ langs) | ✅ (24 langs) | ✅ | ✅ | ✅ (Whisper 58 langs) |
| Hallucination handling | Unknown | Unknown | Unknown | Unknown | Unknown | Post-process filter |
| Word-level timestamps | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## AI Clip Detection

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|-------------------|
| Automated clip detection | ✅ | ✅ | ❌ | ✅ (Magic Clips) | ❌ | ✅ |
| Multimodal analysis | ✅ (visual+audio+text) | ✅ (Spark 1.0) | N/A | Basic | N/A | Text+audio (v1), multimodal (v2) |
| Prompt-based clipping | ❌ | ✅ | N/A | ❌ | N/A | ✅ |
| Clip scoring | ✅ (0-99 virality) | ✅ (scored) | N/A | ✅ (basic) | N/A | ✅ (engagement score) |
| Clips per hour of input | 10-25 | 10-20 | N/A | 5-15 | N/A | 8-20 (target) |
| Manual clip selection | ✅ | ✅ | ✅ (core) | ✅ | N/A | ✅ |
| Speaker-filtered clipping | ❌ | ❌ | ❌ | ❌ | N/A | ✅ (v1 differentiator) |
| Speaker role detection | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (host vs. guest) |

---

## Reframing & Aspect Ratios

| Feature | OpusClip | Vizard | Descript | Riverside | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-------------------|
| 9:16 vertical | ✅ | ✅ | Manual | ✅ | ✅ |
| 1:1 square | Pro+ | ✅ | Manual | ✅ | ✅ |
| 16:9 landscape | Pro+ | ✅ | ✅ (native) | ✅ | ✅ |
| 4:5 portrait | ❌ | ✅ | Manual | ❌ | v2 |
| Auto-reframe (face tracking) | ✅ | ✅ | ❌ | ✅ (native only) | ✅ |
| Manual reframe adjustment | Basic | Basic | Full | Basic | Basic (v1) |

---

## Captioning

| Feature | OpusClip | Vizard | Descript | Riverside | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-------------------|
| Auto-captions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Animated caption styles | ✅ (10+ templates) | ✅ | Basic | Basic | 3-5 styles (v1) |
| Word-level highlighting | ✅ (karaoke) | ✅ | ✅ | ❌ | ✅ |
| Speaker color coding | ✅ | ✅ | ✅ | ✅ (native) | ✅ |
| Emoji insertion | ✅ | ❌ | ❌ | ❌ | v2 |
| Custom font/color | ✅ | ✅ | ✅ | Basic | ✅ |
| SRT/VTT export | ✅ (paid) | ✅ | ✅ | ✅ | ✅ |

---

## Text Repurposing Outputs

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|-------------------|
| Social captions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hashtag generation | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| LinkedIn posts | ❌ | ❌ | Basic | ❌ | ✅ | ✅ (first-class) |
| X / Twitter threads | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (first-class) |
| Newsletter sections | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (first-class) |
| Blog post drafts | ❌ | ❌ | ✅ (Underlord) | ❌ | ✅ | ✅ |
| Show notes | ❌ | ❌ | ✅ | ✅ (basic) | ✅ | ✅ |
| Chapter markers | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Summary / key insights | ❌ | ❌ | ✅ | Basic | ✅ | ✅ |
| Custom prompt templates | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (v1) |
| Brand voice training | ❌ | ❌ | ❌ | ❌ | ✅ | v2 |

---

## Review & Approval Workflow

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|-------------------|
| Structured review queue | ❌ (grid only) | ❌ (grid only) | ❌ (NLE) | Basic | ❌ | ✅ (approve/edit/skip) |
| Clip preview in-context | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Text output preview | N/A | N/A | ✅ | Basic | ✅ | ✅ |
| Unified clips + text review | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Batch approve/reject | ❌ | ❌ | N/A | ❌ | ❌ | ✅ |
| Edit before export | Basic | Basic | Full | Basic | ❌ | Basic (v1) |
| Regenerate single output | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Scheduling & Distribution

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | Repurpose.io | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|--------------|-------------------|
| Built-in scheduler | ✅ (6 platforms) | ✅ (7 platforms) | ❌ | ❌ | ❌ | ✅ (300+) | ✅ (4 platforms v1) |
| TikTok | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| YouTube Shorts | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Instagram Reels | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | v2 |
| LinkedIn | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ (text posts v1) |
| X / Twitter | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ (text posts v1) |
| Facebook | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | v2 |
| Scheduler reliability | Poor (widely reported) | Moderate | N/A | N/A | N/A | Moderate (31% issues) | TBD |
| Calendar view | Basic | Basic | N/A | N/A | N/A | ✅ | v2 |
| Content queue | ✅ | ✅ | N/A | N/A | N/A | ✅ | ✅ |

---

## Export

| Feature | OpusClip | Vizard | Descript | Riverside | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-------------------|
| MP4 download | ✅ | ✅ | ✅ | ✅ | ✅ |
| Batch export | ✅ (paid) | ✅ | ✅ | ✅ | ✅ |
| Resolution options | Up to 1080p | Up to 4K | Up to 4K | Up to 4K | 1080p (v1) |
| SRT/VTT captions | ✅ | ✅ | ✅ | ✅ | ✅ |
| XML (Premiere/DaVinci) | ✅ | ❌ | ✅ | ❌ | v2 |
| Transcript export (TXT/MD) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export package (all outputs) | ❌ | ❌ | ❌ | ❌ | ✅ (ZIP bundle) |
| Text outputs export | N/A | N/A | Basic | Basic | ✅ (MD, TXT, JSON) |

---

## API & Headless Access

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|-------------------|
| Public API | Enterprise only | ✅ (all paid) | ❌ | Limited | ❌ | ✅ (all paid plans) |
| Self-serve API keys | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Webhook notifications | Unknown | Unknown | ❌ | ❌ | ❌ | ✅ |
| Zapier / Make integration | ❌ | ❌ | ❌ | ❌ | ✅ (Zapier) | ✅ (v1) |
| Headless mode (no GUI) | ❌ | Partial | ❌ | ❌ | ❌ | ✅ (core architecture) |

---

## Pricing Comparison

| Tier | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (target) |
|------|----------|--------|----------|-----------|-----------|----------------------|
| Free | 60 min, watermark | 60 min, 720p | 10 hrs transcript | Limited recording | ❌ | 30 min, watermark |
| Entry paid | $15/mo | ~$14.50/mo | $8/mo | $15/mo | $23/mo | $19/mo |
| Pro | $29/mo | ~$30/mo | $24/mo | $24/mo | $49/mo | $39/mo |
| Business | $79/mo | Custom | $40/mo | $30/mo | $99/mo | $79/mo |
| Credit system | Upload minutes | Upload minutes | AI credits (volatile) | Recording hours | Transcription hours | Processing minutes |

---

## Collaboration & Team Features

| Feature | OpusClip | Vizard | Descript | Riverside | Castmagic | OriginClipAI (v1) |
|---------|----------|--------|----------|-----------|-----------|-------------------|
| Multi-seat | Business+ | Teams+ | All plans | All plans | ❌ | v2 |
| Brand kits | Business+ | ❌ | ❌ | ❌ | ❌ | v2 |
| Shared workspaces | Business+ | Teams+ | ✅ | ✅ | ❌ | v2 |
| Client review links | ❌ | ❌ | ✅ | ❌ | ❌ | v2 |

---

## Summary: Where OriginClipAI v1 Wins

1. **Only tool with article URL + PDF as inputs** — zero competitors
2. **First-class text outputs alongside video clips** — only Castmagic matches on text, but has no video clipping
3. **Speaker-role-aware clipping** (host vs. guest filtering) — zero competitors
4. **Unified review queue** for both clips and text — zero competitors
5. **Self-serve API on all paid plans** — only Vizard matches, but no text generation API
6. **Export package** (all outputs bundled) — zero competitors
7. **Headless-first architecture** — zero competitors at solo-creator tier
