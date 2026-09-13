const REVALIDATE = "public, max-age=0, must-revalidate";
const MAX_LEAD_BYTES = 32 * 1024;

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

function* mountedAssets(pathname) {
  // Cloudflare does not pass the matched route prefix to the Worker. Recognize
  // reserved suffixes first, then try static file suffixes at segment boundaries.
  // Missing files/API paths must never fall through to the landing page.
  const reserved = /\/(?:_astro|assets|api)(?:\/|$)/.exec(pathname);
  if (reserved) {
    if (reserved.index > 0) {
      yield { prefix: pathname.slice(0, reserved.index), pathname: pathname.slice(reserved.index) };
    }
    return;
  }
  const thankYou = /\/thank-you\/?$/.exec(pathname);
  if (thankYou) {
    if (thankYou.index > 0) {
      yield { prefix: pathname.slice(0, thankYou.index), pathname: "/thank-you/" };
    }
    return;
  }
  for (let slash = pathname.indexOf("/", 1); slash !== -1; slash = pathname.indexOf("/", slash + 1)) {
    if (slash < pathname.length - 1) {
      yield { prefix: pathname.slice(0, slash), pathname: pathname.slice(slash) };
    }
  }
  // An otherwise unknown extensionless document path is a runtime mount root.
  // This supports any mount depth without build-time domain or route settings.
  const prefix = pathname.replace(/\/$/, "");
  if (prefix && !prefix.split("/").at(-1).includes(".")) {
    yield { prefix, pathname: "/" };
  }
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

function isRootAssetRedirect(response, url) {
  if (![301, 302, 303, 307, 308].includes(response.status)) return false;
  const location = response.headers.get("location");
  if (!location) return false;
  try {
    const target = new URL(location, url);
    return target.origin === url.origin && target.pathname === "/";
  } catch {
    return false;
  }
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

    // Dispatch before ASSETS so every mount uses the same fail-closed handler.
    if (/\/api\/lead$/.test(originalUrl.pathname)) {
      return submitLead(request, env, originalUrl);
    }

    // Normal root deployment first.
    let response = await fetchAsset(request, env, originalUrl);

    // The asset binding may canonicalize an unknown extensionless path to /.
    // Resolve that mount against the root asset internally instead of letting
    // its Location header take the browser outside the Worker's route.
    if ((request.method === "GET" || request.method === "HEAD") && isRootAssetRedirect(response, originalUrl)) {
      const mount = [...mountedAssets(originalUrl.pathname)].find(asset => asset.pathname === "/");
      if (mount) {
        const rootUrl = new URL(originalUrl);
        rootUrl.pathname = "/";
        await response.body?.cancel();
        response = await rewriteResponse(await fetchAsset(request, env, rootUrl), mount.prefix);
        return withCacheHeaders(response, "/");
      }
    }

    if (response.status !== 404) {
      return withCacheHeaders(response, originalUrl.pathname);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      for (const mount of mountedAssets(originalUrl.pathname)) {
        const rewrittenUrl = new URL(originalUrl);
        rewrittenUrl.pathname = mount.pathname;
        const candidate = await fetchAsset(request, env, rewrittenUrl);
        if (candidate.status === 404) {
          await candidate.body?.cancel();
          continue;
        }
        await response.body?.cancel();
        response = await rewriteResponse(candidate, mount.prefix);
        return withCacheHeaders(response, mount.pathname);
      }
    }
    return withCacheHeaders(response, originalUrl.pathname);
  },
};
