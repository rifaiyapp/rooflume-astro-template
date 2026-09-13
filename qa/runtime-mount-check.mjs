import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../publishing/asset-router.mjs';
const mounts = ['/rooflume/', '/roofing/', '/rooflume/hd/', '/lp/roofing-01/', '/templates/service/roofing/'];
const router = { fetch: (request, env) => worker.fetch(request, { RUNTIME_MOUNT_PATHS: mounts, ...env }) };

const origin = 'https://roofing.example.test';

for (const path of ['/unknown', '/unknown/', '/rooflume/dd', '/rooflume/dd/', '/rooflume/random/', '/rooflume/random/path/', '/rooflume/foo/bar/', '/lp/roofing-01/test/', '/lp/roofing-01/random/path/', '/rooflume-other/', '/rooflume/dd/thank-you/', '/rooflume/dd/assets/roof.webp']) {
  test(`GET/HEAD ${path} returns a real 404 without fallback or redirect`, async () => {
    for (const method of ['GET', 'HEAD']) {
      const seen = [];
      const response = await router.fetch(new Request(origin + path, { method }), { ASSETS: assets(seen) });
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex,nofollow,noarchive,nosnippet');
      assert.ok(seen.every(call => call.path !== '/'));
      const body = await response.text();
      if (method === 'HEAD') assert.equal(body, '');
      else assert.match(body, /404.*Page not found/);
    }
  });
}

test('unknown API suffixes do not reach the Service Binding', async () => {
  for (const path of ['/rooflume/dd/api/lead', '/unregistered/api/lead', '/lp/roofing-01/test/api/lead']) {
    const response = await router.fetch(new Request(origin + path, { method: 'POST', body: '{}' }), {
      ASSETS: { fetch() { assert.fail('Unknown POST must not fetch assets'); } },
      LEAD_GATEWAY: { fetch() { assert.fail('Unknown API must not reach gateway'); } },
    });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
  }
});

test('binding fallback redirects for unknown paths become 404s', async () => {
  for (const location of ['/', origin + '/', 'https://other.example.test/']) {
    const response = await router.fetch(new Request(origin + '/rooflume/dd/'), {
      ASSETS: { fetch: () => new Response(null, { status: 301, headers: { location } }) },
    });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
  }
});

test('a static custom 404 page is preserved with mounted assets and security headers', async () => {
  const response = await router.fetch(new Request(origin + '/rooflume/missing/'), {
    ASSETS: { fetch: () => new Response('<h1>Custom 404</h1><img src="/assets/roof.webp">', {
      status: 404, headers: { 'content-type': 'text/html', location: '/', 'cache-control': 'immutable' },
    }) },
  });
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Custom 404.*src="\/rooflume\/assets\/roof.webp"/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('runtime mounts are explicit, arbitrary, and change without rebuilding', async () => {
  for (const prefix of ['/campaign.v2', '/some/arbitrary/deep/path']) {
    const input = new Request(origin + prefix + '/');
    assert.equal((await worker.fetch(input, { ASSETS: assets() })).status, 404);
    const env = { ASSETS: assets(), RUNTIME_MOUNT_PATHS: JSON.stringify([prefix]) };
    assert.equal((await worker.fetch(input, env)).status, 200);
    assert.equal((await worker.fetch(new Request(origin + '/'), env)).status, 200);
    assert.equal((await worker.fetch(new Request(origin + prefix + '/child/'), env)).status, 404);
  }
});

test('invalid runtime mount configuration fails closed', async () => {
  for (const value of ['', 'invalid', '{}', [null], ['//other'], ['/a/../b'], ['/a?query'], ['/api/lead/'], ['/thank-you/'], ['/a%2fb/']]) {
    const response = await worker.fetch(new Request(origin + '/'), {
      RUNTIME_MOUNT_PATHS: value, ASSETS: { fetch() { assert.fail('Invalid configuration must not serve'); } },
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
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

for (const prefix of ['/rooflume', '/lp/roofing-01', '/templates/service/roofing']) {
  test(`GET/HEAD ${prefix} canonicalizes before asset redirects and retains host/query`, async () => {
    for (const host of [origin, 'https://worker.example.workers.dev']) {
      for (const method of ['GET', 'HEAD']) {
        for (const query of ['', '?source=test&next=%2Felsewhere%2F']) {
          const input = new Request(host + prefix + query, { method });
          const response = await router.fetch(input, { ASSETS: { fetch() {
            assert.fail('Mount canonicalization must happen before the asset binding');
          } } });
          assert.equal(response.status, 308);
          assert.equal(response.headers.get('location'), prefix + '/' + query);
          assert.equal(new URL(response.headers.get('location'), input.url).origin, host);
          assert.equal(await response.text(), '');
          assert.equal(response.headers.get('x-robots-tag'), 'noindex,nofollow,noarchive,nosnippet');
          assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
          assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'self'/);
          assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
        }
      }
    }
  });
}

test('legitimate root and static file redirects retain their behavior', async () => {
  for (const path of ['/', '/index.html', '/thank-you']) {
    const target = path === '/thank-you' ? '/thank-you/' : '/';
    const response = await router.fetch(new Request(origin + path), {
      ASSETS: { fetch: () => new Response(null, { status: 301, headers: { location: target } }) },
    });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), target);
  }
});

for (const prefix of ['', '/rooflume', '/roofing', '/rooflume/hd', '/lp/roofing-01', '/templates/service/roofing']) {
  for (const suffix of ['/', ...(prefix ? ['/thank-you'] : []), '/thank-you/']) {
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
  assert.equal(postCalls.length, 0);
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
