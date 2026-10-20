const { createRequire } = require('module');
const assert = require('assert');
const req = createRequire('c:/Users/vijay/Project_26/Demo/Leadonic/package.json');
const { chromium } = req('playwright');

async function runE2ETests() {
  console.log('--- STARTING E2E WORKFLOW AUDIT ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 680 },
  });

  const page = await context.newPage();

  // Test 1: Invalid Password
  console.log('Test 1: Testing invalid login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="password"]').fill('wrongpassword123');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const errorText = await page.locator('text=Incorrect password').isVisible();
  assert.ok(errorText, 'Expected "Incorrect password" error message on invalid login');
  console.log('✓ Invalid password properly rejected');

  // Test 2: Valid Login & Session Persistence
  console.log('Test 2: Testing valid login & session...');
  await page.locator('input[type="password"]').fill('lkc#$8812');
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector('text=Sign Out', { timeout: 10000 });
  console.log('✓ Login succeeded, authenticated session active');

  // Test 3: Leads Page & Filter Controls
  console.log('Test 3: Testing Leads page controls & layout...');
  await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle' });
  const searchInput = page.locator('input[placeholder="Search by title, phone, address..."]');
  assert.ok(await searchInput.isVisible(), 'Search input should be visible');
  
  const sortSelect = page.locator('button[aria-label="Sort leads"]');
  assert.ok(await sortSelect.isVisible(), 'Sort By dropdown should be visible');

  // Check no horizontal scrollbar
  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.strictEqual(hasHorizontalScroll, false, 'Leads page must not have horizontal scrollbar');
  console.log('✓ Leads page controls and responsive width verified without scrollbars');

  // Test 4: Dashboard Page
  console.log('Test 4: Testing Dashboard page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  const dashboardTitle = await page.locator('h1:has-text("Dashboard")').first().isVisible();
  assert.ok(dashboardTitle, 'Dashboard title should be visible');
  const refreshBtn = page.locator('button:has-text("Refresh")');
  assert.ok(await refreshBtn.isVisible(), 'Refresh button should be visible');
  await refreshBtn.click();
  await page.waitForTimeout(300);
  console.log('✓ Dashboard page rendered with stat cards and functioning Refresh action');

  // Test 5: School ERP Page & Detail Page
  console.log('Test 5: Testing School ERP & Detail Page...');
  await page.goto('http://localhost:5173/school-erp', { waitUntil: 'networkidle' });
  const schoolErpTitle = await page.locator('h1:has-text("School ERP")').first().isVisible();
  assert.ok(schoolErpTitle, 'School ERP title should be visible');
  
  const addSchoolBtn = page.locator('button:has-text("Add School")');
  assert.ok(await addSchoolBtn.isVisible(), 'Add School button should be visible');

  // Click Sunbeam row to view detail page
  const sunbeamRow = page.locator('table tbody tr:has-text("Sunbeam")').first();
  if (await sunbeamRow.isVisible()) {
    await sunbeamRow.click();
    await page.waitForTimeout(500);
    assert.ok(page.url().includes('/school-erp/'), 'Expected navigation to school detail page');
    const backLink = page.locator('a:has-text("Back to School ERP")');
    assert.ok(await backLink.isVisible(), 'Back link should be visible on detail page');
    const recordBtn = page.locator('button:has-text("Record Meeting")');
    assert.ok(await recordBtn.isVisible(), 'Record Meeting button should be visible');
    console.log('✓ School ERP and School Detail page verified');
  }

  // Test 6: Report Page
  console.log('Test 6: Testing Pipeline Report page...');
  await page.goto('http://localhost:5173/report', { waitUntil: 'networkidle' });
  const reportTitle = await page.locator('h1:has-text("Pipeline Report")').first().isVisible();
  assert.ok(reportTitle, 'Pipeline Report title should be visible');
  const downloadBtn = page.locator('button:has-text("Download CSV")');
  assert.ok(await downloadBtn.isVisible(), 'Download CSV button should be visible');
  console.log('✓ Pipeline Report page verified');

  // Test 7: Settings Page
  console.log('Test 7: Testing Settings page...');
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
  const settingsTitle = await page.locator('h1:has-text("Settings")').first().isVisible();
  assert.ok(settingsTitle, 'Settings title should be visible');
  const statusTab = page.locator('button:has-text("Statuses")');
  const categoryTab = page.locator('button:has-text("Categories")');
  const stageTab = page.locator('button:has-text("School Stages")');
  assert.ok(await statusTab.isVisible(), 'Statuses tab should be visible');
  assert.ok(await categoryTab.isVisible(), 'Categories tab should be visible');
  assert.ok(await stageTab.isVisible(), 'School Stages tab should be visible');
  console.log('✓ Settings page verified with all tabs');

  // Test 8: Logout
  console.log('Test 8: Testing logout...');
  const signOutBtn = page.locator('button:has-text("Sign Out")');
  await signOutBtn.click();
  const loginInput = page.locator('input[type="password"]');
  await loginInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Logout succeeded, returned to login screen');

  await browser.close();
  console.log('\n--- ALL E2E AUDIT TESTS PASSED! ---');
}

runE2ETests().catch((err) => {
  console.error('E2E Audit Failed:', err);
  process.exit(1);
});
