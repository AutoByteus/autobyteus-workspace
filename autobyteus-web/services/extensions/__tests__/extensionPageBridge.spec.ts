import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectExtensionPage } from '../extensionPageBridge'

/** The page bridge (extension-contract.md §5): only its own frame, replies to that frame, `resize` clamped, `locale` once. */
describe('connectExtensionPage', () => {
  const frames: HTMLIFrameElement[] = []
  afterEach(() => frames.splice(0).forEach((frame) => frame.remove()))
  const setup = (call = vi.fn(async () => ({ language: 'en' }))) => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    frames.push(frame)
    const page = frame.contentWindow!
    const posted = vi.spyOn(page, 'postMessage')
    const resize = vi.fn()
    const bridge = connectExtensionPage({ frame: () => frame, call, resize })
    const send = (data: unknown, source: unknown = page) => window.dispatchEvent(new MessageEvent('message', { data, source: source as Window }))
    return { bridge, call, resize, posted, send }
  }

  it('turns its own frame\'s { id, call, input } into one action and replies to that frame', async () => {
    const { bridge, call, posted, send } = setup()
    send({ id: '7', call: 'setLanguage', input: { language: 'en' } })
    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({ id: '7', ok: true, output: { language: 'en' } }, '*'))
    expect(call).toHaveBeenCalledWith('setLanguage', { language: 'en' })
    bridge.dispose()
  })

  it('answers a refused action with { ok: false, error }', async () => {
    const { bridge, posted, send } = setup(vi.fn(async () => { throw new Error('voice-input has no action nothing.') }))
    send({ id: '8', call: 'nothing', input: null })
    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({ id: '8', ok: false, error: 'voice-input has no action nothing.' }, '*'))
    bridge.dispose()
  })

  it('ignores messages from any other window', async () => {
    const { bridge, call, posted, send } = setup()
    send({ id: '9', call: 'setLanguage', input: {} }, window)
    send({ id: '9', call: 'setLanguage', input: {} }, null)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(call).not.toHaveBeenCalled()
    expect(posted).not.toHaveBeenCalled()
    bridge.dispose()
  })

  it('takes { resize } without an id as the page height, clamped to 48–2000 px, with no reply', () => {
    const { bridge, call, resize, posted, send } = setup()
    send({ resize: { height: 320.4 } })
    send({ resize: { height: 10 } })
    send({ resize: { height: 99999 } })
    send({ resize: { height: 'tall' } })
    expect(resize.mock.calls).toEqual([[320], [48], [2000]])
    expect(call).not.toHaveBeenCalled()
    expect(posted).not.toHaveBeenCalled()
    bridge.dispose()
  })

  it('sends the app\'s language once when the page loads, and stops listening when disposed', async () => {
    const { bridge, call, posted, send } = setup()
    bridge.pageLoaded('zh-CN')
    expect(posted).toHaveBeenCalledExactlyOnceWith({ locale: 'zh-CN' }, '*')
    bridge.dispose()
    send({ id: '1', call: 'getSettings', input: null })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(call).not.toHaveBeenCalled()
  })
})
