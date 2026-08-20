#!/usr/bin/env node
import { prepareElectronE2ELaunch } from './electron-e2e/electronE2ELaunchPreparation.mjs'
import { launchPreparedElectronDirect } from './electron-e2e/directElectronProcessAdapter.mjs'
import { launchPreparedElectronWithPlaywright } from './electron-e2e/playwrightElectronProcessAdapter.mjs'

function parseArgs(argv) {
  const options = { build: true, adapter: 'direct', holdMs: 0 }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--skip-build') options.build = false
    else if (arg === '--adapter') options.adapter = argv[++index]
    else if (arg === '--executable') options.executablePath = argv[++index]
    else if (arg === '--port') options.port = Number(argv[++index])
    else if (arg === '--data-root') options.dataRoot = argv[++index]
    else if (arg === '--hold-ms') options.holdMs = Number(argv[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!['direct', 'playwright'].includes(options.adapter)) {
    throw new Error('--adapter must be direct or playwright')
  }
  return options
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const prepared = await prepareElectronE2ELaunch(options)
  let session
  try {
    if (options.adapter === 'playwright') {
      const { _electron } = await import('playwright-core')
      session = await launchPreparedElectronWithPlaywright(prepared, _electron)
    } else {
      session = await launchPreparedElectronDirect(prepared)
    }
    await session.waitUntilReady()
    if (options.adapter === 'playwright') await session.firstWindow()
    console.log(JSON.stringify({ type: 'electron-e2e-ready', ...session.metadata }))
    if (options.holdMs > 0) await delay(options.holdMs)
  } finally {
    if (session) await session.cleanup()
    else await prepared.disposeOwnedDataRoot()
  }
}

main().catch((error) => {
  console.error(`[electron-e2e] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
