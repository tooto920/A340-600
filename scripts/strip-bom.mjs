/**
 * Removes a UTF-8 BOM from every text file in the project.
 *
 * PowerShell's `Set-Content -Encoding utf8` writes a BOM on Windows
 * PowerShell 5.1. A BOM in package.json breaks Vite's PostCSS config
 * loader, so this runs after every file write.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const skip = new Set([
  'node_modules', 'dist', '.git', 'shots', 'test-results',
  'playwright-report', '.npm-cache', '.tmp', '.publish', 'ci-test',
])
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
    else files.push(full)
  }
}
walk('.')

let n = 0
for (const f of files) {
  let b
  try { b = readFileSync(f) } catch { continue }
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    writeFileSync(f, b.subarray(3))
    console.log('stripped:', f)
    n++
  }
}
console.log(n === 0 ? 'no BOMs found' : 'stripped ' + n + ' BOM(s)')
