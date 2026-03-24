'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Sign in failed');
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f2] p-6">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5046e5] to-[#7c3aed] shadow-sm shadow-indigo-500/25">
            <span className="text-sm font-extrabold text-white">O</span>
          </div>
          <span className="text-[17px] font-bold tracking-tight">
            OriginClip<span className="text-[#5046e5]">AI</span>
          </span>
        </div>

        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold tracking-tight">Sign in</h1>
          <p className="mb-6 text-sm text-[#6b6960]">
            Welcome back. Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-xs font-semibold text-[#6b6960]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a09e96] focus:border-[#5046e5]/40"
              placeholder="you@example.com"
              required
            />

            <label className="mb-1 block text-xs font-semibold text-[#6b6960]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a09e96] focus:border-[#5046e5]/40"
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="mb-4 rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/[0.04] px-4 py-3 text-sm text-[#dc2626]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="md"
              className="w-full justify-center"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-[#6b6960]">
          No account?{' '}
          <Link href="/sign-up" className="font-semibold text-[#5046e5] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
