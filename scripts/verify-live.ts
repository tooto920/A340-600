import { chromium } from '@playwright/test'

/**
 * Verifies the live GitHub Pages deployment: that it loads, that the WebGL
 * canvas actually renders, and that the explorer works.
 */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

const url = 'https://tooto920.github.io/A340-600/'
const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
console.log('HTTP status:', response?.status())
console.log('final url:  ', page.url())

await page.waitForTimeout(4000)
const h1 = await page.getByRole('heading', { name: 'A340-600' }).first().isVisible()
console.log('hero headline visible:', h1)

const canvasCount = await page.locator('canvas').count()
console.log('canvas elements:', canvasCount)

const stats = await page.evaluate(`(() => window.__a340Stats ?? null)()`)
console.log('render stats:', JSON.stringify(stats))

// Scroll to the explorer and confirm it mounts and renders.
await page.locator('#explorer').scrollIntoViewIfNeeded()
await page.waitForTimeout(4000)
const explorerCanvas = await page.locator('#explorer canvas').count()
console.log('explorer canvas:', explorerCanvas)

await page.getByRole('button', { name: 'Engine', exact: true }).first().click()
await page.waitForTimeout(2000)
const pressed = await page.getByRole('button', { name: 'Engine', exact: true }).first().getAttribute('aria-pressed')
console.log('engine preset aria-pressed:', pressed)

await page.screenshot({ path: 'shots/live-site.png' })
const realErrors = errors.filter((e) => !/favicon|fonts\.googleapis|net::ERR_(?!INTERNET_DISCONNECTED)/i.test(e))
console.log('console/page errors:', realErrors.length ? realErrors : 'none')

await browser.close()
