const REVALIDATE = "public, max-age=0, must-revalidate";

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

export default {
  async fetch(request, env) {
    const originalUrl = new URL(request.url);

    // Root deployments work normally.
    let response = await fetchAsset(request, env, originalUrl);

    if (response.status !== 404) {
      return withCacheHeaders(response, originalUrl.pathname);
    }

    /*
     * Portable nested deployment support.
     *
     * Example:
     * /lp/roofing-01/          -> /
     * /lp/roofing-01/foo      -> /foo
     *
     * Root/custom-domain deployments are unaffected because
     * the original request is always attempted first.
     */
    const segments = originalUrl.pathname.split("/").filter(Boolean);

    if (segments.length >= 2) {
      const rewrittenUrl = new URL(originalUrl);

      const remaining = segments.slice(2).join("/");
      rewrittenUrl.pathname = remaining ? `/${remaining}` : "/";

      response = await fetchAsset(request, env, rewrittenUrl);
    }

    return withCacheHeaders(response, originalUrl.pathname);
  },
};