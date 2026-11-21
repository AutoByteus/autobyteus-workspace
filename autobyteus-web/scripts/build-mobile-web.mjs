#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compiledOperations, demoOperationCoverage, findDemoCode } from './mobile-build-checks.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, '..')
const generatedPublicDir = path.join(webRoot, 'dist', 'public')
// `--demo` (autobyteus-279): the iOS app's built-in demo, the same phone build with the demo node (`demo/`), served by the
// app itself from `autobyteus-demo://app/` (base `/`). Without it: the node's `/mobile` build, which has no demo code.
const demo = process.argv.includes('--demo')
const mobileOutputDir = path.join(webRoot, demo ? 'dist-mobile-demo' : 'dist-mobile', 'public')

const exists = async (target) => {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

function resolveExecutable(command) {
  if (process.platform !== 'win32') {
    return command
  }
  if (
    command.includes('\\') ||
    command.includes('/') ||
    command.endsWith('.exe') ||
    command.endsWith('.cmd')
  ) {
    return command
  }
  return `${command}.cmd`
}

const run = (command, args, env = {}) => new Promise((resolve, reject) => {
  const executable = resolveExecutable(command)
  const child = spawn(executable, args, {
    cwd: webRoot,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32' && executable.endsWith('.cmd'),
  })
  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) {
      resolve()
      return
    }
    reject(new Error(`Command failed (${code}): ${executable} ${args.join(' ')}`))
  })
})

await run('pnpm', ['generate'], {
  NODE_ENV: 'production',
  AUTOBYTEUS_MOBILE_WEB_BUILD: 'true',
  NUXT_APP_BASE_URL: demo ? '/' : '/mobile/',
  BACKEND_NODE_BASE_URL: '',
  AUTOBYTEUS_DEMO_BUILD: demo ? '1' : '',
})

if (!(await exists(generatedPublicDir))) {
  throw new Error(`Nuxt generated public directory not found: ${generatedPublicDir}`)
}
await rm(mobileOutputDir, { recursive: true, force: true })
await mkdir(path.dirname(mobileOutputDir), { recursive: true })
await cp(generatedPublicDir, mobileOutputDir, { recursive: true })

// Each build checks its own output (`mobile-build-checks.mjs`): the node's build has no demo code; the demo build answers
// every operation compiled into it.
if (demo) {
  const coverage = demoOperationCoverage(compiledOperations(mobileOutputDir), webRoot)
  const problems = [
    ...coverage.unanswered.map((name) => `compiled but neither answered nor listed as unreachable: ${name}`),
    ...coverage.stale.map((name) => `listed as unreachable but handled or no longer compiled: ${name}`),
    ...coverage.unexplained.map((name) => `listed with an undefined reason: ${name}`),
  ]
  if (problems.length) throw new Error(`The demo build's operations are not all answered:\n${problems.join('\n')}`)
  console.log(`The demo answers all ${coverage.compiled} compiled operations (handled or listed as unreachable).`)
} else {
  const found = findDemoCode(mobileOutputDir)
  if (found.length) throw new Error(`The /mobile build holds demo code:\n${found.map(({ file, marker }) => `${file}: ${marker}`).join('\n')}`)
  console.log('The /mobile build holds no demo code.')
}
console.log(`${demo ? 'Demo' : 'Mobile'} web assets written to ${mobileOutputDir}`)
