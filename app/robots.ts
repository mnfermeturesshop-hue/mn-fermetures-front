import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mnfermetures.com';

// Zones privées jamais indexées (compte, tunnels, documents client).
const DISALLOW = ['/checkout', '/commande/', '/compte', '/devis', '/panier'];

// Crawlers IA explicitement autorisés (visibilité GEO/AEO : ChatGPT, Claude,
// Perplexity, Gemini/Google-Extended, Apple Intelligence, Common Crawl…).
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_BOTS.map((bot) => ({ userAgent: bot, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
