// src/components/layout/marketing-nav.tsx
//
// Marketing navbar with auth-aware buttons.
// Server Component — reads session on the server.

import Link from 'next/link';
import { getUser } from '@/lib/auth/server';

export async function MarketingNav() {
  const user = await getUser();

  return (
    <nav className="sticky top-0 z-50 border-b border-[#e4e2dd] bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5046e5] to-[#7c3aed] shadow-md shadow-indigo-500/30">
            <span className="text-sm font-extrabold text-white">O</span>
          </div>
          <span className="text-lg font-bold tracking-tight">
            OriginClip<span className="text-[#5046e5]">AI</span>
          </span>
        </div>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#6b6960] md:flex">
          <a href="#how-it-works" className="hover:text-[#1a1a1a]">How it works</a>
          <a href="#features" className="hover:text-[#1a1a1a]">Features</a>
          <a href="#pricing" className="hover:text-[#1a1a1a]">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-semibold text-[#6b6960] hover:text-[#1a1a1a]">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg"
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
