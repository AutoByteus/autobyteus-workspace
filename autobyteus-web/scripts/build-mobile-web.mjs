#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
console.log(`${demo ? 'Demo' : 'Mobile'} web assets written to ${mobileOutputDir}`)
