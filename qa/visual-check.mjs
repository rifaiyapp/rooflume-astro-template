import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const report = {};

for (const setup of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'mobile', width: 390, height: 844 },
]) {
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

  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `qa/implementation-${setup.name}-latest.png`, fullPage: true });

  const metrics = await page.evaluate(() => {
    const selectors = [
      '.hero', '.benefits', '.services', '.emergency-strip:not(.second-cta)',
      '.trust', '.process', '.testimonials', '.fleet-showcase', '.local-banner',
      '.about', '.second-cta', '.service-map', '.site-footer',
    ];
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      sections: Object.fromEntries(selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [selector, null];
        const rect = element.getBoundingClientRect();
        return [selector, { top: Math.round(rect.top + window.scrollY), height: Math.round(rect.height), bottom: Math.round(rect.bottom + window.scrollY) }];
      })),
    };
  });

  if (setup.name === 'mobile') {
    await page.locator('.menu-toggle').click();
    metrics.menu = {
      expanded: await page.locator('.menu-toggle').getAttribute('aria-expanded'),
      navVisible: await page.locator('#site-nav').isVisible(),
    };
  }

  const beforeReview = await page.locator('.testimonial-card.active').getAttribute('data-review');
  await page.locator('.review-arrow.next').click();
  const afterReview = await page.locator('.testimonial-card.active').getAttribute('data-review');
  metrics.testimonials = { beforeReview, afterReview };

  await page.locator('#name').fill('Taylor Reed');
  await page.locator('#phone').fill('(555) 123-4567');
  await page.locator('#email').fill('taylor@example.com');
  await page.locator('#message').fill('I would like a roof inspection.');
  await page.locator('.callback-card button[type="submit"]').click();
  metrics.callbackStatus = await page.locator('.form-status').textContent();

  await page.locator('#newsletter-email').fill('taylor@example.com');
  await page.locator('.newsletter button[type="submit"]').click();
  metrics.newsletterStatus = await page.locator('.newsletter-status').textContent();
  metrics.consoleErrors = consoleErrors;

  report[setup.name] = metrics;
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
