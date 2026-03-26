export default function JobLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-lg bg-[var(--accent-primary)]/10" />
        <p className="text-sm text-[var(--text-tertiary)]">Loading job...</p>
      </div>
    </div>
  );
}
