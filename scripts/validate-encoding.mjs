import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
const roots = ['src', 'scripts', 'tests', '.github', 'public']
const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.json', '.html', '.md', '.yml', '.svg'])
const skip = new Set(['node_modules', 'dist', '.git', 'shots', 'test-results'])
const files = []
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (skip.has(e)) continue
    const full = join(dir, e)
    if (statSync(full).isDirectory()) walk(full)
    else if (exts.has(extname(full))) files.push(full)
  }
}
for (const r of roots) if (existsSync(r)) walk(r)
const strict = new TextDecoder('utf-8', { fatal: true })
let bad = 0
for (const f of files) {
  const b = readFileSync(f)
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) { console.log('BOM:', f); bad++; continue }
  try { strict.decode(b) } catch { console.log('INVALID UTF-8:', f); bad++ }
}
console.log(bad === 0 ? 'all ' + files.length + ' files are valid UTF-8, no BOMs' : bad + ' problem(s)')
