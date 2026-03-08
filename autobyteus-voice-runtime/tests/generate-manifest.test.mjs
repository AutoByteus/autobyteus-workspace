import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-extension-personal/autobyteus-voice-runtime'
const scriptPath = path.join(projectRoot, 'scripts', 'generate-manifest.mjs')

test('generate-manifest emits release-backed URLs and checksums', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-runtime-manifest-'))
  const distDir = path.join(tempDir, 'dist')
  const metadataPath = path.join(tempDir, 'runtime-assets.json')
  const outputPath = path.join(distDir, 'voice-input-runtime-manifest.json')

  await fs.mkdir(distDir, { recursive: true })
  await fs.writeFile(path.join(distDir, 'whisper-cli-darwin-arm64'), '#!/usr/bin/env bash\necho ok\n', 'utf8')
  await fs.writeFile(path.join(distDir, 'ggml-tiny.en-q5_1.bin'), 'model-bytes', 'utf8')
  await fs.writeFile(
    metadataPath,
    JSON.stringify({
      whisperCppVersion: '1.8.3',
      model: {
        id: 'tiny.en-q5_1',
        fileName: 'ggml-tiny.en-q5_1.bin',
        sourceUrl: 'https://example.invalid/model.bin',
      },
      assets: [
        {
          platform: 'darwin',
          arch: 'arm64',
          fileName: 'whisper-cli-darwin-arm64',
          entrypoint: 'whisper-cli-darwin-arm64',
          distributionType: 'file',
        },
      ],
    }, null, 2),
    'utf8',
  )

  await execFileAsync('node', [scriptPath, outputPath], {
    env: {
      ...process.env,
      AUTOBYTEUS_VOICE_RUNTIME_VERSION: '0.1.1',
      AUTOBYTEUS_RELEASE_REPOSITORY: 'AutoByteus/autobyteus-workspace',
      AUTOBYTEUS_RELEASE_TAG: 'voice-runtime-v0.1.1',
      AUTOBYTEUS_VOICE_RUNTIME_DIST_DIR: distDir,
      AUTOBYTEUS_VOICE_RUNTIME_METADATA_PATH: metadataPath,
    },
  })

  const manifest = JSON.parse(await fs.readFile(outputPath, 'utf8'))

  assert.equal(manifest.runtimeVersion, '0.1.1')
  assert.equal(manifest.assets.length, 1)
  assert.equal(
    manifest.assets[0].url,
    'https://github.com/AutoByteus/autobyteus-workspace/releases/download/voice-runtime-v0.1.1/whisper-cli-darwin-arm64',
  )
  assert.match(manifest.assets[0].sha256, /^[a-f0-9]{64}$/)
  assert.equal(
    manifest.model.url,
    'https://github.com/AutoByteus/autobyteus-workspace/releases/download/voice-runtime-v0.1.1/ggml-tiny.en-q5_1.bin',
  )
  assert.equal(manifest.model.version, 'tiny.en-q5_1')
  assert.equal(manifest.model.sizeBytes, 'model-bytes'.length)
})
