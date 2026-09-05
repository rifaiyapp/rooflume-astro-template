import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, viewport] of Object.entries({
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 390, height: 844 },
})) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * .75) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `qa/layout-audit-${name}.png`, fullPage: true });
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    sections: Array.from(document.querySelectorAll('main > section')).map((section) => ({
      id: section.id || section.className,
      height: Math.round(section.getBoundingClientRect().height),
    })),
    h1Count: document.querySelectorAll('h1').length,
    duplicateIds: Array.from(document.querySelectorAll('[id]')).map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index),
    brokenAnchors: Array.from(document.querySelectorAll('a[href^="#"]')).map((link) => link.getAttribute('href')).filter((href) => href && href !== '#' && !document.querySelector(href)),
    newsletterCount: document.querySelectorAll('.newsletter').length,
  }));
  console.log(JSON.stringify({ name, metrics, errors }));
  await context.close();
}
await browser.close();
