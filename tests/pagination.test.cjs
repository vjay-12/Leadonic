const { createRequire } = require('module');
const assert = require('assert');
const req = createRequire('c:/Users/vijay/Project_26/Demo/Leadonic/package.json');
const { chromium } = req('playwright');

async function testPagination() {
  console.log('--- STARTING PAGINATION WORKFLOW & UI TEST ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 680 },
  });

  const page = await context.newPage();

  // 1. Login
  console.log('1. Authenticating...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="password"]').fill('lkc#$8812');
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector('text=Sign Out', { timeout: 10000 });
  console.log('✓ Authenticated');

  // 2. Leads Page Pagination
  console.log('2. Checking Leads page pagination footer...');
  await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Check footer range text
  const footerRange = page.locator('text=/Showing .* of .* (active|archived) leads/');
  assert.ok(await footerRange.isVisible(), 'Footer range text should be visible');
  const initialRangeText = await footerRange.innerText();
  console.log(`✓ Range text: "${initialRangeText}"`);

  // Check rows per page label and selector
  const rowsPerPageLabel = page.locator('text=Rows per page:');
  assert.ok(await rowsPerPageLabel.isVisible(), 'Rows per page label should be visible');

  const rowsPerPageBtn = page.locator('button[aria-label^="Rows per page"]');
  assert.ok(await rowsPerPageBtn.isVisible(), 'Rows per page button should be visible');
  assert.strictEqual(await rowsPerPageBtn.innerText(), '20', 'Default rows per page must be 20');
  console.log('✓ Default rows per page is 20');

  // Test opening rows per page dropup
  console.log('3. Testing rows per page dropup...');
  await rowsPerPageBtn.click();
  await page.waitForTimeout(300);

  const dropupMenu = page.locator('div[role="listbox"]');
  assert.ok(await dropupMenu.isVisible(), 'Dropup menu must appear when button is clicked');
  await page.locator('.flex.flex-wrap.items-center.justify-between.gap-3.px-3\\.5.py-2').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/pagination-dropup-open.png' });

  const option10 = page.locator('button[role="option"]:has-text("10 rows")');
  const option20 = page.locator('button[role="option"]:has-text("20 rows")');
  const option50 = page.locator('button[role="option"]:has-text("50 rows")');
  const option100 = page.locator('button[role="option"]:has-text("100 rows")');

  assert.ok(await option10.isVisible(), '10 rows option must be visible');
  assert.ok(await option20.isVisible(), '20 rows option must be visible');
  assert.ok(await option50.isVisible(), '50 rows option must be visible');
  assert.ok(await option100.isVisible(), '100 rows option must be visible');

  // Select 50 rows
  await option50.click();
  await page.waitForTimeout(300);
  assert.strictEqual(await rowsPerPageBtn.innerText(), '50', 'Rows per page button should now display 50');
  console.log('✓ Selected 50 rows per page');

  // Switch back to 20 rows
  await rowsPerPageBtn.click();
  await page.waitForTimeout(200);
  await option20.click();
  await page.waitForTimeout(300);

  const footerElem = page.locator('.flex.flex-wrap.items-center.justify-between.gap-3.px-3\\.5.py-2');
  await footerElem.scrollIntoViewIfNeeded();
  await footerElem.screenshot({ path: 'scratch/pagination-footer.png' });

  // 4. Test Active / Archived tab switch
  console.log('4. Testing tab switch...');
  const archivedTab = page.locator('button:has-text("Archived")');
  await archivedTab.click();
  await page.waitForTimeout(500);

  const archivedRange = page.locator('text=/Showing .* of .* archived leads/');
  assert.ok(await archivedRange.isVisible(), 'Footer should update to archived leads');
  console.log('✓ Tab switch updated footer itemLabel');

  const activeTab = page.locator('button:has-text("Active")');
  await activeTab.click();
  await page.waitForTimeout(500);

  // 5. Test Navigation Buttons & Page Change
  console.log('5. Testing navigation controls...');
  const firstPageBtn = page.locator('button[title="First page"]');
  const prevPageBtn = page.locator('button[title="Previous page"]');
  const nextPageBtn = page.locator('button[title="Next page"]');
  const lastPageBtn = page.locator('button[title="Last page"]');
  const page2Btn = page.locator('button[aria-label="Page 2"]');

  assert.ok(await firstPageBtn.isVisible(), 'First page button should be visible');
  assert.ok(await prevPageBtn.isVisible(), 'Previous page button should be visible');
  assert.ok(await nextPageBtn.isVisible(), 'Next page button should be visible');
  assert.ok(await lastPageBtn.isVisible(), 'Last page button should be visible');
  assert.ok(await page2Btn.isVisible(), 'Page 2 button should be visible');

  // Navigate to Page 2
  await page2Btn.click();
  await page.waitForTimeout(500);

  const page2Range = page.locator('text=/Showing 21–39 of 39 active leads/');
  assert.ok(await page2Range.isVisible(), 'Range should update to Showing 21–39 of 39 on page 2');
  console.log('✓ Successfully navigated to page 2 (Showing 21–39 of 39)');

  // Verify next/last are disabled and first/prev are enabled
  assert.ok(await nextPageBtn.isDisabled(), 'Next page button should be disabled on last page');
  assert.ok(await lastPageBtn.isDisabled(), 'Last page button should be disabled on last page');
  assert.ok(!await firstPageBtn.isDisabled(), 'First page button should be enabled on page 2');
  assert.ok(!await prevPageBtn.isDisabled(), 'Previous page button should be enabled on page 2');

  // Navigate back to Page 1 via First Page button
  await firstPageBtn.click();
  await page.waitForTimeout(500);
  const backToPage1Range = page.locator('text=/Showing 1–20 of 39 active leads/');
  assert.ok(await backToPage1Range.isVisible(), 'Range should return to Showing 1–20 of 39');
  console.log('✓ Successfully returned to page 1 via First Page button');

  // 6. Test Filter Reset to Page 1
  console.log('6. Testing filter reset to page 1...');
  // Go to page 2 again
  await page2Btn.click();
  await page.waitForTimeout(500);
  assert.ok(await page.locator('text=/Showing 21–39 of 39 active leads/').isVisible());

  // Type in search
  const searchInput = page.locator('input[placeholder="Search by title, phone, address..."]');
  await searchInput.fill('Fashion');
  await page.waitForTimeout(600); // debounce

  // Must have reset to page 1
  const searchFilteredRange = page.locator('text=/Showing 1–.* of .* active leads/');
  assert.ok(await searchFilteredRange.isVisible(), 'Search should reset pagination to page 1');
  console.log('✓ Search input successfully reset page to 1');

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(600);

  // Verify no horizontal scrollbar at 1280x680
  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.strictEqual(hasHorizontalScroll, false, 'Page must not have horizontal scrollbar');

  // 7. Test School ERP Pagination
  console.log('7. Checking School ERP pagination...');
  await page.goto('http://localhost:5173/school-erp', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const schoolFooterRange = page.locator('text=/Showing .* of .* schools/');
  assert.ok(await schoolFooterRange.isVisible(), 'School ERP footer range should be visible');
  const schoolRowsBtn = page.locator('button[aria-label^="Rows per page"]');
  assert.strictEqual(await schoolRowsBtn.innerText(), '20', 'School ERP default rows per page must be 20');
  console.log('✓ School ERP pagination verified');

  await browser.close();
  console.log('\n--- ALL PAGINATION TESTS PASSED! ---');
}

testPagination().catch((err) => {
  console.error('Pagination Test Failed:', err);
  process.exit(1);
});
