import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
const roots = ['src', 'scripts', 'tests', '.github', 'public']
const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.json', '.html', '.md', '.yml', '.svg'])
const files = []
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) walk(full)
    else if (exts.has(extname(full))) files.push(full)
  }
}
for (const r of roots) if (existsSync(r)) walk(r)
let n = 0
for (const f of files) {
  const b = readFileSync(f)
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    writeFileSync(f, b.subarray(3)); console.log('stripped:', f); n++
  }
}
console.log('stripped ' + n + ' BOM(s)')
