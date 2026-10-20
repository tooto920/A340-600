/**
 * Fails the build if any text file is not valid UTF-8 or carries a BOM.
 *
 * A BOM in package.json breaks Vite's PostCSS config loader with a
 * confusing "Unexpected token" error, so it is worth catching early.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const skip = new Set([
  'node_modules', 'dist', '.git', 'shots', 'test-results',
  'playwright-report', '.npm-cache', '.tmp', '.publish', 'ci-test',
])
const binary = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.glb', '.gltf', '.woff', '.woff2', '.mp4', '.pdf', '.zip'])
const files = []

function walk(dir, depth = 0) {
  if (depth > 4) return
  let entries
  try { entries = readdirSync(dir) } catch { return }
  for (const e of entries) {
    if (skip.has(e)) continue
    const full = join(dir, e)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) walk(full, depth + 1)
    else if (!binary.has(extname(full).toLowerCase())) files.push(full)
  }
}
walk('.')

const strict = new TextDecoder('utf-8', { fatal: true })
let problems = 0
for (const f of files) {
  let b
  try { b = readFileSync(f) } catch { continue }
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    console.error('BOM: ' + f)
    problems++
    continue
  }
  try {
    strict.decode(b)
  } catch {
    console.error('NOT VALID UTF-8: ' + f)
    problems++
  }
}

if (problems > 0) {
  console.error('\n' + problems + ' encoding problem(s). Run `npm run strip:bom` and re-check.')
  process.exit(1)
}
console.log('encoding OK ? ' + files.length + ' files are valid UTF-8 with no BOMs')
