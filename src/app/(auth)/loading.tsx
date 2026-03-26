// src/app/(auth)/loading.tsx

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-lg bg-[var(--accent-primary)]/10" />
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      </div>
    </div>
  );
}
