import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { NodeRow } from '~/stores/nodeRowStatus'

const h = vi.hoisted(() => ({ list: null as any }))
vi.mock('~/stores/nodeListStore', () => ({ useNodeListStore: () => h.list }))

import NodeServerUpdate from '../NodeServerUpdate.vue'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useNodeServerUpdateStore } from '~/stores/nodeServerUpdateStore'

/** autobyteus-305 step 4, design "Row states": a remote node's server version and its update, under its row. */

const B = 'srv_studioBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const ADDRESS = 'http://192.168.2.31:29695'
const row: NodeRow = { key: B, nodeId: B, entryIds: ['remote-1'], windowAddress: ADDRESS, peer: null, name: 'studio', isEmbedded: false }
const idle = { state: 'idle', targetVersion: null, step: null, code: null, message: null }
const relation = (version: string): string => version === '1.5.12' ? 'same' : version > '1.5.12' ? 'older' : 'newer'
const available = (version: string, extra: object = {}) => ({
  inPlaceUpdate: 'available', version, target: { version: '1.5.12', relation: relation(version) }, update: idle, ...extra,
})

let answers: unknown[]
const posts: unknown[] = []

const mountLine = async (answer: unknown) => {
  answers = [answer]
  const wrapper = mount(NodeServerUpdate, { props: { row } })
  await flushPromises()
  return wrapper
}
/** The line's text as it reads, with a space between its parts (the version, the button, the note). */
const words = (node: Node): string => node.nodeType === Node.TEXT_NODE ? node.textContent ?? '' : [...node.childNodes].map(words).join(' ')
const text = (wrapper: Awaited<ReturnType<typeof mountLine>>) =>
  words(wrapper.get(`[data-testid="node-server-${B}"]`).element).replace(/\s+/g, ' ').trim()
const find = (wrapper: Awaited<ReturnType<typeof mountLine>>, id: string) => wrapper.find(`[data-testid="${id}-${B}"]`)

describe('NodeServerUpdate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAppUpdateStore().currentVersion = '1.5.12'
    h.list = { reachedAddressOf: vi.fn(() => ADDRESS) }
    posts.length = 0
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts.push(JSON.parse(String(init.body)))
        return new Response(JSON.stringify({ refused: 'NEEDS_NEW_IMAGE', message: 'This update needs a new Docker image.' }), { status: 409 })
      }
      return new Response(JSON.stringify(answers.length > 1 ? answers.shift() : answers[0]), { status: 200 })
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('DEC-018: a node older than this app shows its version, "Update to <version>" and "Same version as this app"', async () => {
    const wrapper = await mountLine(available('1.5.11-beta.4'))
    expect(text(wrapper)).toBe('Server 1.5.11-beta.4 Update to 1.5.12 Same version as this app')
  })

  it('the same version: the version only', async () => {
    expect(text(await mountLine(available('1.5.12')))).toBe('Server 1.5.12')
  })

  it('a node newer than this app: no button, "Newer than this app. Update this app."', async () => {
    const wrapper = await mountLine(available('1.5.13'))
    expect(text(wrapper)).toBe('Server 1.5.13 Newer than this app. Update this app.')
    expect(find(wrapper, 'node-server-update').exists()).toBe(false)
  })

  it('no starter (an embedded or development server): "Server version unknown", no button', async () => {
    const wrapper = await mountLine({ inPlaceUpdate: 'unavailable', version: null })
    expect(text(wrapper)).toBe('Server version unknown')
  })

  it('N-4: a starter that does not answer: "Server version unknown" and the message, no button', async () => {
    const wrapper = await mountLine({ inPlaceUpdate: 'error', version: null, message: "The node's starter did not answer: timeout" })
    expect(text(wrapper)).toBe("Server version unknown The node's starter did not answer: timeout")
  })

  it('an update blocker replaces the button with its message', async () => {
    const message = '/home/autobyteus/server-packages is not this node\'s own volume … Reinstall the launcher, then run: autobyteus-docker upgrade --all'
    const wrapper = await mountLine(available('1.5.11', { updateBlocker: { code: 'NO_PACKAGES_VOLUME', message } }))
    expect(find(wrapper, 'node-server-update').exists()).toBe(false)
    expect(find(wrapper, 'node-server-notice').text()).toBe(message)
  })

  it('a running update shows its step, also one started from the host command', async () => {
    const wrapper = await mountLine(available('1.5.11', { update: { ...idle, state: 'running', targetVersion: '1.5.12', step: 'downloading' } }))
    expect(text(wrapper)).toBe('Server 1.5.11 Downloading 1.5.12…')
    expect(find(wrapper, 'node-server-update').exists()).toBe(false)
  })

  it('while the node restarts: "Restarting…"', async () => {
    const wrapper = await mountLine(available('1.5.11'))
    useNodeServerUpdateStore().entries[B]!.connection = 'restarting'
    await flushPromises()
    expect(text(wrapper)).toBe('Restarting…')
  })

  it('the click sends this app version; a refusal shows its message, and NEEDS_NEW_IMAGE the launcher command to copy', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = await mountLine(available('1.5.11'))
    await find(wrapper, 'node-server-update').trigger('click')
    await flushPromises()
    expect(posts).toEqual([{ version: '1.5.12' }])
    expect(find(wrapper, 'node-server-notice').text()).toContain('The update to 1.5.12 did not happen. This update needs a new Docker image.')
    await find(wrapper, 'node-server-copy').trigger('click')
    expect(writeText).toHaveBeenCalledWith('autobyteus-docker upgrade --all --tag 1.5.12')
  })

  it('a finished update this window followed: "Updated to <version>."', async () => {
    const wrapper = await mountLine(available('1.5.11', { update: { ...idle, state: 'running', targetVersion: '1.5.12', step: 'confirming' } }))
    answers = [available('1.5.12', { update: { ...idle, state: 'succeeded', targetVersion: '1.5.12', step: 'confirming', message: 'Updated to 1.5.12.' } })]
    await useNodeServerUpdateStore().refresh(B)
    await flushPromises()
    expect(text(wrapper)).toBe('Server 1.5.12 Updated to 1.5.12.')
  })

  it('an unknown code from a newer node shows its message, and the button stays for this app version', async () => {
    const failed = await mountLine(available('1.5.11', { update: { ...idle, state: 'failed', targetVersion: '1.5.12', code: 'SOME_NEW_CODE', message: 'A message from a newer node.' } }))
    expect(find(failed, 'node-server-notice').text()).toBe('The update to 1.5.12 did not happen. A message from a newer node.')
    expect(find(failed, 'node-server-update').exists()).toBe(true)
  })

  it('a node this window does not reach shows nothing', async () => {
    h.list.reachedAddressOf = vi.fn(() => null)
    const wrapper = mount(NodeServerUpdate, { props: { row } })
    await flushPromises()
    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
