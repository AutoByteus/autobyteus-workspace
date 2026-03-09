import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import { afterEach, describe, expect, it } from 'vitest'
import { ManagedExtensionService } from '../managedExtensionService'

const execFileAsync = promisify(execFile)
const shouldRunRealReleaseTest = process.env.AUTOBYTEUS_VOICE_INPUT_REAL_E2E === '1' && process.platform === 'darwin'

type VoiceDescriptor = {
  name: string
  locale: string
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function readSayVoices(): Promise<VoiceDescriptor[]> {
  const { stdout } = await execFileAsync('say', ['-v', '?'])
  return stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const [name, locale] = line.trim().split(/\s{2,}/)
      return {
        name: name.trim(),
        locale: (locale || '').trim(),
      }
    })
}

async function resolveVoice(localePrefix: string): Promise<string> {
  const voices = await readSayVoices()
  const exactLocale = voices.find((voice) => voice.locale.toLowerCase().startsWith(localePrefix.toLowerCase()))
  if (!exactLocale) {
    throw new Error(`No macOS voice found for locale prefix ${localePrefix}`)
  }
  return exactLocale.name
}

async function renderSpeechToWav(text: string, localePrefix: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-real-release-audio-'))
  const sourcePath = path.join(tempDir, 'speech.aiff')
  const targetPath = path.join(tempDir, 'speech.wav')

  try {
    const voice = await resolveVoice(localePrefix)
    await execFileAsync('say', ['-v', voice, '-o', sourcePath, text])
    await execFileAsync('ffmpeg', ['-y', '-i', sourcePath, '-ac', '1', '-ar', '16000', targetPath])
    return await fs.readFile(targetPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function renderSilenceToWav(): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-real-release-silence-'))
  const targetPath = path.join(tempDir, 'silence.wav')

  try {
    await execFileAsync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '1', targetPath])
    return await fs.readFile(targetPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

describe('ManagedExtensionService real release smoke test', () => {
  const realReleaseTest = shouldRunRealReleaseTest ? it : it.skip
  let tempDir: string | null = null

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  realReleaseTest('installs from a published release and transcribes English, Chinese, and silence correctly', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-real-release-'))
    const service = new ManagedExtensionService(tempDir)
    const extensionRoot = path.join(tempDir, 'extensions', 'voice-input')

    const installedState = await service.install('voice-input')
    const installedVoiceInput = installedState.find((entry) => entry.id === 'voice-input')
    if (!installedVoiceInput || installedVoiceInput.status !== 'installed') {
      throw new Error(`Voice Input install failed: ${JSON.stringify(installedVoiceInput, null, 2)}`)
    }
    expect(installedVoiceInput.enabled).toBe(false)
    await expect(fs.access(path.join(extensionRoot, 'runtime'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(extensionRoot, 'models'))).resolves.toBeUndefined()

    await service.enable('voice-input')

    const englishAudio = await renderSpeechToWav('Hello world', 'en_')
    const englishResult = await service.transcribeVoiceInput({
      audioData: bufferToArrayBuffer(englishAudio),
      languageMode: 'en',
    })
    expect(englishResult.ok).toBe(true)
    expect(englishResult.text.toLowerCase()).toContain('hello')

    const chineseAudio = await renderSpeechToWav('你好世界', 'zh_')
    const chineseResult = await service.transcribeVoiceInput({
      audioData: bufferToArrayBuffer(chineseAudio),
      languageMode: 'zh',
    })
    expect(chineseResult.ok).toBe(true)
    expect(chineseResult.text).toMatch(/你好|世界/)

    const silenceAudio = await renderSilenceToWav()
    const silenceResult = await service.transcribeVoiceInput({
      audioData: bufferToArrayBuffer(silenceAudio),
      languageMode: 'auto',
    })
    expect(silenceResult.ok).toBe(true)
    expect(silenceResult.noSpeech).toBe(true)
    expect(silenceResult.text).toBe('')

    await service.remove('voice-input')
  }, 30 * 60 * 1000)
})
