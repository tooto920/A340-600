/**
 * Publishes the production build to the gh-pages branch.
 *
 * Used as a fallback when the GitHub Actions workflow cannot run (for
 * example when the account is locked for billing). The official Actions
 * workflow remains the primary deployment path; see .github/workflows/deploy.yml.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, cpSync, rmSync, writeFileSync } from 'node:fs'

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' })

if (!existsSync('dist')) {
  console.error('dist/ not found — run `npm run build` first')
  process.exit(1)
}

const branch = 'gh-pages'
const worktree = '.publish'

// Reuse an existing worktree if one is already there.
try {
  run('git', ['worktree', 'remove', '--force', worktree])
} catch {
  /* no worktree yet */
}
rmSync(worktree, { recursive: true, force: true })

run('git', ['worktree', 'add', '-B', branch, worktree])

// Replace the branch contents with the build output.
rmSync(`${worktree}/assets`, { recursive: true, force: true })
rmSync(`${worktree}/index.html`, { force: true })
cpSync('dist', worktree, { recursive: true })

// A .nojekyll file stops GitHub Pages from running Jekyll over the build,
// which would otherwise ignore files starting with an underscore.
writeFileSync(`${worktree}/.nojekyll`, '')

run('git', ['-C', worktree, 'add', '-A'])
run('git', ['-C', worktree, 'commit', '-m', 'Publish production build'])
run('git', ['push', 'origin', branch])

run('git', ['worktree', 'remove', '--force', worktree])
console.log('published dist/ to', branch)
