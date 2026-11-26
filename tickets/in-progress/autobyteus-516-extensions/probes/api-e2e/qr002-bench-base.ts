// QR-002 "before": the base commit's (fdde5406fa) Electron-main voice service, bundled to plain Node: install the runtime
// the env pins (AUTOBYTEUS_VOICE_RUNTIME_TAG / _VERSION; default 0.3.0), then warm transcriptions of one WAV.
import * as fs from 'fs/promises'
import { VoiceInputRuntimeService } from './autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeService'
import { getExtensionCatalog } from './autobyteus-web/electron/extensions/extensionCatalog'
const [root, wavPath, runsText, installOnly] = process.argv.slice(2)
const service = new VoiceInputRuntimeService()
const descriptor = getExtensionCatalog().find((d) => d.id === 'voice-input')!
const t0 = Date.now()
if (!(await service.inspectInstallation(root)).ready) {
  const result = await service.installRuntime(descriptor, root, (p) => { if (p.phase) process.stderr.write(`${p.phase} `) })
  console.error(`\ninstalled ${JSON.stringify({ runtimeVersion: (result as any).runtimeVersion, ms: Date.now() - t0 })}`)
}
if (installOnly === 'install-only') process.exit(0)
const wav = await fs.readFile(wavPath)
const audioData = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength)
const times: number[] = []
for (let i = 0; i < 1 + Number(runsText); i++) {
  const start = process.hrtime.bigint()
  const r = await service.transcribe({ audioData, languageMode: 'en' }, root)
  const ms = Number(process.hrtime.bigint() - start) / 1e6
  console.log(JSON.stringify({ run: i, warm: i > 0, ms: Math.round(ms), ok: r.ok, text: r.text }))
  if (i > 0) times.push(ms)
}
times.sort((a, b) => a - b)
console.log(JSON.stringify({ summary: true, n: times.length, medianMs: Math.round(times[Math.floor(times.length / 2)]), minMs: Math.round(times[0]), maxMs: Math.round(times.at(-1)!) }))
await service.stopWorkerIfRunning(root)
process.exit(0)
