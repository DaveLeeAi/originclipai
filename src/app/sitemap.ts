// src/app/sitemap.ts

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://originclipai.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: BASE_URL, changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/docs`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/sign-up`, changeFrequency: 'monthly' as const, priority: 0.6 },
  ];

  const comparisonPages = ['opus-clip', 'vizard', 'descript'].map((slug) => ({
    url: `${BASE_URL}/compare/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // In production, blog posts would be fetched from CMS/MDX
  const blogPosts = [
    'repurpose-youtube-video-guide',
    'ai-content-repurposing-2026',
    'why-ai-clips-need-human-review',
    'podcast-to-linkedin-x-newsletter',
    'opus-clip-vs-originclipai',
    'repurpose-blog-post-into-video',
  ].map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...comparisonPages,
    ...blogPosts,
  ].map((page) => ({
    ...page,
    lastModified: new Date(),
  }));
}
