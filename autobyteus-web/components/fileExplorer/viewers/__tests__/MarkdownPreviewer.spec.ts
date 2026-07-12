import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import MarkdownPreviewer from '~/components/fileExplorer/viewers/MarkdownPreviewer.vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

describe('MarkdownPreviewer', () => {
  it('builds a workspace resolver only from explicit file-preview identity', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useWindowNodeContextStore().bindNodeContext('node-1', 'http://node.example')
    const wrapper = mount(MarkdownPreviewer, {
      props: {
        content: '![Card](assets/card.png)',
        path: 'docs/readme.md',
        relativeResourceContext: { kind: 'workspace', workspaceId: 'workspace-1' },
      },
      global: {
        plugins: [pinia],
        stubs: {
          MarkdownRenderer: {
            name: 'MarkdownRenderer',
            props: ['content', 'imageResourceResolver'],
            template: '<div />',
          },
        },
      },
    })

    const resolver = wrapper.findComponent({ name: 'MarkdownRenderer' }).props(
      'imageResourceResolver',
    )
    expect(resolver('assets/card.png')).toEqual({
      kind: 'managed',
      fetchUrl: 'http://node.example/rest/workspaces/workspace-1/content?path=docs%2Fassets%2Fcard.png',
      fragment: null,
    })
  })

  it('does not create a resolver without workspace identity', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(MarkdownPreviewer, {
      props: { content: '![Card](assets/card.png)', path: 'docs/readme.md' },
      global: {
        plugins: [pinia],
        stubs: {
          MarkdownRenderer: {
            name: 'MarkdownRenderer',
            props: ['content', 'imageResourceResolver'],
            template: '<div />',
          },
        },
      },
    })

    expect(
      wrapper.findComponent({ name: 'MarkdownRenderer' }).props('imageResourceResolver'),
    ).toBeUndefined()
  })
})
