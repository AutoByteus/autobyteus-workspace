import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { useMarkdownSegments } from '~/composables/useMarkdownSegments'
import type { MarkdownImageResourceResolver } from '~/utils/markdownImageResource'

describe('useMarkdownSegments image resources', () => {
  it('keeps generic Markdown relative images context-neutral without a resolver', () => {
    const { parsedSegments, managedImageSources } = useMarkdownSegments('![Card](assets/card.png)')

    expect(parsedSegments.value[0]?.content).toContain('src="assets/card.png"')
    expect(managedImageSources.value).toEqual([])
  })

  it('renders managed and blocked images without an initial src', () => {
    const resolver = ref<MarkdownImageResourceResolver>((source) => (
      source.startsWith('..')
        ? { kind: 'blocked', reason: 'outside-workspace' }
        : { kind: 'managed', fetchUrl: '/rest/workspaces/ws/content?path=card.png', fragment: null }
    ))
    const { parsedSegments, managedImageSources } = useMarkdownSegments(
      computed(() => '![Card](card.png) ![Secret](../secret.png)'),
      resolver,
    )

    const html = parsedSegments.value[0]?.content ?? ''
    expect(html).not.toContain(' src=')
    expect(html).toContain('data-markdown-image-source="/rest/workspaces/ws/content?path=card.png"')
    expect(html).toContain('data-markdown-image-error="outside-workspace"')
    expect(html).toContain('alt="Card"')
    expect(html).toContain('alt="Secret"')
    expect(managedImageSources.value).toEqual(['/rest/workspaces/ws/content?path=card.png'])
  })
})
