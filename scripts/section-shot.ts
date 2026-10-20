import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Captures a specific section after it has settled. */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
mkdirSync('shots', { recursive: true })
await page.goto('http://127.0.0.1:4173/A340-600/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

for (const id of ['longhaul', 'legend', 'pencil', 'engineering']) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded()
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `shots/sec-${id}.png` })
  console.log('captured', id)
}
await browser.close()
