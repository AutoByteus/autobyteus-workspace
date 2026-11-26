#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe, QR-002 attribution: the voice runtime's worker alone (serve, one JSON line per
// request, the protocol both the base path and the new server part use), 1 + N transcriptions of a WAV copied to a temp file.
//   node qr002-direct-worker.mjs <entrypoint> <backend> <model path> <clip.wav> <runs>
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const [entrypoint, backend, modelPath, clip, runs] = process.argv.slice(2)
const child = spawn(entrypoint, ['serve', '--backend', backend, '--model-path', modelPath], { stdio: ['pipe', 'pipe', 'pipe'] })
let buffer = ''; const waiters = []
child.stdout.on('data', (c) => { buffer += c; const lines = buffer.split('\n'); buffer = lines.pop(); for (const l of lines) { try { const m = JSON.parse(l); waiters.shift()?.(m) } catch {} } })
child.stderr.on('data', () => {})
const next = () => new Promise((r) => waiters.push(r))
const t0 = Date.now(); const ready = await next(); console.log(JSON.stringify({ ready: ready.type, ms: Date.now() - t0 }))
const times = []
for (let i = 0; i <= Number(runs); i++) {
  const file = path.join(os.tmpdir(), `qr002-${process.pid}-${i}.wav`)
  await fs.copyFile(clip, file)
  const s = process.hrtime.bigint()
  child.stdin.write(`${JSON.stringify({ requestId: `r${i}`, type: 'transcribe-file', audioPath: file, languageMode: 'en' })}\n`)
  const reply = await next()
  const ms = Number(process.hrtime.bigint() - s) / 1e6
  await fs.rm(file, { force: true })
  console.log(JSON.stringify({ run: i, warm: i > 0, ms: Math.round(ms), ok: reply.ok, text: reply.text }))
  if (i > 0) times.push(ms)
}
times.sort((a, b) => a - b)
console.log(JSON.stringify({ summary: true, n: times.length, medianMs: Math.round(times[Math.floor(times.length / 2)]), minMs: Math.round(times[0]), maxMs: Math.round(times.at(-1)) }))
child.stdin.end(); child.kill(); process.exit(0)
