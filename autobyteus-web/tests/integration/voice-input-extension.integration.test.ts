// @vitest-environment node
/**
 * Voice Input on the extension foundation, renderer to node (autobyteus-516 DS-002, DS-004; AC-002, AC-007): the
 * renderer's voice store reads this computer's Voice Input from the embedded node and sends the recording to the
 * node's real action route, whose real Extension Manager installed a test-signed `voice-input` package (its server
 * part answers like the voice runtime) from a test-signed catalog. Controlled doubles: the GraphQL read (it returns
 * the manager's own list) and the HTTP hop (`fetch` goes through Fastify's `inject` into the real route). The real
 * voice server part and runtime are proved in AutoByteus/autobyteus-extensions and the server's real-release test.
 * Node environment: the Nuxt test environment's module runner cannot import a server part by file URL with a query.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { composeExtensions } from '../../../autobyteus-server-ts/src/compositions/extensions-composition'
import type { ExtensionManager } from '../../../autobyteus-server-ts/src/extensions/services/extension-manager'
import {
  CATALOG_URL,
  describeTestExtension,
  TEST_PLATFORM,
  TestCatalogPublisher,
  TestWeb,
  extensionRoutesApp,
} from '../../../autobyteus-server-ts/tests/fixtures/extension-packages'

const { addToastMock, manager } = vi.hoisted(() => ({ addToastMock: vi.fn(), manager: { current: null as ExtensionManager | null } }))
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: addToastMock }) }))
vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => ({ getEntryById: (id: string) => (id === 'embedded-local' ? { id, baseUrl: 'http://127.0.0.1:29695' } : null) }),
}))
vi.mock('~/services/nodeCollaboration/directNodeApolloClient', () => ({
  directNodeApolloClient: () => ({ query: async () => ({ data: { extensions: await manager.current!.list({ refreshCatalog: false }) } }) }),
}))

import { useVoiceInputStore } from '~/stores/voiceInputStore'

/** A voice-input package whose server part answers like the voice runtime: text in the chosen language. */
const VOICE_SERVER_PART = `
import fs from 'node:fs/promises';
import path from 'node:path';
const language = async (ctx) => JSON.parse(await fs.readFile(path.join(ctx.dir, 'settings.json'), 'utf8').catch(() => '{}')).language ?? 'auto';
export default {
  async install(ctx) { ctx.progress({ message: 'Preparing the speech model', percent: null }); },
  async status() { return { ready: true, message: 'Ready.' }; },
  async stop() {},
  actions: {
    async transcribe(ctx, input) {
      if (!input.bytes || input.bytes.length < 4) return { text: '', noSpeech: true, detectedLanguage: null };
      return (await language(ctx)) === 'zh' ? { text: 'ni hao', noSpeech: false, detectedLanguage: 'zh' } : { text: 'fixture transcript', noSpeech: false, detectedLanguage: 'en' };
    },
    async setLanguage(ctx, input) { await fs.writeFile(path.join(ctx.dir, 'settings.json'), JSON.stringify(input.json)); return input.json; },
  },
};`

describe('voice input extension integration (renderer → node action route → Extension Manager)', () => {
  let root: string
  let app: Awaited<ReturnType<typeof extensionRoutesApp>>

  const capture = (store: ReturnType<typeof useVoiceInputStore>, bytes: number[]) => {
    store.audioWorklet = { port: { postMessage: vi.fn(() => queueMicrotask(() => store.flushPromiseResolve?.({
      audioData: new Uint8Array(bytes).buffer,
      diagnostics: { inputSampleRate: 48000, wavSampleRate: 48000, durationMs: 1000, rms: 0.03, peak: 0.4, sampleCount: 48000 },
    }))) } } as any
    store.stream = { getTracks: () => [{ stop: vi.fn() }] } as any
    store.audioContext = { close: vi.fn().mockResolvedValue(undefined) } as any
    store.isRecording = true
    store.recordingSource = 'composer'
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    addToastMock.mockReset()
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-extension-integration-'))
    const web = new TestWeb()
    const publisher = new TestCatalogPublisher(web)
    publisher.publishCatalog([await publisher.publishPackage(describeTestExtension({
      id: 'voice-input', name: 'Voice Input', offeredOn: 'desktop-node',
    }), { serverSource: VOICE_SERVER_PART })])
    manager.current = composeExtensions({
      dataDir: root, platform: TEST_PLATFORM, isDesktopNode: true,
      catalogSource: { url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem }, fetch: web.fetch,
    })
    app = await extensionRoutesApp(manager.current!)
    vi.stubGlobal('fetch', async (input: string, init: RequestInit) => {
      const url = new URL(input)
      const answer = await app.inject({
        method: init.method as 'POST', url: url.pathname, headers: init.headers as Record<string, string>,
        payload: init.body instanceof ArrayBuffer ? Buffer.from(init.body) : (init.body as string),
      })
      return new Response(answer.body, { status: answer.statusCode, headers: { 'content-type': String(answer.headers['content-type']) } })
    })
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await app.close()
    await manager.current?.stopAll()
    await fs.rm(root, { recursive: true, force: true })
  })

  it('installs (On at once), shows the microphone, and inserts the transcript into the draft, never sent', async () => {
    const voice = useVoiceInputStore()
    await voice.refreshAvailability()
    expect(voice.isAvailable).toBe(false)

    await manager.current!.list({ refreshCatalog: true })
    await manager.current!.install('voice-input')
    await vi.waitFor(async () => expect((await manager.current!.list({ refreshCatalog: false })).extensions[0]).toMatchObject({ state: 'installed', enabled: true }))
    await voice.refreshAvailability()
    expect(voice.isAvailable).toBe(true)

    let draft = 'draft'
    capture(voice, [1, 2, 3, 4, 5])
    voice.transcriptTarget = { key: 'composer', isCurrent: () => true, appendTranscript: (text) => { draft += ` ${text}` } }
    await voice.stopRecording()
    expect(draft).toBe('draft fixture transcript')
    expect(voice.latestResult).toMatchObject({ outcome: 'transcript-ready', detectedLanguage: 'en' })
    expect(addToastMock).not.toHaveBeenCalled()

    // The language chosen on the extension's page applies to the next dictation.
    await manager.current!.callAction('voice-input', 'setLanguage', { json: { language: 'zh' }, bytes: null })
    capture(voice, [1, 2, 3, 4, 5])
    voice.transcriptTarget = { key: 'composer', isCurrent: () => true, appendTranscript: (text) => { draft += ` ${text}` } }
    await voice.stopRecording()
    expect(draft).toBe('draft fixture transcript ni hao')
  }, 30_000)

  it('reports no speech, and hides the microphone at once when Voice Input was turned off elsewhere', async () => {
    const voice = useVoiceInputStore()
    await manager.current!.list({ refreshCatalog: true })
    await manager.current!.install('voice-input')
    await vi.waitFor(async () => expect((await manager.current!.list({ refreshCatalog: false })).extensions[0]?.state).toBe('installed'))
    await voice.refreshAvailability()

    capture(voice, [0])
    voice.transcriptTarget = { key: 'composer', isCurrent: () => true, appendTranscript: vi.fn() }
    await voice.stopRecording()
    expect(voice.latestResult?.outcome).toBe('no-speech')
    expect(addToastMock).toHaveBeenCalledWith(expect.any(String), 'info')

    await manager.current!.setEnabled('voice-input', false)
    expect(voice.isAvailable).toBe(true)
    capture(voice, [1, 2, 3, 4, 5])
    voice.transcriptTarget = { key: 'composer', isCurrent: () => true, appendTranscript: vi.fn() }
    await voice.stopRecording()
    expect(voice.latestResult).toMatchObject({ outcome: 'error', error: 'voice-input is turned off on this node.' })
    expect(voice.isAvailable).toBe(false)
  }, 30_000)
})
