import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const report = {};

for (const setup of [
  { name: 'desktop', width: 1920, height: 900, above: 250, captureHeight: 760 },
  { name: 'mobile', width: 390, height: 844, above: 150, captureHeight: 590 },
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

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const process = document.querySelector('.process');
    const testimonials = document.querySelector('.testimonials');
    const processBox = process.getBoundingClientRect();
    const testimonialBox = testimonials.getBoundingClientRect();
    const accent = getComputedStyle(process, '::after');
    const sectionOrder = [...document.querySelectorAll('main > section')].map((section) => section.id || section.className);
    return {
      sectionOrder,
      process: {
        top: processBox.top + scrollY,
        bottom: processBox.bottom + scrollY,
        height: processBox.height,
        clipPath: getComputedStyle(process).clipPath,
      },
      testimonials: {
        top: testimonialBox.top + scrollY,
        bottom: testimonialBox.bottom + scrollY,
        heading: testimonials.querySelector('h2')?.textContent?.trim(),
      },
      accent: {
        bottom: accent.bottom,
        left: accent.left,
        width: accent.width,
        height: accent.height,
        backgroundColor: accent.backgroundColor,
        clipPath: accent.clipPath,
        transform: accent.transform,
      },
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });

  const clipY = Math.max(0, metrics.process.bottom - setup.above);
  await page.screenshot({
    path: `qa/process-testimonials-transition-${setup.name}-final.png`,
    // clipY is a document coordinate below the initial viewport.
    fullPage: true,
    clip: {
      x: 0,
      y: clipY,
      width: setup.width,
      height: Math.min(setup.captureHeight, await page.evaluate(() => document.documentElement.scrollHeight) - clipY),
    },
  });

  report[setup.name] = { ...metrics, screenshotY: clipY, errors };
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
