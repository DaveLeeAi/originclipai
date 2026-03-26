// src/components/layout/marketing-nav.tsx
//
// Marketing navbar with auth-aware buttons.
// Server Component — reads session on the server.

import Link from 'next/link';
import { getUser } from '@/lib/auth/server';

export async function MarketingNav() {
  const user = await getUser();

  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.08] bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1] shadow-md shadow-[var(--accent-primary)]/20">
            <span className="text-sm font-extrabold text-white">O</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0F172A]">
            OriginClip<span className="text-[#6366F1]">AI</span>
          </span>
        </div>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#64748B] md:flex">
          <a href="#how-it-works" className="hover:text-[#0F172A]">How it works</a>
          <a href="#features" className="hover:text-[#0F172A]">Features</a>
          <a href="#pricing" className="hover:text-[#0F172A]">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#6366F1] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:shadow-xl"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A]">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl bg-[#6366F1] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:shadow-xl"
              >
                Try free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
