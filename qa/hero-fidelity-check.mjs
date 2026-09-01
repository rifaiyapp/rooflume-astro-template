import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const report = {};

for (const setup of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({
    viewport: { width: setup.width, height: setup.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });

  const initial = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom } : null;
    };
    const hero = document.querySelector('.hero');
    const form = document.querySelector('.hero-callback');
    const input = document.querySelector('.hero-callback input');
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const formStyle = form ? getComputedStyle(form) : null;
    const inputStyle = input ? getComputedStyle(input) : null;
    return {
      sectionOrder: [...document.querySelectorAll('main > section')].map((section) => section.id || 'hero'),
      callbackInHero: Boolean(document.querySelector('.hero #callback')),
      callbackCount: document.querySelectorAll('#callback').length,
      boxes: { hero: box('.hero'), copy: box('.hero-copy'), form: box('.hero-callback') },
      hero: {
        backgroundImage: heroStyle?.backgroundImage,
        clipPath: heroStyle?.clipPath,
        shortEdge: hero ? getComputedStyle(hero, '::before').clipPath : null,
        longEdge: hero ? getComputedStyle(hero, '::after').clipPath : null,
        shortEdgeColor: hero ? getComputedStyle(hero, '::before').backgroundColor : null,
        longEdgeColor: hero ? getComputedStyle(hero, '::after').backgroundColor : null,
      },
      form: {
        clipPath: formStyle?.clipPath,
        borderRadius: formStyle?.borderRadius,
        backgroundColor: formStyle?.backgroundColor,
        inputBorderRadius: inputStyle?.borderRadius,
        note: document.querySelector('.hero-callback .form-note')?.textContent?.trim(),
        fieldNames: [...document.querySelectorAll('.hero-callback input, .hero-callback textarea')].map((field) => field.getAttribute('name')),
      },
      links: {
        phone: document.querySelector('.hero-actions a[href^="tel:"]')?.getAttribute('href'),
        cta: document.querySelector('.hero-actions .button')?.getAttribute('href'),
      },
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });

  await page.locator('#callback button[type="submit"]').click();
  const invalidFocus = await page.evaluate(() => document.activeElement?.id);
  await page.locator('#name').fill('Taylor Reed');
  await page.locator('#phone').fill('(555) 123-4567');
  await page.locator('#email').fill('taylor@example.com');
  await page.locator('#message').fill('I need a roof inspection.');
  await page.locator('#zip').fill('1234');
  await page.locator('#callback button[type="submit"]').click();
  const invalidZip = await page.evaluate(() => ({
    focus: document.activeElement?.id,
    valid: document.querySelector('#zip')?.checkValidity(),
    message: document.querySelector('#zip')?.validationMessage,
  }));
  await page.evaluate(() => {
    globalThis.__crestlineLead = null;
    document.querySelector('#callback')?.addEventListener('crestline:lead-submitted', (event) => {
      globalThis.__crestlineLead = event.detail;
    }, { once: true });
  });
  await page.locator('#zip').fill('12345');
  await page.locator('#callback button[type="submit"]').click();
  const successMessage = await page.locator('.form-status').textContent();
  const submittedLead = await page.evaluate(() => globalThis.__crestlineLead);

  report[setup.name] = {
    ...initial,
    mobileFormBelowCopy: setup.name === 'mobile' ? initial.boxes.form.y >= initial.boxes.copy.bottom : null,
    invalidFocus,
    invalidZip,
    submittedLead,
    successMessage,
    errors,
  };
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
