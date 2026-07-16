// .github/supply-chain-check.mjs — zero-dep, Node 20
import { existsSync, readdirSync, readFileSync } from 'node:fs'

let ok = true
const fail = (m) => {
    console.error(`✗ ${m}`)
    ok = false
}
const pass = (m) => console.log(`✓ ${m}`)
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

// 1. lockfile committed
existsSync('pnpm-lock.yaml') ? pass('lockfile committed') : fail('pnpm-lock.yaml missing')

// 2. frozen install, no bare install (CI + any Dockerfile + release/publish workflows)
const installFiles = [
    '.github/workflows/check.yml',
    '.github/workflows/publish-packages.yml',
    '.github/workflows/publish-playground.yml',
    'Dockerfile',
]
for (const f of installFiles) {
    const s = read(f)
    if (!s) continue // file optional (no Dockerfile here)
    if (/pnpm install(?![^\n]*--frozen-lockfile)/.test(s)) fail(`${f} has a non-frozen 'pnpm install'`)
    else pass(`${f} install is frozen (or has no install)`)
}

// 3. script allow-list (pnpm 10 blocks third-party install scripts; keys make it explicit)
const ws = read('pnpm-workspace.yaml')
;/onlyBuiltDependencies:/.test(ws)
    ? pass('onlyBuiltDependencies present')
    : fail('onlyBuiltDependencies allow-list missing')

// 4. dependency cooldown via Dependabot (hold new releases before adopting)
const dependabot = read('.github/dependabot.yml')
;/cooldown:/.test(dependabot) ? pass('Dependabot cooldown configured') : fail('no cooldown in .github/dependabot.yml')

// 5. dependency vulnerability monitoring via Dependabot (npm ecosystem)
;/package-ecosystem:\s*["']?npm["']?/.test(dependabot)
    ? pass('Dependabot configured for npm ecosystem')
    : fail('no npm package-ecosystem in .github/dependabot.yml')

// 6. third-party actions SHA-pinned across all workflows (actions/* may stay on tags)
const wfDir = '.github/workflows'
for (const wf of existsSync(wfDir) ? readdirSync(wfDir) : []) {
    const s = read(`${wfDir}/${wf}`)
    for (const [, ref] of s.matchAll(/uses:\s*([^\s#]+)/g)) {
        const [repo, sha] = ref.split('@')
        if (repo.startsWith('./') || repo.startsWith('actions/')) continue
        if (!/^[0-9a-f]{40}$/.test(sha ?? '')) fail(`${repo} is not pinned to a 40-char SHA (in ${wf})`)
    }
}
if (ok) pass('all third-party actions SHA-pinned')

process.exit(ok ? 0 : 1)
