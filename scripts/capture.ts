import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/** Captures reference frames of the site for visual review. */
const shots: { name: string; action?: (page: import('@playwright/test').Page) => Promise<void> }[] = [
  { name: '01-hero' },
  {
    name: '02-legend',
    action: async (page) => {
      await page.locator('#legend').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '03-pencil',
    action: async (page) => {
      await page.locator('#pencil').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '04-four',
    action: async (page) => {
      await page.locator('#four').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '05-engineering',
    action: async (page) => {
      await page.locator('#engineering').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '06-explorer',
    action: async (page) => {
      await page.locator('#explorer').scrollIntoViewIfNeeded()
      await page.waitForTimeout(3500)
    },
  },
  {
    name: '07-explorer-engine',
    action: async (page) => {
      await page.locator('#explorer').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2000)
      await page.getByRole('button', { name: 'Engine', exact: true }).first().click()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '08-explorer-night',
    action: async (page) => {
      await page.locator('#explorer').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2000)
      await page.getByRole('switch', { name: /Night lighting/i }).click()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '09-longhaul',
    action: async (page) => {
      await page.locator('#longhaul').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
    },
  },
  {
    name: '10-horizon',
    action: async (page) => {
      await page.locator('#horizon').scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
    },
  },
]

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
mkdirSync('shots', { recursive: true })

await page.goto('http://127.0.0.1:4173/A340-600/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)

for (const shot of shots) {
  if (shot.action) await shot.action(page)
  await page.screenshot({ path: `shots/${shot.name}.png` })
  console.log('captured', shot.name)
}

await browser.close()
