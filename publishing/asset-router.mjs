import project from "../project.config.json" with { type: "json" };

const REVALIDATE = "public, max-age=0, must-revalidate";
const MAX_LEAD_BYTES = 32 * 1024;
const configuredLeadPath = `${(project.deployment?.basePath || "/").replace(/\/$/, "")}/api/lead`;

function leadResponse(status, success = false, extraHeaders = {}) {
  return Response.json(success ? { success: true } : {
    success: false,
    message: "We couldn't send your request. Please try again.",
  }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex,nofollow,noarchive,nosnippet",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'none'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
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

function getPrefix(pathname) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    return "";
  }

  return `/${parts[0]}/${parts[1]}`;
}

function stripPrefix(pathname) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    return pathname;
  }

  const remaining = parts.slice(2).join("/");

  return remaining ? `/${remaining}` : "/";
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
  return env.ASSETS.fetch(new Request(url, request));
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

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const originalUrl = new URL(request.url);

    // Support the configured build base and the existing two-segment LP alias.
    if (originalUrl.pathname === "/api/lead" || originalUrl.pathname === configuredLeadPath ||
        stripPrefix(originalUrl.pathname) === "/api/lead") {
      return submitLead(request, env, originalUrl);
    }

    // Normal root deployment first.
    let response = await fetchAsset(request, env, originalUrl);

    if (response.status !== 404) {
      return withCacheHeaders(response, originalUrl.pathname);
    }

    const prefix = getPrefix(originalUrl.pathname);

    if (!prefix) {
      return withCacheHeaders(response, originalUrl.pathname);
    }

    // Nested deployment:
    // /lp/example/              -> /
    // /lp/example/_astro/x     -> /_astro/x
    // /lp/example/assets/x     -> /assets/x
    const rewrittenUrl = new URL(originalUrl);
    rewrittenUrl.pathname = stripPrefix(originalUrl.pathname);

    response = await fetchAsset(request, env, rewrittenUrl);
    response = await rewriteResponse(response, prefix);

    return withCacheHeaders(response, rewrittenUrl.pathname);
  },
};
