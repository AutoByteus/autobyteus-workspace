import { describe, expect, it, vi } from 'vitest'
import { NodeCredentialAttacher, requestOrigin } from '../nodeCredentialAttacher'

type Listener = (details: { url: string; requestHeaders: Record<string, string> }, callback: (response: { requestHeaders: Record<string, string> }) => void) => void

const sessionWithHook = () => {
  let listener: Listener | null = null
  const onBeforeSendHeaders = vi.fn((_filter: unknown, registered: Listener) => { listener = registered })
  return {
    session: { webRequest: { onBeforeSendHeaders } } as never,
    send: (url: string, requestHeaders: Record<string, string> = {}) => new Promise<Record<string, string>>((resolve) => {
      listener!({ url, requestHeaders }, (response) => resolve(response.requestHeaders))
    }),
  }
}

describe('NodeCredentialAttacher (design DS-002, PROBE-03)', () => {
  it('NAS-01 adds the node credential to the app window requests to that node: HTTP and WebSocket upgrades', async () => {
    const hook = sessionWithHook()
    const attacher = new NodeCredentialAttacher(hook.session)
    attacher.install()
    attacher.setCredentials([{ baseUrl: 'http://127.0.0.1:29695', credential: 'own_launch' }, { baseUrl: 'http://docker:8001/', credential: 'own_docker' }])
    await expect(hook.send('http://127.0.0.1:29695/graphql')).resolves.toEqual({ Authorization: 'Bearer own_launch' })
    await expect(hook.send('ws://127.0.0.1:29695/ws/terminal/x')).resolves.toEqual({ Authorization: 'Bearer own_launch' })
    await expect(hook.send('http://docker:8001/rest/files/a.png', { Accept: 'image/*' })).resolves.toEqual({ Accept: 'image/*', Authorization: 'Bearer own_docker' })
  })

  it('adds nothing to other origins, and replaces a page\'s own Authorization on a node origin', async () => {
    const hook = sessionWithHook()
    const attacher = new NodeCredentialAttacher(hook.session)
    attacher.install()
    attacher.setCredentials([{ baseUrl: 'http://127.0.0.1:29695', credential: 'own_launch' }])
    await expect(hook.send('https://example.com/x', { Authorization: 'Bearer theirs' })).resolves.toEqual({ Authorization: 'Bearer theirs' })
    await expect(hook.send('http://127.0.0.1:29696/x')).resolves.toEqual({})
    await expect(hook.send('http://127.0.0.1:29695/x', { authorization: 'Bearer page' })).resolves.toEqual({ Authorization: 'Bearer own_launch' })
  })

  it('NAS-30 a node without a credential (not connected yet) gets nothing', async () => {
    const hook = sessionWithHook()
    const attacher = new NodeCredentialAttacher(hook.session)
    attacher.install()
    attacher.setCredentials([])
    await expect(hook.send('http://docker:8001/graphql')).resolves.toEqual({})
  })

  it('treats ws/wss as their http/https origin', () => {
    expect(requestOrigin('wss://Node.Example/ws/x')).toBe('https://node.example')
    expect(requestOrigin('ws://127.0.0.1:29695/ws/x')).toBe('http://127.0.0.1:29695')
    expect(requestOrigin('file:///x')).toBeNull()
  })
})
