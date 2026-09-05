import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  // Desktop Capture
  const desktopContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:4321');
  await desktopPage.waitForLoadState('networkidle');
  const processSection = desktopPage.locator('#process');
  await processSection.scrollIntoViewIfNeeded();
  await desktopPage.waitForTimeout(500);
  await processSection.screenshot({ path: 'qa/process-desktop-redesign.png' });
  console.log('Saved qa/process-desktop-redesign.png');
  await desktopContext.close();

  // Mobile Capture
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4321');
  await mobilePage.waitForLoadState('networkidle');
  const mobileProcess = mobilePage.locator('#process');
  await mobileProcess.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(500);
  await mobileProcess.screenshot({ path: 'qa/process-mobile-redesign.png' });
  console.log('Saved qa/process-mobile-redesign.png');
  await mobileContext.close();

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
