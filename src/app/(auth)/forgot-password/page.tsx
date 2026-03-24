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
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f2] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5046e5] to-[#7c3aed] shadow-md shadow-indigo-500/30">
              <span className="text-sm font-extrabold text-white">O</span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              OriginClip<span className="text-[#5046e5]">AI</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-7 shadow-sm">
          <h1 className="mb-1 text-xl font-bold tracking-tight">Reset password</h1>
          <p className="mb-6 text-sm text-[#6b6960]">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="rounded-lg border border-[#34A853]/20 bg-[#34A853]/[0.04] px-4 py-3 text-sm text-[#1a6b2d]">
              <p className="font-semibold">Check your email</p>
              <p className="mt-1 text-xs text-[#6b6960]">
                We sent a password reset link to <span className="font-medium text-[#1a1a1a]">{email}</span>. It may take a minute to arrive.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="mb-1 block text-xs font-semibold text-[#6b6960]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#e4e2dd] px-4 py-2.5 text-sm outline-none focus:border-[#5046e5]/40"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/[0.04] px-3 py-2 text-xs text-[#dc2626]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-[#6b6960]">
          <Link href="/sign-in" className="font-semibold text-[#5046e5] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
