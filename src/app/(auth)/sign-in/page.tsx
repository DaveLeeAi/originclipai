// src/app/(auth)/sign-in/page.tsx
'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = redirect;
  };

  const handleGoogleLogin = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
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
          <h1 className="mb-1 text-xl font-bold tracking-tight">Sign in</h1>
          <p className="mb-6 text-sm text-muted-foreground">Welcome back to OriginClipAI</p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:shadow-md"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-default)]" />
            <span className="text-xs text-[var(--text-tertiary)]">or</span>
            <div className="h-px flex-1 bg-[var(--border-default)]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin}>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-primary)]/40"
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent-primary)]/40"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-muted-foreground transition-colors"
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
            <div className="mb-5 text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
              >
                Forgot password?
              </Link>
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href={`/sign-up?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-[var(--accent-primary)] hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
