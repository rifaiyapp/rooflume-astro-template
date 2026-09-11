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

async function rewriteHtml(response, prefix) {
  if (!prefix || response.status !== 200) {
    return response;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  html = html
    .replaceAll('href="/_astro/', `href="${prefix}/_astro/`)
    .replaceAll('src="/_astro/', `src="${prefix}/_astro/`)
    .replaceAll('href="/assets/', `href="${prefix}/assets/`)
    .replaceAll('src="/assets/', `src="${prefix}/assets/`)
    .replaceAll('srcset="/assets/', `srcset="${prefix}/assets/`)
    .replaceAll('href="/favicon', `href="${prefix}/favicon`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const originalUrl = new URL(request.url);

    // First try the exact request. This preserves normal root deployments.
    let response = await fetchAsset(request, env, originalUrl);

    if (response.status !== 404) {
      return withCacheHeaders(response, originalUrl.pathname);
    }

    const prefix = getPrefix(originalUrl.pathname);

    if (!prefix) {
      return withCacheHeaders(response, originalUrl.pathname);
    }

    // Nested deployment:
    // /lp/roofing-01/           -> /
    // /lp/roofing-01/_astro/x  -> /_astro/x
    // /lp/roofing-01/assets/x  -> /assets/x
    const rewrittenUrl = new URL(originalUrl);
    rewrittenUrl.pathname = stripPrefix(originalUrl.pathname);

    response = await fetchAsset(request, env, rewrittenUrl);

    // When serving HTML from a nested route, rewrite root-relative
    // asset URLs so subsequent browser requests stay under that route.
    response = await rewriteHtml(response, prefix);

    return withCacheHeaders(response, rewrittenUrl.pathname);
  },
};