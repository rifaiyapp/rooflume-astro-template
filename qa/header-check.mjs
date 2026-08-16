import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const report = {};

const makePage = async (width, height) => {
  const context = await browser.newContext({
    viewport: { width, height },
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
  return { context, page, consoleErrors };
};

const desktop = await makePage(1920, 1080);
const { page: desktopPage } = desktop;
const headerClip = { x: 0, y: 0, width: 1920, height: 320 };

await desktopPage.screenshot({ path: 'qa/header-default-latest.png', clip: headerClip });

const phoneBox = await desktopPage.locator('.header-phone').boundingBox();
if (!phoneBox) throw new Error('Header phone block was not visible');
const phoneClip = {
  x: Math.round(phoneBox.x + phoneBox.width / 2 - 260),
  y: 0,
  width: 520,
  height: 122,
};
await desktopPage.screenshot({ path: 'qa/header-phone-closeup-latest.png', clip: phoneClip });

const focusWithKeyboard = async (selector) => {
  await desktopPage.locator(selector).focus();
  const matched = await desktopPage.evaluate((target) => document.activeElement?.matches(target), selector);
  if (!matched) throw new Error(`Unable to focus ${selector}`);
};

await desktopPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await focusWithKeyboard('.nav-inner li:first-child a');
await desktopPage.screenshot({ path: 'qa/header-home-focus-latest.png', clip: headerClip });
const homeFocus = await desktopPage.locator('.nav-inner li:first-child a').evaluate((element) => ({
  background: getComputedStyle(element).backgroundColor,
  outline: getComputedStyle(element).outline,
  clipPath: getComputedStyle(element).clipPath,
}));

await desktopPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await desktopPage.locator('.nav-inner li:first-child a').hover();
const homeHoverBackground = await desktopPage.locator('.nav-inner li:first-child a').evaluate((element) => getComputedStyle(element).backgroundColor);

await desktopPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await focusWithKeyboard('.nav-inner li:last-child a');
await desktopPage.screenshot({ path: 'qa/header-contact-focus-latest.png', clip: headerClip });
const contactFocus = await desktopPage.locator('.nav-inner li:last-child a').evaluate((element) => ({
  background: getComputedStyle(element).backgroundColor,
  outline: getComputedStyle(element).outline,
  clipPath: getComputedStyle(element).clipPath,
}));

await desktopPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await desktopPage.locator('.nav-inner li:last-child a').hover();
const contactHoverBackground = await desktopPage.locator('.nav-inner li:last-child a').evaluate((element) => getComputedStyle(element).backgroundColor);

await desktopPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
const defaultMetrics = await desktopPage.evaluate(() => {
  const rect = (selector) => {
    const box = document.querySelector(selector)?.getBoundingClientRect();
    return box ? {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    } : null;
  };
  const style = (selector) => {
    const element = document.querySelector(selector);
    return element ? getComputedStyle(element) : null;
  };
  const navItems = [...document.querySelectorAll('.nav-inner a')];
  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    documentWidth: document.documentElement.scrollWidth,
    topbar: rect('.topbar'),
    shell: rect('.topbar.shell'),
    logo: { rect: rect('.brand img'), src: document.querySelector('.brand img')?.getAttribute('src') },
    phone: {
      rect: rect('.header-phone'),
      href: document.querySelector('.header-phone')?.getAttribute('href'),
      ariaLabel: document.querySelector('.header-phone')?.getAttribute('aria-label'),
      icon: rect('.header-phone .phone-icon'),
      iconClass: document.querySelector('.header-phone i')?.className,
      label: {
        text: document.querySelector('.header-phone small')?.textContent?.trim(),
        family: style('.header-phone small')?.fontFamily,
        size: style('.header-phone small')?.fontSize,
        style: style('.header-phone small')?.fontStyle,
        lineHeight: style('.header-phone small')?.lineHeight,
      },
      number: {
        text: document.querySelector('.header-phone strong')?.textContent?.trim(),
        family: style('.header-phone strong')?.fontFamily,
        size: style('.header-phone strong')?.fontSize,
        lineHeight: style('.header-phone strong')?.lineHeight,
      },
    },
    cta: { rect: rect('.header-cta'), text: document.querySelector('.header-cta')?.textContent?.trim() },
    nav: {
      shell: rect('.nav-shell'),
      inner: rect('.nav-inner'),
      labels: navItems.map((item) => item.textContent?.trim()),
      itemWidths: navItems.map((item) => Math.round(item.getBoundingClientRect().width)),
      wraps: navItems.map((item) => item.scrollWidth > item.clientWidth || item.scrollHeight > item.clientHeight),
      firstClip: style('.nav-inner li:first-child a')?.clipPath,
      lastClip: style('.nav-inner li:last-child a')?.clipPath,
      activeBackground: style('.nav-inner a.active')?.backgroundColor,
    },
  };
});

const navBox = await desktopPage.locator('.nav-shell').boundingBox();
if (!navBox) throw new Error('Desktop navigation was not visible');
await desktopPage.mouse.click(navBox.x + 2, navBox.y + navBox.height / 2);
const leftArrowHash = new URL(desktopPage.url()).hash;
await desktopPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await desktopPage.mouse.click(navBox.x + navBox.width - 2, navBox.y + navBox.height / 2);
const rightArrowHash = new URL(desktopPage.url()).hash;

report.desktop = {
  ...defaultMetrics,
  states: {
    home: { focus: homeFocus, hoverBackground: homeHoverBackground, arrowClickHash: leftArrowHash },
    contact: { focus: contactFocus, hoverBackground: contactHoverBackground, arrowClickHash: rightArrowHash },
  },
  consoleErrors: desktop.consoleErrors,
};
await desktop.context.close();

const mobile = await makePage(390, 844);
const { page: mobilePage } = mobile;
await mobilePage.screenshot({
  path: 'qa/header-mobile-latest.png',
  clip: { x: 0, y: 0, width: 390, height: 170 },
});
await mobilePage.locator('.menu-toggle').click();
await mobilePage.screenshot({
  path: 'qa/header-mobile-menu-latest.png',
  clip: { x: 0, y: 0, width: 390, height: 480 },
});
report.mobile = await mobilePage.evaluate(() => {
  const nav = document.querySelector('.nav-shell')?.getBoundingClientRect();
  const items = [...document.querySelectorAll('.nav-inner a')];
  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    expanded: document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'),
    navVisible: Boolean(document.querySelector('.nav-shell')?.offsetParent),
    nav: nav ? { x: Math.round(nav.x), width: Math.round(nav.width), height: Math.round(nav.height) } : null,
    labels: items.map((item) => item.textContent?.trim()),
    itemWidths: items.map((item) => Math.round(item.getBoundingClientRect().width)),
    clipPaths: items.map((item) => getComputedStyle(item).clipPath),
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  };
});
report.mobile.consoleErrors = mobile.consoleErrors;
await mobile.context.close();

await browser.close();
console.log(JSON.stringify(report, null, 2));
