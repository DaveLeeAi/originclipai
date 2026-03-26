// src/app/(marketing)/blog/page.tsx

import Link from 'next/link';

export const metadata = {
  title: 'Blog — OriginClipAI',
  description: 'Guides, tutorials, and insights on content repurposing, AI video clipping, and creator workflows.',
};

// In production, these come from a CMS or MDX files.
// For now, static seed data to establish the page structure.
const POSTS = [
  {
    slug: 'repurpose-youtube-video-guide',
    title: 'How to repurpose a YouTube video into 10+ pieces of content',
    excerpt: 'A step-by-step guide to turning one long-form video into clips, LinkedIn posts, X threads, newsletter sections, and blog posts.',
    category: 'Guides',
    date: '2026-03-20',
    readTime: '8 min',
  },
  {
    slug: 'ai-content-repurposing-2026',
    title: 'The complete guide to AI content repurposing in 2026',
    excerpt: 'The landscape of AI-powered content tools is evolving fast. Here\'s what works, what doesn\'t, and where the market is heading.',
    category: 'Guides',
    date: '2026-03-18',
    readTime: '12 min',
  },
  {
    slug: 'why-ai-clips-need-human-review',
    title: 'Why your AI-generated clips need human review (and how to do it fast)',
    excerpt: 'The "one-click automation" promise is broken. Here\'s why a structured review workflow produces better results than trusting AI blindly.',
    category: 'Workflow',
    date: '2026-03-15',
    readTime: '6 min',
  },
  {
    slug: 'podcast-to-linkedin-x-newsletter',
    title: 'How to turn a podcast into LinkedIn posts, X threads, and newsletter sections',
    excerpt: 'Your weekly podcast episode is a goldmine of content — if you extract it properly. Here\'s the system.',
    category: 'Guides',
    date: '2026-03-12',
    readTime: '7 min',
  },
  {
    slug: 'opus-clip-vs-originclipai',
    title: 'OpusClip vs. OriginClipAI: honest feature comparison',
    excerpt: 'A fair, detailed comparison of both tools — what each does well, where they fall short, and which is right for your workflow.',
    category: 'Comparison',
    date: '2026-03-10',
    readTime: '10 min',
  },
  {
    slug: 'repurpose-blog-post-into-video',
    title: 'How to repurpose a blog post into video clips and social content',
    excerpt: 'Your written content doesn\'t have to stay written. Here\'s how to extract social posts, threads, and newsletter teasers from articles.',
    category: 'Guides',
    date: '2026-03-08',
    readTime: '5 min',
  },
];

const CATEGORIES = ['All', 'Guides', 'Workflow', 'Comparison', 'Product'];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)]">
              <span className="text-xs font-extrabold text-white">O</span>
            </div>
            <span className="font-bold tracking-tight">
              OriginClip<span className="text-[var(--accent-primary)]">AI</span>
            </span>
            <span className="ml-2 rounded-md bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              Blog
            </span>
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[var(--accent-primary)]/20"
          >
            Try free
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Blog</h1>
        <p className="mb-8 text-muted-foreground">
          Guides, tutorials, and insights on content repurposing for creators.
        </p>

        {/* Category filter */}
        <div className="mb-8 flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                cat === 'All'
                  ? 'bg-[var(--accent-primary)]/[0.06] text-[var(--accent-primary)]'
                  : 'text-muted-foreground hover:bg-[var(--border-default)]/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        <div className="space-y-5">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-md bg-[var(--accent-primary)]/[0.06] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-primary)]">
                  {post.category}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">{post.date}</span>
                <span className="text-xs text-[var(--text-tertiary)]">·</span>
                <span className="text-xs text-[var(--text-tertiary)]">{post.readTime} read</span>
              </div>
              <h2 className="mb-2 text-lg font-bold leading-snug tracking-tight hover:text-[var(--accent-primary)]">
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
