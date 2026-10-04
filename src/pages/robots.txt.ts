import { site } from '../config/site';

export const prerender = true;

export function GET() {
  const directive = site.seo.indexable ? 'Allow: /' : 'Disallow: /';
  const sitemap = new URL('/sitemap.xml', site.url).toString();
  const body = `User-agent: *\n${directive}\nSitemap: ${sitemap}\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
