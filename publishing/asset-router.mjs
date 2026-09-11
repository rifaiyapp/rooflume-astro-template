const REVALIDATE = "public, max-age=0, must-revalidate";

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