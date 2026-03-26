// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] shadow-md shadow-[var(--accent-primary)]/20">
              <span className="text-sm font-extrabold text-white">O</span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              OriginClip<span className="text-[var(--accent-primary)]">AI</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
          <h1 className="mb-1 text-xl font-bold tracking-tight">Reset password</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="rounded-lg border border-[#34A853]/20 bg-[#34A853]/[0.04] px-4 py-3 text-sm text-[#1a6b2d]">
              <p className="font-semibold">Check your email</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>. It may take a minute to arrive.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-primary)]/40"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/[0.04] px-3 py-2 text-xs text-[var(--error)]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--accent-primary)]/20 transition hover:shadow-lg disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="font-semibold text-[var(--accent-primary)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
