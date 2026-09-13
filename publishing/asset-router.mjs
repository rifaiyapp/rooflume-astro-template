import { resolveRuntimeMount } from "../src/utils/runtime-mount.mjs";

const REVALIDATE = "public, max-age=0, must-revalidate";
const MAX_LEAD_BYTES = 32 * 1024;
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex,nofollow,noarchive,nosnippet",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
};

function leadResponse(status, success = false, extraHeaders = {}) {
  return Response.json(success ? { success: true } : {
    success: false,
    message: "We couldn't send your request. Please try again.",
  }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

// Count actual streamed bytes as Content-Length can be absent or inaccurate.
async function readLeadBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_LEAD_BYTES) {
    throw new RangeError();
  }
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_LEAD_BYTES) {
        await reader.cancel();
        throw new RangeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const payload = JSON.parse(body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new SyntaxError();
  return body;
}

async function submitLead(request, env, url) {
  if (request.method !== "POST") return leadResponse(405, false, { Allow: "POST" });
  const fetchSite = request.headers.get("sec-fetch-site");
  if (request.headers.get("origin") !== url.origin || (fetchSite && fetchSite !== "same-origin")) {
    return leadResponse(403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return leadResponse(415);
  }
  let body;
  try {
    body = await readLeadBody(request);
  } catch (error) {
    return leadResponse(error instanceof RangeError ? 413 : 400);
  }
  if (typeof env.LEAD_GATEWAY?.fetch !== "function") return leadResponse(503);

  try {
    const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
    // Preserve browser context and Cloudflare's client IP for gateway spam checks.
    // Do not forward cookies, authorization or client-supplied forwarding headers.
    for (const name of ["origin", "referer", "user-agent", "cf-connecting-ip"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await env.LEAD_GATEWAY.fetch(new Request("https://lead-service.internal/v1/submit", {
      method: "POST", headers, body, redirect: "manual",
    }));
    // Never relay gateway bodies, redirects or headers to the browser.
    if (!response.ok) {
      await response.body?.cancel();
      return leadResponse(response.status === 429 ? 429 : 502);
    }
    const result = JSON.parse(await readLeadBody(response));
    return result.success === true ? leadResponse(200, true) : leadResponse(502);
  } catch {
    return leadResponse(502);
  }
}

// Cloudflare does not expose the matched route prefix. A runtime allowlist is
// required to distinguish a mount from an unknown child of that mount.
function runtimeMounts(value) {
  if (value === undefined) return ['/'];
  const paths = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(paths)) throw new TypeError('Invalid runtime mounts');
  const mounts = paths.map(path => {
    if (typeof path !== 'string' || !path.startsWith('/') || /[?#\\\s]|\/\/|%2f|%5c/i.test(path) ||
        new URL(path, 'https://mount.invalid').pathname !== path) {
      throw new TypeError('Invalid runtime mount');
    }
    const base = resolveRuntimeMount(path);
    if (base !== path.replace(/\/?$/, '/')) throw new TypeError('Reserved runtime mount');
    return base;
  });
  return [...new Set(['/', ...mounts])].sort((a, b) => b.length - a.length);
}

async function notFound(request, response, prefix = '') {
  // ASSETS supplies a custom static 404 page when one exists. Otherwise use a
  // small self-contained response; never interpolate the untrusted pathname.
  const custom = response?.status === 404 && response.headers.get('content-type')?.includes('text/html');
  const headers = new Headers(custom ? response.headers : undefined);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  for (const name of ['location', 'content-length', 'etag']) headers.delete(name);
  let body;
  if (custom) body = prefixLocalAssets(await response.text(), prefix);
  else {
    await response?.body?.cancel();
    body = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title><main><h1>404 ? Page not found</h1><p>The requested page could not be found.</p></main></html>';
  }
  return new Response(request.method === 'HEAD' ? null : body, { status: 404, headers });
}

function withCacheHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  const hashedAsset =
    /^\/_astro\/.+[.-][A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(pathname);

  headers.set(
    "Cache-Control",
    response.status >= 400
      ? "no-store"
      : hashedAsset
        ? "public, max-age=31536000, immutable"
        : REVALIDATE
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fetchAsset(request, env, url) {
  return env.ASSETS.fetch(new Request(new Request(url, request), { redirect: "manual" }));
}

function prefixLocalAssets(text, prefix) {
  if (!prefix) return text;

  return text
    .replaceAll(`"/_astro/`, `"${prefix}/_astro/`)
    .replaceAll(`'/_astro/`, `'${prefix}/_astro/`)
    .replaceAll(` /_astro/`, ` ${prefix}/_astro/`)
    .replaceAll(`(/_astro/`, `(${prefix}/_astro/`)

    .replaceAll(`"/assets/`, `"${prefix}/assets/`)
    .replaceAll(`'/assets/`, `'${prefix}/assets/`)
    .replaceAll(` /assets/`, ` ${prefix}/assets/`)
    .replaceAll(`(/assets/`, `(${prefix}/assets/`)

    .replaceAll(`"/favicon`, `"${prefix}/favicon`)
    .replaceAll(`'/favicon`, `'${prefix}/favicon`)
    .replaceAll(`(/favicon`, `(${prefix}/favicon`);
}

async function rewriteResponse(response, prefix) {
  if (!prefix || response.status !== 200) {
    return response;
  }

  const contentType = response.headers.get("content-type") || "";

  const rewriteable =
    contentType.includes("text/html") ||
    contentType.includes("text/css");

  if (!rewriteable) {
    return response;
  }

  const body = prefixLocalAssets(await response.text(), prefix);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const originalUrl = new URL(request.url);
    let mounts;
    try { mounts = runtimeMounts(env.RUNTIME_MOUNT_PATHS); }
    catch {
      return new Response('Service unavailable', { status: 503, headers: { ...SECURITY_HEADERS, 'Cache-Control': 'no-store' } });
    }
    const mountBase = mounts.find(base => originalUrl.pathname === base.slice(0, -1) || originalUrl.pathname.startsWith(base));
    const prefix = mountBase.slice(0, -1);
    const pathname = originalUrl.pathname.slice(prefix.length) || '/';

    // Only the exact API route inside a declared mount reaches the gateway.
    if (pathname === '/api/lead') return submitLead(request, env, originalUrl);
    if (request.method !== 'GET' && request.method !== 'HEAD') return notFound(request);

    if (prefix && originalUrl.pathname === prefix) {
      return withCacheHeaders(new Response(null, {
        status: 308,
        headers: { ...SECURITY_HEADERS, Location: mountBase + originalUrl.search },
      }), originalUrl.pathname);
    }

    // Strip one known mount only. ASSETS can then resolve actual files, but no
    // progressively shortened suffix or unknown document can become the LP.
    const assetUrl = new URL(originalUrl);
    assetUrl.pathname = prefix && pathname === '/thank-you' ? '/thank-you/' : pathname;
    let response = await fetchAsset(request, env, assetUrl);
    if (response.status === 404) return notFound(request, response, prefix);

    // Never relay a binding fallback redirect to a mount root for an unknown
    // path. Legitimate file canonical redirects remain within the same mount.
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      let target;
      try { target = location && new URL(location, assetUrl); } catch { /* Invalid redirect. */ }
      if (!target || target.origin !== originalUrl.origin || (target.pathname === '/' && pathname !== '/' && pathname !== '/index.html')) {
        return notFound(request, response);
      }
      const headers = new Headers(response.headers);
      headers.set('Location', prefix + target.pathname + target.search + target.hash);
      response = new Response(response.body, { status: response.status, headers });
    }
    response = await rewriteResponse(response, prefix);
    return withCacheHeaders(response, assetUrl.pathname);
  },
};
