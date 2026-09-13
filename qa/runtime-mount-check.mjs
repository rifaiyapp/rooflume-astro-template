import assert from 'node:assert/strict';
import test from 'node:test';
import router from '../publishing/asset-router.mjs';

const origin = 'https://roofing.example.test';
// Model actual file lookup, including Cloudflare's HTML canonical redirect.
const files = new Map([
  ['/', ['text/html', '<img src="/assets/roof.webp"><script src="/_astro/site.abcdefgh.js"></script><link href="/favicon.svg">']],
  ['/thank-you/', ['text/html', '<h1>Thank you</h1><img src="/assets/roof.webp">']],
  ['/assets/roof.webp', ['image/webp', 'image']],
  ['/_astro/site.abcdefgh.js', ['text/javascript', 'export const ready = true;']],
  ['/_astro/site.abcdefgh.css', ['text/css', 'body{background:url(/assets/roof.webp)}']],
  ['/favicon.svg', ['image/svg+xml', '<svg/>']],
  ['/robots.txt', ['text/plain', 'User-agent: *']],
  ['/downloads/guide.pdf', ['application/pdf', 'pdf']],
]);
function assets(seen = []) {
  return { fetch(input) {
    const url = new URL(input.url);
    seen.push({ path: url.pathname, search: url.search, method: input.method });
    if (url.pathname === '/thank-you') return Response.redirect(origin + '/thank-you/', 307);
    const file = files.get(url.pathname);
    return new Response(input.method === 'HEAD' ? null : file?.[1] || 'Not found', {
      status: file ? 200 : 404,
      headers: {
        'content-type': file?.[0] || 'text/plain',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex,nofollow,noarchive,nosnippet',
        'content-security-policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
        etag: '"original"',
      },
    });
  } };
}
for (const prefix of ['', '/rooflume', '/roofing', '/rooflume/hd', '/lp/roofing-01', '/templates/service/roofing']) {
  for (const suffix of ['/', ...(prefix ? ['', '/thank-you'] : []), '/thank-you/']) {
    const path = prefix + suffix;
    test(`GET ${path} serves the correct page without redirecting`, async () => {
      const seen = [];
      const input = new Request(origin + path + '?source=test');
      const response = await router.fetch(input, { ASSETS: assets(seen) });
      const canonical = suffix.startsWith('/thank-you') ? '/thank-you/' : '/';
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('location'), null);
      assert.equal(input.url, origin + path + '?source=test');
      assert.equal(seen.at(-1).path, canonical);
      assert.ok(seen.every(call => call.search === '?source=test' && call.method === 'GET'));
      const body = await response.text();
      assert.equal(body.includes('<h1>Thank you</h1>'), canonical === '/thank-you/');
      assert.ok(body.includes(`src="${prefix}/assets/roof.webp"`));
      if (canonical === '/') {
        assert.ok(body.includes(`src="${prefix}/_astro/site.abcdefgh.js"`));
        assert.ok(body.includes(`href="${prefix}/favicon.svg"`));
      }
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex,nofollow,noarchive,nosnippet');
      assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'self'/);
      assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
      if (prefix) assert.equal(response.headers.get('etag'), null);
    });
  }
  test(`static files and missing assets remain correct at ${prefix || '/'}`, async () => {
    for (const [path, [type, content]] of files) {
      if (type === 'text/html') continue;
      const seen = [];
      const response = await router.fetch(new Request(origin + prefix + path), { ASSETS: assets(seen) });
      assert.equal(response.status, 200);
      assert.equal(seen.at(-1).path, path);
      assert.equal(response.headers.get('content-type'), type);
      assert.equal(await response.text(), type === 'text/css' ? content.replace('/assets/', prefix + '/assets/') : content);
      assert.equal(response.headers.get('cache-control'), path.startsWith('/_astro/')
        ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    }
    for (const path of ['/assets/missing.webp', '/assets/missing', '/_astro/missing.abcdefgh.js', '/favicon-missing.svg', '/downloads/missing.pdf', '/api/unknown']) {
      const seen = [];
      const response = await router.fetch(new Request(origin + prefix + path), { ASSETS: assets(seen) });
      assert.equal(response.status, 404, prefix + path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok(seen.every(call => call.path !== '/'), 'Missing files must not become the LP');
    }
  });
}

test('root assets take priority; HEAD and non-GET semantics are preserved', async () => {
  const seen = [];
  const response = await router.fetch(new Request(origin + '/rooflume/', { method: 'HEAD' }), { ASSETS: assets(seen) });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.ok(seen.every(call => call.method === 'HEAD'));
  const calls = [];
  const exact = await router.fetch(new Request(origin + '/downloads/guide.pdf'), { ASSETS: assets(calls) });
  assert.equal(exact.status, 200);
  assert.equal(calls.length, 1);
  const postCalls = [];
  const post = await router.fetch(new Request(origin + '/rooflume/', { method: 'POST' }), { ASSETS: assets(postCalls) });
  assert.equal(post.status, 404);
  assert.equal(postCalls.length, 1);
});

for (const prefix of ['/rooflume', '/lp/roofing-01', '/templates/service/roofing']) {
  test(`nested API security checks fail closed at ${prefix}`, async () => {
    for (const [status, options, binding] of [
      [405, { method: 'GET', body: undefined }],
      [403, { headers: { origin: 'https://other.example.test' } }],
      [415, { headers: { 'content-type': 'text/plain' } }],
      [400, { body: '{invalid' }],
      [413, { body: JSON.stringify({ data: 'x'.repeat(32768) }) }],
      [503, {}, {}],
      [502, {}, { fetch: () => Response.redirect('https://other.example.test') }],
    ]) {
      const input = new Request(origin + prefix + '/api/lead', {
        method: 'POST', body: '{}', ...options,
        headers: { origin, 'content-type': 'application/json', ...options.headers },
      });
      const response = await router.fetch(input, {
        ASSETS: { fetch() { assert.fail('API must not reach assets'); } },
        LEAD_GATEWAY: binding ?? { fetch() { assert.fail('Rejected request must not reach binding'); } },
      });
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { success: false, message: "We couldn't send your request. Please try again." });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
  });
}
