import { chromium } from '@playwright/test'

/**
 * Reports the scene's render statistics.
 *
 * Draw calls, triangle counts and memory footprint are the numbers that
 * actually determine real-hardware performance, and they are independent of
 * the host GPU — unlike a frame rate measured on a software rasteriser.
 */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto('http://127.0.0.1:4173/A340-600/', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)

const read = () => page.evaluate(`(() => window.__a340Stats ?? null)()`)

console.log('--- cinematic scene ---')
console.log(JSON.stringify(await read(), null, 2))

await page.locator('#explorer').scrollIntoViewIfNeeded()
await page.waitForTimeout(4500)
console.log('--- explorer scene ---')
console.log(JSON.stringify(await read(), null, 2))

const gpu = await page.evaluate(`(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown';
})()`)
console.log('renderer:', gpu)

await browser.close()
