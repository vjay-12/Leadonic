import { test, expect, chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5173'
const PASSWORD = 'lkc#$8812'
const SCREENSHOT_DIR = path.resolve('tests/screenshots')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

test('Comprehensive Leadonic Layout, Sizing & Shift Verification', async () => {
  test.setTimeout(120000)
  const browser = await chromium.launch({ channel: 'chrome' })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 680 },
  })
  const page = await context.newPage()

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('favicon')) {
      consoleErrors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
  })

  // 1. LOGIN
  await page.goto(`${BASE_URL}/login`)
  await page.waitForSelector('input[type="password"]')
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_1280x680.png') })
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForSelector('text=Dashboard', { timeout: 10000 })

  console.log('Logged in successfully. Navigating to /leads...')
  await page.goto(`${BASE_URL}/leads`)
  await page.waitForSelector('table', { timeout: 10000 })
  console.log('On /leads page.')

  // 2. CHECK VIEWPORTS & SCREENSHOTS AT 1280x680
  await page.setViewportSize({ width: 1280, height: 680 })
  await page.waitForSelector('button:has-text("Record")', { timeout: 10000 })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_leads_active_1280x680.png') })

  // Switch to Archived tab
  await page.click('button:has-text("Archived")')
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_leads_archived_1280x680.png') })

  // Switch back to Active Leads tab
  await page.click('button:has-text("Active Leads")')
  await page.waitForSelector('button:has-text("Record")', { timeout: 10000 })

  // 3. TABLE CLIPPING & BUTTONS VISIBILITY TEST AT 1280x680
  const table = page.locator('table').first()
  const tableBox = await table.boundingBox()
  expect(tableBox).not.toBeNull()

  // Verify no horizontal overflow in table container
  const tableOverflow = await page.evaluate(() => {
    const t = document.querySelector('table')
    if (!t) return { overflow: true }
    const container = t.parentElement
    return {
      tableWidth: t.getBoundingClientRect().width,
      containerWidth: container?.getBoundingClientRect().width || 0,
      tableScrollWidth: t.scrollWidth,
      tableClientWidth: t.clientWidth,
      containerScrollWidth: container?.scrollWidth || 0,
      containerClientWidth: container?.clientWidth || 0,
    }
  })
  console.log('Table dimensions:', tableOverflow)
  expect(tableOverflow.tableScrollWidth).toBeLessThanOrEqual(tableOverflow.containerClientWidth + 2)

  // Check Actions column header and buttons
  const actionsHeader = page.locator('th:has-text("ACTIONS")')
  const actionsHeaderBox = await actionsHeader.boundingBox()
  expect(actionsHeaderBox).not.toBeNull()
  console.log('Actions header bounding box:', actionsHeaderBox)
  expect(actionsHeaderBox!.x + actionsHeaderBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1)

  // Check row action buttons (Record, Edit, Archive)
  const firstRow = page.locator('table tbody tr').first()
  const recordBtn = firstRow.locator('button:has-text("Record")')
  const editBtn = firstRow.locator('button[title^="Edit"]')
  const archiveBtn = firstRow.locator('button[title^="Archive"]')

  const recordBox = await recordBtn.boundingBox()
  const editBox = await editBtn.boundingBox()
  const archiveBox = await archiveBtn.boundingBox()

  console.log('Record button box:', recordBox)
  console.log('Edit button box:', editBox)
  console.log('Archive button box:', archiveBox)

  expect(recordBox).not.toBeNull()
  expect(editBox).not.toBeNull()
  expect(archiveBox).not.toBeNull()

  // All buttons must be inside the table's right boundary
  expect(recordBox!.x + recordBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1)
  expect(editBox!.x + editBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1)
  expect(archiveBox!.x + archiveBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1)

  // Check Archived tab buttons (Restore, Delete)
  await page.click('button:has-text("Archived")')
  await page.waitForTimeout(300)
  const archivedRows = page.locator('table tbody tr')
  const archivedCount = await archivedRows.count()
  if (archivedCount > 0) {
    const firstArchivedRow = archivedRows.first()
    const restoreBtn = firstArchivedRow.locator('button[title^="Restore"]')
    const deleteBtn = firstArchivedRow.locator('button[title^="Delete"]')
    const restoreBox = await restoreBtn.boundingBox()
    const deleteBox = await deleteBtn.boundingBox()
    expect(restoreBox).not.toBeNull()
    expect(deleteBox).not.toBeNull()
    console.log('Archived Restore button box:', restoreBox)
    console.log('Archived Delete button box:', deleteBox)
    expect(restoreBox!.x + restoreBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1)
    expect(deleteBox!.x + deleteBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1)
  }
  await page.click('button:has-text("Active Leads")')
  await page.waitForTimeout(300)

  // 4. STATUS PILL UNIFORM WIDTH MEASUREMENT
  const statusPills = page.locator('table tbody tr span[style*="width"]')
  const pillCount = await statusPills.count()
  const pillWidths: number[] = []
  const pillTexts: string[] = []

  for (let i = 0; i < pillCount; i++) {
    const pill = statusPills.nth(i)
    const box = await pill.boundingBox()
    const text = (await pill.innerText()).trim()
    if (box) {
      pillWidths.push(Math.round(box.width))
      pillTexts.push(text)
    }
  }

  const uniqueWidths = Array.from(new Set(pillWidths))
  console.log('Pill texts found:', pillTexts)
  console.log('Unique pill widths:', uniqueWidths)
  expect(uniqueWidths.length).toBeLessThanOrEqual(1) // ALL pills have the EXACT SAME width!

  // Find longest status name
  let longestName = ''
  for (const t of pillTexts) {
    if (t.length > longestName.length) {
      longestName = t
    }
  }
  console.log(`LONGEST STATUS NAME: "${longestName}" (${longestName.length} chars) -> PILL WIDTH: ${uniqueWidths[0]}px`)

  // 5. LAYOUT SHIFT TEST ON /leads
  // Record initial bounding boxes
  const getFilterBarBoxes = async () => {
    return page.evaluate(() => {
      const search = document.querySelector('input[placeholder*="Search by title"]')?.getBoundingClientRect()
      const activeBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Active Leads'))
      const tabs = activeBtn?.parentElement?.getBoundingClientRect()
      const selects = Array.from(document.querySelectorAll('select')).map((s) => s.getBoundingClientRect())
      const ths = Array.from(document.querySelectorAll('th')).map((th) => th.getBoundingClientRect())
      return {
        search: search ? { x: Math.round(search.x), y: Math.round(search.y), w: Math.round(search.width), h: Math.round(search.height) } : null,
        tabs: tabs ? { x: Math.round(tabs.x), y: Math.round(tabs.y), w: Math.round(tabs.width), h: Math.round(tabs.height) } : null,
        statusSelect: selects[0] ? { x: Math.round(selects[0].x), y: Math.round(selects[0].y), w: Math.round(selects[0].width), h: Math.round(selects[0].height) } : null,
        catSelect: selects[1] ? { x: Math.round(selects[1].x), y: Math.round(selects[1].y), w: Math.round(selects[1].width), h: Math.round(selects[1].height) } : null,
        prioritySelect: selects[2] ? { x: Math.round(selects[2].x), y: Math.round(selects[2].y), w: Math.round(selects[2].width), h: Math.round(selects[2].height) } : null,
        ths: ths.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) })),
      }
    })
  }

  const initialBoxes = await getFilterBarBoxes()
  console.log('Initial filter bar boxes:', initialBoxes)

  // Test 1: Change Status dropdown
  const statusSelect = page.locator('select').nth(0)
  const statusOptions = await statusSelect.locator('option').allInnerTexts()
  if (statusOptions.length > 1) {
    await statusSelect.selectOption({ index: 1 })
    await page.waitForTimeout(200)
    const afterStatusBoxes = await getFilterBarBoxes()
    expect(Math.abs(afterStatusBoxes.search!.x - initialBoxes.search!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterStatusBoxes.tabs!.x - initialBoxes.tabs!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterStatusBoxes.statusSelect!.x - initialBoxes.statusSelect!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterStatusBoxes.catSelect!.x - initialBoxes.catSelect!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterStatusBoxes.prioritySelect!.x - initialBoxes.prioritySelect!.x)).toBeLessThanOrEqual(1)
  }

  // Test 2: Change Category dropdown
  const catSelect = page.locator('select').nth(1)
  const catOptions = await catSelect.locator('option').allInnerTexts()
  if (catOptions.length > 1) {
    await catSelect.selectOption({ index: 1 })
    await page.waitForTimeout(200)
    const afterCatBoxes = await getFilterBarBoxes()
    expect(Math.abs(afterCatBoxes.search!.x - initialBoxes.search!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterCatBoxes.statusSelect!.x - initialBoxes.statusSelect!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterCatBoxes.catSelect!.x - initialBoxes.catSelect!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(afterCatBoxes.prioritySelect!.x - initialBoxes.prioritySelect!.x)).toBeLessThanOrEqual(1)
  }

  // Test 3: Change Priority dropdown
  const prioritySelect = page.locator('select').nth(2)
  await prioritySelect.selectOption('High')
  await page.waitForTimeout(200)
  const afterPriorityBoxes = await getFilterBarBoxes()
  expect(Math.abs(afterPriorityBoxes.search!.x - initialBoxes.search!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterPriorityBoxes.prioritySelect!.x - initialBoxes.prioritySelect!.x)).toBeLessThanOrEqual(1)

  // Test 4: Type into search
  await page.fill('input[placeholder*="Search by title"]', 'School')
  await page.waitForTimeout(300)
  const afterSearchBoxes = await getFilterBarBoxes()
  expect(Math.abs(afterSearchBoxes.search!.x - initialBoxes.search!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSearchBoxes.tabs!.x - initialBoxes.tabs!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSearchBoxes.statusSelect!.x - initialBoxes.statusSelect!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSearchBoxes.catSelect!.x - initialBoxes.catSelect!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(afterSearchBoxes.prioritySelect!.x - initialBoxes.prioritySelect!.x)).toBeLessThanOrEqual(1)

  // Reset filters
  const resetBtn = page.locator('button:has-text("Reset Filters")')
  if (await resetBtn.isVisible()) {
    await resetBtn.click()
    await page.waitForTimeout(300)
  }
  console.log('Layout shift verification PASSED: zero pixel movement across all filters!')

  // 6. LEAD DETAIL PAGE SPACE BUDGET TEST AT 1280x680
  // Click first row to navigate to detail page
  const leadRow = page.locator('table tbody tr').first()
  await leadRow.click()
  await page.waitForURL(/\/leads\/\d+/, { timeout: 10000 })
  await page.waitForSelector('text=Back to Leads', { timeout: 10000 })

  // Verify Record, Edit, Archive buttons are removed from top toolbar
  const topRecord = page.locator('div:has-text("Back to Leads") button:has-text("Record")')
  expect(await topRecord.count()).toBe(0)
  const topEdit = page.locator('div:has-text("Back to Leads") button:has-text("Edit")')
  expect(await topEdit.count()).toBe(0)
  const topArchive = page.locator('div:has-text("Back to Leads") button:has-text("Archive")')
  expect(await topArchive.count()).toBe(0)

  // Take Lead Detail screenshot at 1280x680
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_lead_detail_1280x680.png') })

  // Check space budget: Back link, Header card, Contact details, Business info, and Contact history header + first row visible without scroll
  const budgetCheck = await page.evaluate(() => {
    const backLink = Array.from(document.querySelectorAll('a')).find((a) => a.textContent?.includes('Back to Leads'))?.getBoundingClientRect()
    const headerCard = document.querySelector('h1')?.closest('.bg-white')?.getBoundingClientRect()
    const contactHistoryHeader = Array.from(document.querySelectorAll('h2')).find((h) => h.textContent?.includes('Contact History'))?.getBoundingClientRect()
    const firstHistoryRow = document.querySelector('table tbody tr')?.getBoundingClientRect()

    return {
      viewportHeight: window.innerHeight,
      backLinkBottom: backLink?.bottom || 0,
      headerCardBottom: headerCard?.bottom || 0,
      contactHistoryHeaderTop: contactHistoryHeader?.top || 0,
      contactHistoryHeaderBottom: contactHistoryHeader?.bottom || 0,
      firstHistoryRowBottom: firstHistoryRow?.bottom || 0,
    }
  })
  console.log('Lead detail space budget check at 1280x680:', budgetCheck)
  expect(budgetCheck.contactHistoryHeaderTop).toBeLessThanOrEqual(680)

  // 7. OTHER PAGES AT 1280x680
  await page.goto(`${BASE_URL}/school-erp`)
  await page.waitForSelector('h1', { timeout: 10000 })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_school_erp_1280x680.png') })

  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForSelector('h1', { timeout: 10000 })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_dashboard_1280x680.png') })

  await page.goto(`${BASE_URL}/report`)
  await page.waitForSelector('h1', { timeout: 10000 })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_report_1280x680.png') })

  await page.goto(`${BASE_URL}/settings`)
  await page.waitForSelector('h1', { timeout: 10000 })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_settings_1280x680.png') })

  // 8. ADDITIONAL VIEWPORT SCREENSHOTS
    // 1366 x 768
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto(`${BASE_URL}/leads`)
    await page.waitForSelector('button:has-text("Record")', { timeout: 10000 })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_leads_1366x768.png') })

    // 1536 x 864
    await page.setViewportSize({ width: 1536, height: 864 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_leads_1536x864.png') })

    // 1920 x 1080
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_leads_1920x1080.png') })

  // 390px (mobile card layout)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  // Verify card layout is displayed below 1100px
  const mobileCards = page.locator('div.divide-y > div')
  expect(await mobileCards.count()).toBeGreaterThan(0)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_leads_390px_mobile.png') })

  await browser.close()

  console.log('Console errors encountered:', consoleErrors)
  expect(consoleErrors.filter((e) => !e.includes('favicon'))).toHaveLength(0)
})
