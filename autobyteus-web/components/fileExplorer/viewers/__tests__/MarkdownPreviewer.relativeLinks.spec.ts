import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import MarkdownPreviewer from '~/components/fileExplorer/viewers/MarkdownPreviewer.vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

/**
 * A relative link in a workspace file's Markdown preview opens the linked file of the same workspace as a preview tab
 * (autobyteus-576 FU-002, REQ-002, AC-002), through the real renderer: the `#fragment` is not part of the file, a link
 * that leaves the workspace root opens nothing, and external, `#heading` and root-absolute links and previews that are
 * not workspace files behave as before.
 */
vi.mock('~/components/conversation/segments/renderer/MermaidDiagram.vue', () => ({
  default: { name: 'MermaidDiagram', template: '<div></div>', props: ['content'] },
}))

const DOCUMENT = [
  '# Index',
  '[sibling](../b/c.md#x)',
  '[nested](notes/today%20plan.md)',
  '[outside](../../outside.md)',
  '[root](/etc/hosts)',
  '[external](https://example.com/page)',
  '[heading](#index)',
].join('\n\n')

let pinia: Pinia
let wrappers: VueWrapper[]
let openFilePreview: ReturnType<typeof vi.fn>
let openExternalLink: ReturnType<typeof vi.fn>
const priorElectronApi = window.electronAPI

const render = (props: Record<string, unknown>) => {
  const wrapper = mount(MarkdownPreviewer, { props: { content: DOCUMENT, ...props }, global: { plugins: [pinia] }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
const click = (wrapper: VueWrapper, href: string): boolean => {
  const anchor = [...wrapper.element.querySelectorAll('a')].find((a) => a.getAttribute('href') === href)
  if (!anchor) throw new Error(`no link ${href}`)
  return !anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}
const workspaceFile = { path: 'a/index.md', relativeResourceContext: { kind: 'workspace', workspaceId: 'ws-1' } }

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  useWindowNodeContextStore().bindNodeContext('node-1', 'http://node.example')
  wrappers = []
  openFilePreview = vi.fn(async () => undefined)
  useFileExplorerStore().openFilePreview = openFilePreview as never
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView']
  openExternalLink = vi.fn()
  window.electronAPI = { ...priorElectronApi, openExternalLink } as typeof window.electronAPI
})
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  window.electronAPI = priorElectronApi
})

describe('MarkdownPreviewer relative links', () => {
  it('opens a relative link, relative to the document and without its fragment, as a preview tab of the same workspace', () => {
    const wrapper = render(workspaceFile)
    expect(click(wrapper, '../b/c.md#x')).toBe(true)
    expect(openFilePreview).toHaveBeenCalledWith('b/c.md', 'ws-1')
    click(wrapper, 'notes/today%20plan.md')
    expect(openFilePreview).toHaveBeenLastCalledWith('a/notes/today plan.md', 'ws-1')
    expect(openFilePreview).toHaveBeenCalledTimes(2)
  })

  it('opens nothing for a link that leaves the workspace root, or a root-absolute one', () => {
    const wrapper = render(workspaceFile)
    expect(click(wrapper, '../../outside.md')).toBe(true)
    expect(click(wrapper, '/etc/hosts')).toBe(true)
    expect(openFilePreview).not.toHaveBeenCalled()
  })

  it('keeps external and #heading links as before', () => {
    const wrapper = render(workspaceFile)
    click(wrapper, 'https://example.com/page')
    expect(openExternalLink).toHaveBeenCalledWith('https://example.com/page')
    click(wrapper, '#index')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(openFilePreview).not.toHaveBeenCalled()
  })

  it('opens nothing in a preview that is not a workspace file (a node file, no document path)', () => {
    click(render({ path: '/Users/me/notes/a/index.md', relativeResourceContext: null }), '../b/c.md#x')
    click(render({ relativeResourceContext: { kind: 'workspace', workspaceId: 'ws-1' } }), '../b/c.md#x')
    expect(openFilePreview).not.toHaveBeenCalled()
  })
})
