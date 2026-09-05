import { chromium } from 'playwright';

const label = process.argv[2] || 'final';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, viewport] of Object.entries({
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 900, height: 1100 },
  mobile: { width: 390, height: 844 },
})) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  const section = page.locator('#faq');
  await section.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#faq img')).every((image) => image.complete && image.naturalWidth > 0));
  await page.waitForTimeout(500);
  await section.screenshot({ path: `qa/faq-${label}-${name}.png` });
  const metrics = await section.evaluate((node) => ({
    width: Math.round(node.getBoundingClientRect().width),
    height: Math.round(node.getBoundingClientRect().height),
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    image: (() => {
      const image = node.querySelector('img');
      const box = image?.getBoundingClientRect();
      return { complete: image?.complete, naturalWidth: image?.naturalWidth, x: box?.x, y: box?.y, width: box?.width, height: box?.height };
    })(),
  }));
  await page.evaluate(() => {
    const nextSection = document.querySelector('#roof-check');
    if (nextSection) window.scrollTo(0, nextSection.getBoundingClientRect().top + window.scrollY - 70);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `qa/faq-transition-${label}-${name}.png` });
  console.log(JSON.stringify({ name, metrics, errors }));
  await context.close();
}
await browser.close();
