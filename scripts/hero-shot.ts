import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * Fast hero-only capture, for iterating on the opening framing.
 * Usage: npx tsx scripts/hero-shot.ts [outName]
 */
const out = process.argv[2] ?? 'hero'

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
mkdirSync('shots', { recursive: true })
await page.goto('http://127.0.0.1:4173/A340-600/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
await page.screenshot({ path: `shots/${out}.png` })
console.log('captured', out)
await browser.close()
