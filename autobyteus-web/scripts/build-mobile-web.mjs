#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, '..')
const generatedPublicDir = path.join(webRoot, 'dist', 'public')
const mobileOutputDir = path.join(webRoot, 'dist-mobile', 'public')

const exists = async (target) => {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

const run = (command, args, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: webRoot,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  })
  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) {
      resolve()
      return
    }
    reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`))
  })
})

await run('pnpm', ['generate'], {
  NODE_ENV: 'production',
  AUTOBYTEUS_MOBILE_WEB_BUILD: 'true',
  NUXT_APP_BASE_URL: '/mobile/',
  BACKEND_NODE_BASE_URL: '',
})

if (!(await exists(generatedPublicDir))) {
  throw new Error(`Nuxt generated public directory not found: ${generatedPublicDir}`)
}
await rm(mobileOutputDir, { recursive: true, force: true })
await mkdir(path.dirname(mobileOutputDir), { recursive: true })
await cp(generatedPublicDir, mobileOutputDir, { recursive: true })
console.log(`Mobile web assets written to ${mobileOutputDir}`)
