#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const metadataPath = process.env.AUTOBYTEUS_VOICE_RUNTIME_METADATA_PATH || path.join(projectRoot, 'metadata', 'runtime-assets.json')
const distDir = process.env.AUTOBYTEUS_VOICE_RUNTIME_DIST_DIR || path.join(projectRoot, 'dist')

async function main() {
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
  const modelFileName = process.env.AUTOBYTEUS_VOICE_MODEL_FILE?.trim() || metadata.model.fileName
  const modelSourceUrl = process.env.AUTOBYTEUS_VOICE_MODEL_SOURCE_URL?.trim() || metadata.model.sourceUrl
  const targetPath = path.join(distDir, modelFileName)

  await fs.mkdir(distDir, { recursive: true })

  const response = await fetch(modelSourceUrl)
  if (!response.ok) {
    throw new Error(`Failed to download model from ${modelSourceUrl}: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  await fs.writeFile(targetPath, Buffer.from(arrayBuffer))
  console.log(`Downloaded model to ${targetPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
