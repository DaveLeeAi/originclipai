// src/app/(marketing)/layout.tsx
//
// Shared layout for all public marketing pages.
// Wraps pages with MarketingNav + footer.

import { MarketingNav } from '@/components/layout/marketing-nav';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-black/[0.08] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-[#94A3B8]">
          <span>&copy; {new Date().getFullYear()} OriginClipAI</span>
          <div className="flex gap-6">
            <a href="/pricing" className="hover:text-[#64748B]">Pricing</a>
            <a href="/blog" className="hover:text-[#64748B]">Blog</a>
            <a href="/docs" className="hover:text-[#64748B]">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
