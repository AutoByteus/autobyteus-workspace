import { afterEach, describe, expect, it, vi } from 'vitest'
import { callExtensionAction, ExtensionActionError } from '../extensionActionClient'

/** An action call to a node (extension-contract.md §6): JSON or a WAV body; `{ output }` or `{ code, message }`. */
describe('callExtensionAction', () => {
  afterEach(() => vi.unstubAllGlobals())
  const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }))

  it('posts JSON to the node\'s action route and returns the output', async () => {
    const fetch = answer(200, { output: { language: 'zh' } })
    vi.stubGlobal('fetch', fetch)
    await expect(callExtensionAction('http://127.0.0.1:29695/', 'voice-input', 'setLanguage', { json: { language: 'zh' } })).resolves.toEqual({ language: 'zh' })
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:29695/rest/extensions/voice-input/actions/setLanguage', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"language":"zh"}',
    })
  })

  it('posts a recording as audio/wav', async () => {
    const fetch = answer(200, { output: { text: 'hello', noSpeech: false, detectedLanguage: 'en' } })
    vi.stubGlobal('fetch', fetch)
    const wav = new ArrayBuffer(16)
    await callExtensionAction('http://10.0.0.2:8000', 'voice-input', 'transcribe', { wav })
    expect(fetch).toHaveBeenCalledWith('http://10.0.0.2:8000/rest/extensions/voice-input/actions/transcribe', {
      method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav,
    })
  })

  it('throws the node\'s code and message, or NODE_UNREACHABLE', async () => {
    vi.stubGlobal('fetch', answer(409, { code: 'EXTENSION_OFF', message: 'voice-input is turned off on this node.' }))
    await expect(callExtensionAction('http://n:1', 'voice-input', 'transcribe', { wav: new ArrayBuffer(1) }))
      .rejects.toMatchObject({ code: 'EXTENSION_OFF', message: 'voice-input is turned off on this node.' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    const failure = (await callExtensionAction('http://n:1', 'voice-input', 'transcribe', { wav: new ArrayBuffer(1) }).catch((error: unknown) => error)) as ExtensionActionError
    expect(failure).toBeInstanceOf(ExtensionActionError)
    expect(failure.code).toBe('NODE_UNREACHABLE')
  })
})
