# SEO_CONTENT_PLAN.md

> SEO and content strategy for OriginClipAI's landing page, blog, and programmatic pages.

---

## Domain & URL Strategy

**Primary domain:** originclipai.com (or originclip.ai if available)

**URL structure:**
```
/                          — Landing page (hero, how it works, pricing, FAQ)
/pricing                   — Detailed pricing page
/blog                      — Content hub
/blog/[slug]               — Individual blog posts
/compare/[competitor]      — Programmatic comparison pages
/features/[feature]        — Feature deep-dive pages
/use-cases/[use-case]      — Use case pages
/changelog                 — Product updates
/docs                      — API documentation
/docs/api                  — API reference
```

---

## Landing Page SEO

### Primary Keywords (Target)

| Keyword | Monthly Search Volume (est.) | Difficulty | Intent |
|---------|------------------------------|-----------|--------|
| ai video clipper | 5,000-10,000 | Medium | Commercial |
| content repurposing tool | 3,000-5,000 | Medium | Commercial |
| youtube to shorts | 8,000-15,000 | High | Transactional |
| ai clip generator | 2,000-4,000 | Medium | Commercial |
| repurpose youtube videos | 2,000-3,000 | Medium | Informational/Commercial |
| opus clip alternative | 3,000-5,000 | Low-Medium | Commercial |
| ai content repurposing | 1,500-3,000 | Medium | Informational |

### Landing Page Structure

```
<h1>Turn any content into clips, posts, and threads</h1>
<p>Paste a YouTube URL, article, or PDF → get video clips, LinkedIn posts, X threads, 
   and newsletter drafts — reviewed and scheduled from one dashboard.</p>

[Hero CTA: "Try free — no credit card"]

## How it works (4 steps)
1. Paste any URL or upload (YouTube, articles, PDFs, audio, video)
2. AI analyzes, scores clips, and drafts text outputs
3. Review — approve, edit, or skip each output
4. Schedule to TikTok, YouTube, LinkedIn, and X

## What you get from one upload
- 8-20 scored video clips with captions
- LinkedIn posts (2-3)
- X threads (1-2)
- Newsletter sections (1-2)
- Summary, chapter markers, social captions

## Why creators switch to OriginClipAI
[Differentiation: multi-format inputs, text as first-class, speaker-aware, API-first, honest review workflow]

## Pricing
[Pricing table]

## FAQ
[SEO-rich FAQ with long-tail keywords]
```

### Meta Tags

```html
<title>OriginClipAI — Turn any content into clips, posts, and threads</title>
<meta name="description" content="AI content repurposing engine for creators. Paste a YouTube URL, article, or PDF and get video clips, LinkedIn posts, X threads, and newsletter drafts. Free to start.">
<meta property="og:title" content="OriginClipAI — Content repurposing for creators">
<meta property="og:description" content="One upload → video clips + LinkedIn posts + X threads + newsletter sections. AI-powered, human-reviewed.">
```

---

## Programmatic Comparison Pages

High-intent, low-competition pages targeting "[competitor] alternative" searches.

### Pages to Create

| URL | Target Keyword | Est. Volume |
|-----|---------------|-------------|
| /compare/opus-clip | opus clip alternative | 3,000-5,000 |
| /compare/vizard | vizard alternative | 1,000-2,000 |
| /compare/descript | descript alternative | 2,000-3,000 |
| /compare/castmagic | castmagic alternative | 500-1,000 |
| /compare/riverside | riverside alternative | 1,000-2,000 |
| /compare/repurpose-io | repurpose io alternative | 500-1,000 |
| /compare/vidyo-ai | vidyo ai alternative | 800-1,500 |
| /compare/munch | munch ai alternative | 500-800 |

### Comparison Page Template

```
<h1>OriginClipAI vs. {Competitor}: Which content repurposing tool is right for you?</h1>

## Quick comparison
[Feature matrix table: OriginClipAI vs. Competitor across key dimensions]

## Where {Competitor} excels
[Honest assessment — builds credibility]

## Where OriginClipAI is different
[Key differentiators relevant to this specific competitor]

## Pricing comparison
[Side-by-side pricing]

## Who should use {Competitor}
[Fair recommendation]

## Who should use OriginClipAI
[Target audience fit]

[CTA: "Try OriginClipAI free"]
```

**Important:** Be genuinely fair. Don't trash competitors. Honest comparisons rank better and convert better than biased ones.

---

## Blog Content Strategy

### Content Pillars

1. **Content repurposing guides** (informational, top-of-funnel)
2. **Creator workflow optimization** (informational, awareness)
3. **Platform-specific tips** (informational, mid-funnel)
4. **Product updates** (bottom-of-funnel, retention)

### Launch Blog Posts (First 30 Days)

| # | Title | Target Keyword | Pillar |
|---|-------|---------------|--------|
| 1 | How to repurpose a YouTube video into 10+ pieces of content | repurpose youtube video | Guides |
| 2 | The complete guide to AI content repurposing in 2026 | ai content repurposing | Guides |
| 3 | Why your AI-generated clips need human review (and how to do it fast) | ai clip review workflow | Workflow |
| 4 | How to turn a podcast into LinkedIn posts, X threads, and newsletter sections | podcast to linkedin posts | Guides |
| 5 | OpusClip vs. OriginClipAI: honest feature comparison | opus clip vs originclipai | Comparison |
| 6 | How to repurpose a blog post into video clips and social content | repurpose blog post | Guides |
| 7 | The solo creator's content distribution system | content distribution solo creator | Workflow |
| 8 | Building an API-powered content pipeline with OriginClipAI | content repurposing api | Product |

### Ongoing Blog Cadence

- 2 posts/week for first 3 months
- 1 post/week after that
- Mix: 60% informational (SEO), 20% comparison, 20% product updates

---

## Feature Pages

Deep-dive pages for each major feature, targeting feature-specific searches.

| URL | Target Keyword |
|-----|---------------|
| /features/ai-clip-detection | ai video clip detection |
| /features/speaker-aware-clipping | speaker aware video clipping |
| /features/linkedin-post-generator | ai linkedin post generator from video |
| /features/x-thread-generator | ai twitter thread generator |
| /features/newsletter-generator | newsletter content from podcast |
| /features/social-scheduling | social media scheduling for creators |
| /features/api | content repurposing api |
| /features/article-repurposing | repurpose article into social content |
| /features/pdf-repurposing | repurpose pdf into social content |

---

## Use Case Pages

| URL | Target Keyword |
|-----|---------------|
| /use-cases/youtubers | repurpose youtube content |
| /use-cases/podcasters | podcast repurposing tool |
| /use-cases/newsletter-writers | newsletter content creation |
| /use-cases/linkedin-creators | linkedin content from video |
| /use-cases/course-creators | repurpose course content |

---

## Technical SEO Checklist

- [ ] Next.js static generation for landing, comparison, feature, and use case pages
- [ ] Dynamic sitemap.xml generation (all pages + blog posts)
- [ ] robots.txt allowing all public pages
- [ ] Canonical URLs on all pages
- [ ] Open Graph tags on all pages
- [ ] Twitter Card tags on all pages
- [ ] Schema.org markup: SoftwareApplication, FAQPage, Article
- [ ] Image alt text on all images
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Internal linking between related pages
- [ ] Breadcrumb navigation on blog and comparison pages

---

## Growth Channels (Non-SEO)

### ProductHunt Launch
- Target: featured in top 5 on launch day
- Prep: teaser page, early upvoter list, demo video
- Timing: Tuesday or Wednesday (highest traffic)

### Creator Community Seeding
- Share in r/NewTubers, r/podcasting, r/contentcreation
- Provide genuine value (free tier), don't spam
- Build relationships with creators who compare tools

### YouTube Reviews
- Reach out to creator tool review channels
- Offer extended free trial for honest review
- Create own demo/walkthrough video

### X/Twitter Presence
- Build-in-public thread documenting development
- Share product insights from competitive research
- Engage with creator tool discussion threads
