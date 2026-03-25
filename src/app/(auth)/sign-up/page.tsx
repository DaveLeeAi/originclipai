// src/app/(auth)/sign-up/page.tsx
'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5f2] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16a34a]/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold">Check your email</h1>
          <p className="mb-6 text-sm text-[#6b6960]">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <Link href="/sign-in" className="text-sm font-semibold text-[#5046e5] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f2] px-4">
      <div className="w-full max-w-sm">
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
          <h1 className="mb-1 text-xl font-bold tracking-tight">Create your account</h1>
          <p className="mb-6 text-sm text-[#6b6960]">
            30 free minutes per month. No credit card required.
          </p>

          <button
            onClick={handleGoogleSignUp}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] shadow-sm transition hover:shadow-md"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e4e2dd]" />
            <span className="text-xs text-[#a09e96]">or</span>
            <div className="h-px flex-1 bg-[#e4e2dd]" />
          </div>

          <form onSubmit={handleSignUp}>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-[#6b6960]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#e4e2dd] px-4 py-2.5 text-sm outline-none focus:border-[#5046e5]/40"
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-5">
              <label className="mb-1 block text-xs font-semibold text-[#6b6960]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-[#e4e2dd] px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#5046e5]/40"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a09e96] hover:text-[#6b6960] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
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
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-[#a09e96]">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-[#6b6960]">
          Already have an account?{' '}
          <Link href={`/sign-in?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-[#5046e5] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
