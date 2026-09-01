import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const report = {};
const baseURL = process.argv[2] ?? 'http://127.0.0.1:4321/';

const setups = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const setup of setups) {
  const context = await browser.newContext({
    viewport: { width: setup.width, height: setup.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.addInitScript(() => {
    window.__qaVitals = { cls: 0, lcp: 0, eventDuration: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__qaVitals.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1];
      if (latest) window.__qaVitals.lcp = latest.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId && entry.duration > window.__qaVitals.eventDuration) window.__qaVitals.eventDuration = entry.duration;
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch {}
  });

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const initialPerformance = await page.evaluate(() => ({
    lcp: window.__qaVitals.lcp,
    navigation: (() => {
      const entry = performance.getEntriesByType('navigation')[0];
      return entry ? { domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd } : null;
    })(),
  }));

  const initial = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const sections = [...document.querySelectorAll('main > section')].map((section) => ({
      id: section.id,
      className: section.className,
      heading: section.querySelector('h1, h2')?.textContent?.trim().replace(/\s+/g, ' '),
    }));
    const h1s = [...document.querySelectorAll('h1')].map((heading) => heading.textContent?.trim().replace(/\s+/g, ' '));
    const headingSequence = [...document.querySelectorAll('h1, h2, h3')].map((heading) => ({ level: Number(heading.tagName[1]), text: heading.textContent?.trim().replace(/\s+/g, ' ') }));
    const links = [...document.querySelectorAll('a[href]')];
    const hashLinks = links.filter((link) => (link.getAttribute('href')?.length || 0) > 1 && link.getAttribute('href')?.startsWith('#')).map((link) => ({
      text: link.textContent?.trim().replace(/\s+/g, ' '),
      href: link.getAttribute('href'),
      targetExists: Boolean(document.querySelector(link.getAttribute('href'))),
    }));
    const phoneLinks = links.filter((link) => link.getAttribute('href')?.startsWith('tel:')).map((link) => link.getAttribute('href'));
    const primaryEstimateLinks = [...document.querySelectorAll('.header-cta, .hero-actions .button, .service-card a, #emergency-repairs .button, #roof-check .button')].map((link) => ({ text: link.textContent?.trim().replace(/\s+/g, ' '), href: link.getAttribute('href') }));
    const images = [...document.images].map((image) => ({
      src: image.getAttribute('src'),
      alt: image.getAttribute('alt'),
      width: image.getAttribute('width'),
      height: image.getAttribute('height'),
      loading: image.getAttribute('loading'),
    }));
    return {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      sections,
      h1s,
      headingSequence,
      duplicateIds: [...new Set(duplicates)],
      hashLinks,
      phoneLinks,
      primaryEstimateLinks,
      images,
      heroPreload: Boolean(document.querySelector('link[rel="preload"][as="image"][href="/assets/hero-roofing.png"]')),
    };
  });

  if (setup.name === 'mobile') {
    await page.locator('.menu-toggle').click();
    initial.mobileMenu = {
      expanded: await page.locator('.menu-toggle').getAttribute('aria-expanded'),
      visible: await page.locator('#site-nav').isVisible(),
    };
    await page.locator('.menu-toggle').click();
  }

  const anchorResults = [];
  for (const href of ['#services', '#process', '#areas', '#reviews', '#about', '#faq', '#callback']) {
    await page.evaluate((target) => document.querySelector(`a[href="${target}"]`)?.click(), href);
    await page.waitForTimeout(30);
    anchorResults.push({ href, hash: await page.evaluate(() => location.hash) });
  }

  const telResults = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map((link) => ({
    href: link.getAttribute('href'),
    valid: /^tel:\+?[0-9]+$/.test(link.getAttribute('href') || ''),
  })));

  const firstFaq = page.locator('.faq-question').first();
  const secondFaq = page.locator('.faq-question').nth(1);
  const faqBefore = await firstFaq.getAttribute('aria-expanded');
  await secondFaq.click();
  const faqAfter = {
    first: await firstFaq.getAttribute('aria-expanded'),
    second: await secondFaq.getAttribute('aria-expanded'),
    secondAnswerHidden: await page.locator('#faq-answer-1').getAttribute('hidden'),
  };
  await secondFaq.press('ArrowDown');
  const faqKeyboardFocus = await page.evaluate(() => document.activeElement?.id);

  const reviewBefore = await page.locator('.testimonial-card.active').getAttribute('data-review');
  await page.locator('.review-arrow.next').click();
  const reviewAfter = await page.locator('.testimonial-card.active').getAttribute('data-review');

  await page.locator('#name').fill('Taylor Reed');
  await page.locator('#phone').fill('(555) 123-4567');
  await page.locator('#email').fill('taylor@example.com');
  await page.locator('#zip').fill('12345');
  await page.locator('#message').fill('I would like a roof inspection.');
  await page.locator('.callback-card button[type="submit"]').click();
  const callbackStatus = await page.locator('.form-status').textContent();

  await page.locator('#newsletter-email').fill('taylor@example.com');
  await page.locator('.newsletter button[type="submit"]').click();
  const newsletterStatus = await page.locator('.newsletter-status').textContent();

  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < documentHeight; y += Math.max(500, Math.floor(setup.height * 0.75))) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  const imageResults = await page.evaluate(() => [...document.images].map((image) => ({
    src: image.currentSrc || image.src,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    renderedWidth: Math.round(image.getBoundingClientRect().width),
    renderedHeight: Math.round(image.getBoundingClientRect().height),
  })));

  // Return the page to its approved default state before taking comparison screenshots.
  if ((await firstFaq.getAttribute('aria-expanded')) !== 'true') await firstFaq.click();
  if ((await page.locator('.testimonial-card.active').getAttribute('data-review')) !== '0') {
    await page.locator('.review-arrow.prev').click();
  }
  await page.evaluate(() => {
    document.querySelector('.callback-card form')?.reset();
    document.querySelector('.newsletter form')?.reset();
    const callbackStatusElement = document.querySelector('.form-status');
    const newsletterStatusElement = document.querySelector('.newsletter-status');
    if (callbackStatusElement) callbackStatusElement.textContent = '';
    if (newsletterStatusElement) newsletterStatusElement.textContent = '';
    history.replaceState(null, '', location.pathname);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);

  const finalMetrics = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    vitals: window.__qaVitals,
    navTiming: (() => {
      const entry = performance.getEntriesByType('navigation')[0];
      return entry ? { domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd } : null;
    })(),
  }));
  finalMetrics.vitals.lcp = initialPerformance.lcp;
  finalMetrics.initialNavigation = initialPerformance.navigation;

  await page.screenshot({ path: `qa/reorder-${setup.name}-after.png`, fullPage: true });

  report[setup.name] = {
    baseURL,
    ...initial,
    anchorResults,
    telResults,
    faq: { before: faqBefore, after: faqAfter, keyboardFocus: faqKeyboardFocus },
    testimonials: { before: reviewBefore, after: reviewAfter },
    callbackStatus,
    newsletterStatus,
    imageResults,
    ...finalMetrics,
    consoleErrors,
  };

  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
