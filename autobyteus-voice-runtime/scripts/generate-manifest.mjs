#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = process.env.AUTOBYTEUS_VOICE_RUNTIME_DIST_DIR || path.join(projectRoot, 'dist')
const metadataPath = process.env.AUTOBYTEUS_VOICE_RUNTIME_METADATA_PATH || path.join(projectRoot, 'metadata', 'runtime-assets.json')
const outputPath = process.argv[2] || path.join(distDir, 'voice-input-runtime-manifest.json')
const runtimeVersion = process.env.AUTOBYTEUS_VOICE_RUNTIME_VERSION || '0.1.0'
const releaseRepository = process.env.AUTOBYTEUS_RELEASE_REPOSITORY || 'AutoByteus/autobyteus-workspace'
const releaseTag = process.env.AUTOBYTEUS_RELEASE_TAG || `voice-runtime-v${runtimeVersion}`

function sha256(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function buildReleaseAssetUrl(fileName) {
  return `https://github.com/${releaseRepository}/releases/download/${releaseTag}/${fileName}`
}

function listRuntimeAssets() {
  if (!fs.existsSync(distDir) || !fs.existsSync(metadataPath)) {
    return []
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
  return metadata.assets.map((asset) => {
    const assetPath = path.join(distDir, asset.fileName)
    return {
      platform: asset.platform,
      arch: asset.arch,
      fileName: asset.fileName,
      url: buildReleaseAssetUrl(asset.fileName),
      sha256: fs.existsSync(assetPath) ? sha256(assetPath) : '',
      entrypoint: asset.entrypoint,
      distributionType: asset.distributionType,
    }
  })
}

const metadata = fs.existsSync(metadataPath)
  ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
  : { model: { fileName: 'ggml-tiny.en-q5_1.bin', id: 'tiny.en-q5_1' } }
const modelFileName = process.env.AUTOBYTEUS_VOICE_MODEL_FILE || metadata.model.fileName
const modelPath = path.join(distDir, modelFileName)
const model = fs.existsSync(modelPath)
  ? {
      fileName: modelFileName,
      url: buildReleaseAssetUrl(modelFileName),
      sha256: sha256(modelPath),
      sizeBytes: fs.statSync(modelPath).size,
      version: metadata.model.id || modelFileName,
    }
  : {
      fileName: modelFileName,
      url: buildReleaseAssetUrl(modelFileName),
      sha256: '',
      sizeBytes: 0,
      version: metadata.model.id || modelFileName,
    }

const manifest = {
  schemaVersion: 1,
  runtimeId: 'voice-input',
  runtimeVersion,
  generatedAt: new Date().toISOString(),
  assets: listRuntimeAssets(),
  model,
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
