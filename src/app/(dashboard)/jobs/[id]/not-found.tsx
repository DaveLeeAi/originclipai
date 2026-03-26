import Link from 'next/link';

export default function JobNotFound() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-bold tracking-tight">Job not found</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This job may have been deleted or the URL is incorrect.
        </p>
        <Link
          href="/"
          className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-bold shadow-sm hover:shadow-md"
        >
          Back to jobs
        </Link>
      </div>
    </div>
  );
}
