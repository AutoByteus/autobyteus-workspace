#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe: a synthesized old desktop Voice Input install (AC-008) in a test-owned base
// data folder, in the released v2-with-microphone registry shape (v1.2.29; keys and folder layout checked read-only against
// a real install), with small stand-in files instead of the runtime and model. Never real user data.
//   node old-install.mjs <base data folder> [--locked]   (--locked: models/ made read-only, so its deletion fails)
import fs from 'node:fs'
import path from 'node:path'
const [base] = process.argv.slice(2)
const folder = path.join(base, 'extensions')
const vi = path.join(folder, 'voice-input')
for (const dir of ['downloads', 'temp', 'runtime/bin', 'models/whisper-small-mlx']) fs.mkdirSync(path.join(vi, dir), { recursive: true })
fs.writeFileSync(path.join(folder, 'registry.json'), JSON.stringify({ version: 2, extensions: { 'voice-input': {
  id: 'voice-input', status: 'installed', enabled: true, settings: { languageMode: 'en', audioInputDeviceId: 'mic-usb-stand-in' },
  message: 'Voice Input is ready.', installProgress: null, installedAt: '2026-08-01T10:00:00.000Z', runtimeVersion: '0.3.0',
  modelVersion: 'mlx-community/whisper-small-mlx', runtimeEntrypoint: path.join(vi, 'runtime/bin/voice-input-worker'),
  modelPath: path.join(vi, 'models/whisper-small-mlx'), backendKind: 'mlx', lastError: null } } }, null, 2))
fs.writeFileSync(path.join(vi, 'installation.json'), JSON.stringify({ runtimeVersion: '0.3.0', backendKind: 'mlx' }))
fs.writeFileSync(path.join(vi, 'runtime/bin/voice-input-worker'), '#!/bin/sh\necho stand-in\n', { mode: 0o755 })
fs.writeFileSync(path.join(vi, 'models/whisper-small-mlx/weights.npz'), 'stand-in weights')
fs.writeFileSync(path.join(folder, '.DS_Store'), 'finder')
fs.writeFileSync(path.join(vi, '.DS_Store'), 'finder')
if (process.argv.includes('--locked')) fs.chmodSync(path.join(vi, 'models/whisper-small-mlx'), 0o555)
console.log(folder)
