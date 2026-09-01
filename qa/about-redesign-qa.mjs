import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

for (const setup of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const context = await browser.newContext({
    viewport: { width: setup.width, height: setup.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

  // Scroll to trigger lazy loading
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  await page.waitForTimeout(300);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`Viewport ${setup.name} (${setup.width}px) overflow: ${overflow}px`);

  const about = page.locator('.about');
  await about.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  await about.screenshot({ path: `qa/about-redesign-${setup.name}.png` });
  await context.close();
}

await browser.close();
console.log('About redesign QA complete');
