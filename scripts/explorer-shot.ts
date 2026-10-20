import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Captures explorer views only, for quick framing iteration. */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
mkdirSync('shots', { recursive: true })
await page.goto('http://127.0.0.1:4173/A340-600/', { waitUntil: 'networkidle' })
await page.locator('#explorer').scrollIntoViewIfNeeded()
await page.waitForTimeout(4000)

const box = (await page.locator('#explorer canvas').boundingBox())!
await page.screenshot({ path: 'shots/exp-reset.png', clip: box })

for (const view of ['Engine', 'Cockpit', 'Side', 'Top']) {
  await page.getByRole('button', { name: view, exact: true }).first().click()
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `shots/exp-${view.toLowerCase()}.png`, clip: box })
  console.log('captured', view)
}
await browser.close()
