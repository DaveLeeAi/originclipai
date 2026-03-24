// src/app/robots.ts

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://originclipai.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/settings/',
          '/jobs/',
          '/new',
          '/schedule',
          '/templates',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
