#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: path.resolve(scriptDir, '..'),
      stdio: 'inherit',
      shell: process.platform === 'win32' && command.endsWith('.cmd'),
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`))
    })
  })
}

async function main() {
  if (process.platform === 'win32') {
    await run(process.execPath, [path.join(scriptDir, 'prepare-server.mjs')])
    return
  }

  await run('bash', [path.join(scriptDir, 'prepare-server.sh')])
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
