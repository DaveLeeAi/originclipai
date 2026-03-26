// src/app/not-found.tsx

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-4 text-6xl font-bold text-[var(--border-default)]">404</div>
        <h1 className="mb-2 text-xl font-bold">Page not found</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--accent-primary)]/20"
          >
            Go home
          </Link>
          <Link
            href="/new"
            className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-muted-foreground shadow-sm"
          >
            New job
          </Link>
        </div>
      </div>
    </div>
  );
}
