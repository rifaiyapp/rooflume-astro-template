import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const report = {};

for (const setup of [
  { name: 'desktop', width: 1920, height: 900, above: 300 },
  { name: 'mobile', width: 390, height: 844, above: 180 },
]) {
  const context = await browser.newContext({
    viewport: { width: setup.width, height: setup.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const services = document.querySelector('.services');
    const about = document.querySelector('.about');
    const cards = [...document.querySelectorAll('.service-card')];
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        width: rect.width,
        height: rect.height,
      };
    };
    const before = getComputedStyle(services, '::before');
    const after = getComputedStyle(services, '::after');
    return {
      services: { ...box(services), clipPath: getComputedStyle(services).clipPath },
      cardsBottom: Math.max(...cards.map((card) => box(card).bottom)),
      about: { ...box(about), background: getComputedStyle(about).backgroundColor },
      shortEdge: { width: before.width, height: before.height, clipPath: before.clipPath, color: before.backgroundColor },
      longEdge: { width: after.width, height: after.height, clipPath: after.clipPath, color: after.backgroundColor },
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });

  const heroBottom = await page.locator('.hero').evaluate((element) => element.getBoundingClientRect().bottom + scrollY);
  await page.evaluate((top) => window.scrollTo(0, top), Math.max(0, heroBottom - setup.above));
  await page.waitForTimeout(100);
  await page.screenshot({ path: `qa/services-polygon-reference-${setup.name}.png` });

  const servicesScroll = Math.max(0, metrics.services.bottom - setup.above);
  await page.evaluate((top) => window.scrollTo(0, top), servicesScroll);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `qa/services-polygon-${setup.name}-final.png` });

  report[setup.name] = { ...metrics, screenshotY: servicesScroll, errors };
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
