// src/app/(marketing)/docs/page.tsx

import Link from 'next/link';

export const metadata = {
  title: 'API Documentation — OriginClipAI',
  description: 'REST API reference for OriginClipAI. Create jobs, list clips and text outputs, schedule posts, and receive webhooks.',
};

/**
 * API documentation page.
 * In production, this would render a Swagger UI or Redocly component
 * from the OpenAPI spec at /api/v1/openapi.json.
 *
 * For now, a clean static reference page.
 */
export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[#f6f5f2]">
      <nav className="sticky top-0 z-50 border-b border-[#e4e2dd] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5046e5] to-[#7c3aed]">
              <span className="text-xs font-extrabold text-white">O</span>
            </div>
            <span className="font-bold tracking-tight">
              OriginClip<span className="text-[#5046e5]">AI</span>
            </span>
            <span className="ml-2 rounded-md bg-[#f6f5f2] px-2 py-0.5 text-[10px] font-bold text-[#6b6960]">
              API Docs
            </span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="mb-10 text-[#6b6960]">
          REST API for headless content repurposing. Available on Pro and Business plans.
        </p>

        {/* Auth */}
        <Section title="Authentication">
          <p className="mb-3 text-sm text-[#6b6960]">
            Authenticate with a Bearer token using your API key from Settings &gt; API Keys.
          </p>
          <CodeBlock>{`curl -H "Authorization: Bearer sk_live_your_key_here" \\
  https://app.originclipai.com/api/v1/jobs`}</CodeBlock>
        </Section>

        {/* Create Job */}
        <Section title="Create a Job" method="POST" path="/api/v1/jobs">
          <p className="mb-3 text-sm text-[#6b6960]">
            Submit a URL or file reference to start the content repurposing pipeline.
          </p>
          <CodeBlock>{`curl -X POST https://app.originclipai.com/api/v1/jobs \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://youtube.com/watch?v=abc123",
    "options": {
      "minClipDuration": 30,
      "maxClipDuration": 90,
      "targetClips": 15,
      "captionStyle": "karaoke",
      "aspectRatios": ["9x16", "1x1"],
      "textOutputs": ["linkedin_post", "x_thread", "newsletter_section"]
    }
  }'`}</CodeBlock>
          <ResponseBlock>{`{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "created",
  "streamUrl": "/api/v1/jobs/550e.../stream"
}`}</ResponseBlock>
        </Section>

        {/* Get Job */}
        <Section title="Get Job Status" method="GET" path="/api/v1/jobs/:id">
          <CodeBlock>{`curl https://app.originclipai.com/api/v1/jobs/550e... \\
  -H "Authorization: Bearer sk_live_xxx"`}</CodeBlock>
          <ResponseBlock>{`{
  "id": "550e...",
  "status": "complete",
  "sourceTitle": "EP 47: Content Systems",
  "sourceDuration": 4354,
  "clipCount": 12,
  "textOutputCount": 7,
  "progress": {
    "ingest": "complete",
    "transcribe": "complete",
    "analyze": "complete",
    "render": "complete"
  }
}`}</ResponseBlock>
        </Section>

        {/* List Clips */}
        <Section title="List Clips" method="GET" path="/api/v1/jobs/:id/clips">
          <p className="mb-3 text-sm text-[#6b6960]">
            Filter by status or speaker.
          </p>
          <CodeBlock>{`curl "https://app.originclipai.com/api/v1/jobs/550e.../clips?status=review&speaker=S2" \\
  -H "Authorization: Bearer sk_live_xxx"`}</CodeBlock>
        </Section>

        {/* List Text Outputs */}
        <Section title="List Text Outputs" method="GET" path="/api/v1/jobs/:id/texts">
          <CodeBlock>{`curl "https://app.originclipai.com/api/v1/jobs/550e.../texts?type=linkedin_post" \\
  -H "Authorization: Bearer sk_live_xxx"`}</CodeBlock>
        </Section>

        {/* Update Clip */}
        <Section title="Approve/Reject Clip" method="PATCH" path="/api/v1/clips/:id">
          <CodeBlock>{`curl -X PATCH https://app.originclipai.com/api/v1/clips/clip-001 \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "approved"}'`}</CodeBlock>
        </Section>

        {/* Refine Text */}
        <Section title="Refine Text with AI" method="POST" path="/api/v1/texts/:id/refine">
          <CodeBlock>{`curl -X POST https://app.originclipai.com/api/v1/texts/text-001/refine \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"instruction": "Make it shorter and add a stronger hook"}'`}</CodeBlock>
          <ResponseBlock>{`{
  "refinedText": "Your content system is broken. Here's the fix...",
  "wordCount": 142,
  "changesMade": "Shortened from 187 to 142 words, rewrote opening hook"
}`}</ResponseBlock>
        </Section>

        {/* Schedule */}
        <Section title="Schedule a Post" method="POST" path="/api/v1/schedule">
          <CodeBlock>{`curl -X POST https://app.originclipai.com/api/v1/schedule \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clipId": "clip-001",
    "platform": "youtube",
    "scheduledAt": "2026-03-25T14:00:00Z"
  }'`}</CodeBlock>
        </Section>

        {/* Webhooks */}
        <Section title="Webhooks">
          <p className="mb-4 text-sm text-[#6b6960]">
            Configure webhook URLs in Settings. We&apos;ll POST events when jobs complete, posts publish, or posts fail.
          </p>
          <div className="space-y-3">
            {[
              { event: 'job.completed', desc: 'All pipeline steps finished' },
              { event: 'clip.rendered', desc: 'A single clip finished rendering' },
              { event: 'post.published', desc: 'Scheduled post went live on platform' },
              { event: 'post.failed', desc: 'Scheduled post failed after all retries' },
            ].map((wh) => (
              <div key={wh.event} className="flex items-center gap-3 rounded-lg border border-[#e4e2dd] bg-white px-4 py-3">
                <code className="rounded bg-[#f6f5f2] px-2 py-0.5 font-mono text-xs font-semibold text-[#5046e5]">{wh.event}</code>
                <span className="text-sm text-[#6b6960]">{wh.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Rate Limits */}
        <Section title="Rate Limits">
          <p className="text-sm text-[#6b6960]">
            API requests are rate-limited per key: 60 requests per minute on Pro, 120 on Business.
            Rate limit headers are included in every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.
          </p>
        </Section>
      </div>
    </main>
  );
}

// --- COMPONENTS ---

function Section({
  title,
  method,
  path,
  children,
}: {
  title: string;
  method?: string;
  path?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {method && (
          <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
            method === 'GET' ? 'bg-[#16a34a]/10 text-[#16a34a]'
            : method === 'POST' ? 'bg-[#5046e5]/10 text-[#5046e5]'
            : method === 'PATCH' ? 'bg-[#d97706]/10 text-[#d97706]'
            : method === 'DELETE' ? 'bg-[#dc2626]/10 text-[#dc2626]'
            : 'bg-[#6b6960]/10 text-[#6b6960]'
          }`}>
            {method}
          </span>
        )}
        {path && (
          <code className="font-mono text-sm text-[#6b6960]">{path}</code>
        )}
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mb-4 overflow-x-auto rounded-xl border border-[#e4e2dd] bg-[#1a1a1a] p-4 text-[13px] leading-relaxed text-[#e8e8ef]">
      <code>{children}</code>
    </pre>
  );
}

function ResponseBlock({ children }: { children: string }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#a09e96]">Response</div>
      <pre className="overflow-x-auto rounded-xl border border-[#e4e2dd] bg-white p-4 text-[13px] leading-relaxed text-[#1a1a1a]">
        <code>{children}</code>
      </pre>
    </div>
  );
}
