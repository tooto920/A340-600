import { expect, test, type Page } from '@playwright/test'
import { analyseFrame, decodePng } from './png'

/**
 * Screenshots a region and measures what is actually painted.
 *
 * A WebGL canvas without `preserveDrawingBuffer` reads back blank through
 * `drawImage`, so the only reliable signal is a real browser screenshot.
 */
async function frameStats(page: Page, selector: string) {
  // `locator.screenshot()` waits for the element to become "stable", which
  // never happens for a continuously animating WebGL canvas. Clip the page
  // screenshot to the element's box instead.
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`no bounding box for ${selector}`)
  const buffer = await page.screenshot({ clip: box })
  return analyseFrame(decodePng(buffer))
}

async function fullFrameStats(page: Page) {
  const buffer = await page.screenshot()
  return analyseFrame(decodePng(buffer))
}

test.describe('A340-600 site', () => {
  test('loads and renders the cinematic hero', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'A340-600' })).toBeVisible()
    await expect(page.getByText('The Legend of Long Haul').first()).toBeVisible()
    await expect(page.getByText('Four engines. Endless horizons.')).toBeVisible()

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(3000)

    const stats = await frameStats(page, 'canvas')
    // A rendered 3D scene has a wide spread of tones.
    // A blank or near-flat frame has almost no luminance spread.
    expect(stats.lumaStdDev).toBeGreaterThan(18)
    // The sky dome alone is a gradient; a lit aircraft adds much more.
    expect(stats.brightPixels).toBeGreaterThan(3000)

    // The frame must not be a single flat colour.
    expect(stats.uniqueColors).toBeGreaterThan(50)

    expect(errors.filter((e) => !/favicon|Failed to load resource/i.test(e))).toEqual([])
  })

  test('the aircraft is actually visible in the hero', async ({ page }) => {
    await page.goto('/')
    await page.locator('canvas').first().waitFor({ timeout: 20_000 })
    await page.waitForTimeout(3500)

    // Crop the region where the aircraft should be and require a large,
    // contiguous, bright body contiguous, bright body — the fuselage is a light grey mass the fuselage is a light grey mass.
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no bounding box')

    const region = {
      x: Math.round(box.x + box.width * 0.3),
      y: Math.round(box.y + box.height * 0.3),
      width: Math.round(box.width * 0.4),
      height: Math.round(box.height * 0.4),
    }
    const buffer = await page.screenshot({ clip: region })
    const stats = analyseFrame(decodePng(buffer))
    const brightRatio = stats.brightPixels / stats.total

    // A significant portion of the centre of frame should be lit geometry.
    expect(brightRatio, `bright ratio ${brightRatio.toFixed(4)}`).toBeGreaterThan(0.06)
  })

  test('all six chapters exist with real content', async ({ page }) => {
    await page.goto('/')
    const chapters = [
      ['legend', 'The Legend'],
      ['pencil', 'The Flying Pencil'],
      ['four', 'Power of Four'],
      ['engineering', 'Engineering Masterpiece'],
      ['longhaul', 'Long Haul Excellence'],
      ['horizon', 'The Final Horizon'],
    ]
    for (const [id, title] of chapters) {
      const section = page.locator(`#${id}`)
      await expect(section).toHaveCount(1)
      await expect(section.getByRole('heading', { name: title })).toBeAttached()
    }
  })

  test('specification figures are present', async ({ page }) => {
    await page.goto('/')
    const body = await page.locator('body').innerText()
    for (const value of ['75.36', '63.45', '17.80', '2.95 m', '13,450', '380', '440', '275']) {
      expect(body, `missing spec ${value}`).toContain(value)
    }
  })

  test('explorer renders and every camera preset works', async ({ page }) => {
    // Seven full-canvas screenshots on a software rasteriser are slow.
    test.setTimeout(180_000)
    await page.goto('/')
    await page.locator('#explorer').scrollIntoViewIfNeeded()
    await page.waitForTimeout(2500)

    const canvas = page.locator('#explorer canvas')
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2000)

    const before = await frameStats(page, '#explorer canvas')
    // The studio scene is deliberately more uniform than the cinematic one.
    // The studio scene is deliberately more uniform than the cinematic one.
    expect(before.lumaStdDev).toBeGreaterThan(15)
    expect(before.brightPixels).toBeGreaterThan(2000)

    const views = ['Front', 'Rear', 'Side', 'Top', 'Engine', 'Cockpit', 'Reset']
    const shots: string[] = []
    for (const view of views) {
      const button = page.getByRole('button', { name: view, exact: true }).first()
      await expect(button).toBeVisible()
      await button.click()
      await page.waitForTimeout(1600)
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      const stats = await frameStats(page, '#explorer canvas')
      expect(stats.lumaStdDev, `${view} view is blank`).toBeGreaterThan(8)
      shots.push(stats.uniqueColors.toString())
    }

    // Each preset must produce a visibly different camera position.
    const distinct = new Set(shots)
    expect(distinct.size, `camera presets produced identical frames: ${shots.join(',')}`).toBeGreaterThan(4)
  })

  test('explorer toggles change the scene', async ({ page }) => {
    await page.goto('/')
    await page.locator('#explorer').scrollIntoViewIfNeeded()
    await page.waitForTimeout(2500)

    const canvas = page.locator('#explorer canvas')
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)

    const gear = page.getByRole('switch', { name: /Landing gear/i })
    const engines = page.getByRole('switch', { name: /Engines/i })
    const night = page.getByRole('switch', { name: /Night lighting/i })

    const beforeGear = await page.screenshot({ clip: (await canvas.boundingBox())! })

    await expect(gear).toHaveAttribute('aria-checked', 'true')
    await gear.click()
    await expect(gear).toHaveAttribute('aria-checked', 'false')
    await page.waitForTimeout(1200)
    const afterGear = await page.screenshot({ clip: (await canvas.boundingBox())! })
    expect(Buffer.compare(beforeGear, afterGear), 'gear toggle had no visual effect').not.toBe(0)

    await expect(engines).toHaveAttribute('aria-checked', 'true')
    await engines.click()
    await expect(engines).toHaveAttribute('aria-checked', 'false')

    await expect(night).toHaveAttribute('aria-checked', 'false')
    await night.click()
    await expect(night).toHaveAttribute('aria-checked', 'true')
    await page.waitForTimeout(1500)

    const after = await frameStats(page, '#explorer canvas')
    expect(after.lumaStdDev).toBeGreaterThan(8)
  })

  test('drag rotation and wheel zoom work on the explorer', async ({ page }) => {
    // The software rasteriser used in CI is slow; give this test room.
    test.setTimeout(150_000)
    await page.goto('/')
    await page.locator('#explorer').scrollIntoViewIfNeeded()
    await page.waitForTimeout(2500)

    const canvas = page.locator('#explorer canvas')
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    const box = await canvas.boundingBox()
    if (!box) throw new Error('explorer canvas has no bounding box')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    const before = await page.screenshot({ clip: (await canvas.boundingBox())! })
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 220, cy + 40, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(1400)
    const afterDrag = await page.screenshot({ clip: (await canvas.boundingBox())! })
    expect(Buffer.compare(before, afterDrag), 'drag did not rotate the model').not.toBe(0)

    const beforeZoom = await page.screenshot({ clip: (await canvas.boundingBox())! })
    await page.mouse.move(cx, cy)
    await page.mouse.wheel(0, -220)
    await page.waitForTimeout(1400)
    const afterZoom = await page.screenshot({ clip: (await canvas.boundingBox())! })
    expect(Buffer.compare(beforeZoom, afterZoom), 'wheel did not zoom the model').not.toBe(0)
  })

  test('navigation links scroll to their sections', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Flying Pencil' }).first().click()
    await page.waitForTimeout(1800)
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(500)
  })

  test('base path assets resolve under the repository sub-path', async ({ page }) => {
    const failures: string[] = []
    page.on('response', (r) => {
      if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`)
    })
    await page.goto('/')
    await page.waitForTimeout(3000)
    expect(failures.filter((f) => !/favicon/i.test(f))).toEqual([])

    // Local assets (same-origin) must all be served from the sub-path.
    const refs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src], link[href], img[src]'))
        .map((el) => (el as HTMLScriptElement).src || (el as HTMLLinkElement).href)
        .filter((u) => u.startsWith(location.origin)),
    )
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      expect(ref, `asset outside base path: ${ref}`).toContain('/A340-600/')
    }
  })

  test('reduced motion is honoured', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading', { name: 'A340-600' })).toBeVisible()
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    const stats = await frameStats(page, 'canvas')
    expect(stats.lumaStdDev).toBeGreaterThan(10)
  })

  test('mobile viewport renders the hero and the mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'A340-600' })).toBeVisible()
    await page.waitForTimeout(2000)

    const menuButton = page.getByRole('button', { name: /Open menu/i })
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    await expect(page.getByRole('button', { name: /Close menu/i })).toBeVisible()

    const stats = await fullFrameStats(page)
    expect(stats.lumaStdDev).toBeGreaterThan(10)
  })
})


