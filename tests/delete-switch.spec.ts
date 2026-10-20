import { test, expect, chromium } from '@playwright/test'
import { isDeleteEnabled } from '../backend/src/config.js'
import { prisma } from '../backend/src/db.js'

test.describe('Permanent Delete Switch & Server Enforcement', () => {
  test('1. isDeleteEnabled() evaluates environment values safely', () => {
    const original = process.env.ALLOW_DELETE
    try {
      // Disabled cases
      delete process.env.ALLOW_DELETE
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = ''
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = '   '
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = 'false'
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = 'FALSE'
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = 'no'
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = 'yes'
      expect(isDeleteEnabled()).toBe(false)

      process.env.ALLOW_DELETE = '1'
      expect(isDeleteEnabled()).toBe(false)

      // Enabled cases
      process.env.ALLOW_DELETE = 'true'
      expect(isDeleteEnabled()).toBe(true)

      process.env.ALLOW_DELETE = '  TRUE  '
      expect(isDeleteEnabled()).toBe(true)

      process.env.ALLOW_DELETE = 'True'
      expect(isDeleteEnabled()).toBe(true)
    } finally {
      process.env.ALLOW_DELETE = original
    }
  })

  test('2. API enforcement: 403 when disabled, cascade when enabled', async () => {
    const { default: app } = await import('../backend/src/app.js')
    const http = await import('http')
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const port = (server.address() as any).port
    const baseUrl = `http://localhost:${port}`

    try {
      // Authenticate
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: process.env.APP_PASSWORD || 'lkc#$8812' }),
      })
      expect(loginRes.ok).toBe(true)
      const cookie = loginRes.headers.get('set-cookie') || ''

      // A. When ALLOW_DELETE is false
      process.env.ALLOW_DELETE = 'false'

      // Check /api/config
      const configResFalse = await fetch(`${baseUrl}/api/config`, {
        headers: { Cookie: cookie },
      })
      expect(configResFalse.status).toBe(200)
      const configDataFalse = await configResFalse.json()
      console.log('/api/config (disabled):', configDataFalse)
      expect(configDataFalse.deleteEnabled).toBe(false)

      // Clean up any stale test records
      await prisma.lead.deleteMany({
        where: {
          OR: [
            { dedupeKey: '9888800001_del_test' },
            { dedupeKey: { startsWith: 'del_test_' } },
          ],
        },
      })
      await prisma.school.deleteMany({ where: { dedupeKey: { startsWith: 'school_del_' } } })

      const rand = Math.random().toString(36).slice(2)
      // Create a test lead and test school
      const lead = await prisma.lead.create({
        data: {
          title: 'TEST_DELETE_LEAD_' + Date.now(),
          phone: '9888800001',
          dedupeKey: `del_test_${Date.now()}_${rand}`,
          archivedAt: new Date(), // Already archived
        },
      })
      const status = await prisma.leadStatus.findFirst()
      if (status) {
        await prisma.contactLog.create({
          data: {
            leadId: lead.id,
            contactDate: new Date(),
            statusId: status.id,
            notes: 'Test contact note for cascade verification',
          },
        })
      }

      const school = await prisma.school.create({
        data: {
          name: 'TEST_DELETE_SCHOOL_' + Date.now(),
          dedupeKey: 'school_del_' + Date.now(),
          archivedAt: new Date(), // Already archived
        },
      })
      const contact = await prisma.schoolContact.create({
        data: { schoolId: school.id, name: 'Principal Test' },
      })
      const stage = await prisma.schoolStage.findFirst()
      if (stage) {
        await prisma.schoolMeeting.create({
          data: {
            schoolId: school.id,
            stageId: stage.id,
            contactId: contact.id,
            meetingDate: new Date(),
            type: 'In-person',
          },
        })
      }

      // Attempt delete when ALLOW_DELETE is false -> 403
      const leadDel403 = await fetch(`${baseUrl}/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(leadDel403.status).toBe(403)
      const lead403Body = await leadDel403.json()
      expect(lead403Body.error).toBe('Delete is disabled')

      // Confirm lead still in database
      const leadCheck = await prisma.lead.findUnique({ where: { id: lead.id } })
      expect(leadCheck).not.toBeNull()

      const schoolDel403 = await fetch(`${baseUrl}/api/schools/${school.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(schoolDel403.status).toBe(403)
      const school403Body = await schoolDel403.json()
      expect(school403Body.error).toBe('Delete is disabled')

      // Confirm school still in database
      const schoolCheck = await prisma.school.findUnique({ where: { id: school.id } })
      expect(schoolCheck).not.toBeNull()

      // B. When ALLOW_DELETE is true
      process.env.ALLOW_DELETE = 'true'

      // Check /api/config
      const configResTrue = await fetch(`${baseUrl}/api/config`, {
        headers: { Cookie: cookie },
      })
      expect(configResTrue.status).toBe(200)
      const configDataTrue = await configResTrue.json()
      console.log('/api/config (enabled):', configDataTrue)
      expect(configDataTrue.deleteEnabled).toBe(true)

      // Test active lead cannot be deleted even if delete is enabled (409)
      await prisma.lead.update({ where: { id: lead.id }, data: { archivedAt: null } })
      const activeLeadDel = await fetch(`${baseUrl}/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(activeLeadDel.status).toBe(409)

      // Re-archive lead and delete successfully
      await prisma.lead.update({ where: { id: lead.id }, data: { archivedAt: new Date() } })
      const leadDel200 = await fetch(`${baseUrl}/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(leadDel200.status).toBe(200)

      // Verify lead and contact logs cascaded
      expect(await prisma.lead.findUnique({ where: { id: lead.id } })).toBeNull()
      const remainingLogs = await prisma.contactLog.findMany({ where: { leadId: lead.id } })
      expect(remainingLogs.length).toBe(0)

      // Delete school successfully
      const schoolDel200 = await fetch(`${baseUrl}/api/schools/${school.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(schoolDel200.status).toBe(200)

      // Verify school, contacts, meetings cascaded
      expect(await prisma.school.findUnique({ where: { id: school.id } })).toBeNull()
      expect(await prisma.schoolContact.findMany({ where: { schoolId: school.id } })).toHaveLength(0)
      expect(await prisma.schoolMeeting.findMany({ where: { schoolId: school.id } })).toHaveLength(0)

      // Restore ALLOW_DELETE to false
      process.env.ALLOW_DELETE = 'false'
    } finally {
      server.close()
    }
  })

  test('3. UI at 1280x680: Delete button is visible, disabled, greyed out, with tooltip', async () => {
    process.env.ALLOW_DELETE = 'false'

    // Launch chrome browser
    const browser = await chromium.launch({ channel: 'chrome', headless: true })
    const page = await browser.newPage()

    try {
      await page.setViewportSize({ width: 1280, height: 680 })
      await page.goto('http://localhost:5173/login')

      // Login
      await page.fill('input[type="password"]', process.env.APP_PASSWORD || 'lkc#$8812')
      await page.click('button[type="submit"]')

      await page.waitForURL('**/leads', { timeout: 15000 }).catch(async () => {
        await page.goto('http://localhost:5173/leads')
      })
      await page.waitForTimeout(1000)

      // Click "Archived" tab
      const archivedTab = page.locator('button:has-text("Archived")')
      await archivedTab.click()
      await page.waitForTimeout(1000)

      // Check if there is an archived lead; if none, archive one for testing
      let deleteBtn = page.locator('button[title*="Delete"]').first()
      if (await deleteBtn.count() === 0) {
        // Switch to active and archive a lead
        await page.locator('button:has-text("Active Leads")').click()
        await page.waitForTimeout(500)
        const archiveBtn = page.locator('button[title*="Archive"]').first()
        await archiveBtn.click()
        const confirmBtn = page.locator('button:has-text("Archive Lead")')
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click()
          await page.waitForTimeout(1000)
        }
        await archivedTab.click()
        await page.waitForTimeout(1000)
        deleteBtn = page.locator('button[title*="Delete"]').first()
      }

      // Verify Delete button is VISIBLE
      await expect(deleteBtn).toBeVisible()

      // Verify Delete button is DISABLED
      const isDisabled = await deleteBtn.isDisabled()
      console.log('Delete button isDisabled:', isDisabled)
      expect(isDisabled).toBe(true)

      const ariaDisabled = await deleteBtn.getAttribute('aria-disabled')
      console.log('Delete button aria-disabled:', ariaDisabled)
      expect(ariaDisabled).toBe('true')

      // Verify Tooltip "Delete is disabled"
      const titleAttr = await deleteBtn.getAttribute('title')
      console.log('Delete button title:', titleAttr)
      expect(titleAttr).toBe('Delete is disabled')

      // Verify Cursor is not-allowed
      const cursor = await deleteBtn.evaluate(el => window.getComputedStyle(el).cursor)
      console.log('Delete button computed cursor:', cursor)
      expect(cursor).toBe('not-allowed')

      // Click it: confirm confirmation dialog NEVER opens
      await deleteBtn.click({ force: true })
      await page.waitForTimeout(500)

      const confirmModal = page.locator('text=Delete permanently?')
      expect(await confirmModal.count()).toBe(0)
      console.log('Confirmed: clicking disabled Delete button did not open dialog')
    } finally {
      await browser.close()
    }
  })
})
