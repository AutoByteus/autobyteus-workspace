import { describe, expect, it } from 'vitest'
import {
  buildWorkspaceContentUrl,
  resolveWorkspaceMarkdownImageResource,
} from '~/utils/fileExplorer/workspaceResourceUrl'

const resolve = (source: string, documentPath = 'docs/readme.md') => (
  resolveWorkspaceMarkdownImageResource({
    source,
    documentPath,
    context: { kind: 'workspace', workspaceId: 'workspace 1' },
    restBaseUrl: 'http://node.example/rest/',
  })
)

describe('workspace Markdown image resource resolution', () => {
  it.each([
    ['assets/card.png', 'docs/assets/card.png'],
    ['./card.png', 'docs/card.png'],
    ['../images/card.png', 'images/card.png'],
    ['assets/a%20b.png', 'docs/assets/a b.png'],
  ])('resolves %s against its document directory', (source, expectedPath) => {
    expect(resolve(source)).toEqual({
      kind: 'managed',
      fetchUrl: buildWorkspaceContentUrl(
        'http://node.example/rest/',
        'workspace 1',
        expectedPath,
      ),
      fragment: null,
    })
  })

  it('keeps fragments out of filesystem identity and ignores local query text', () => {
    expect(resolve('../images/diagram.svg?cache=1#node-a')).toEqual({
      kind: 'managed',
      fetchUrl: buildWorkspaceContentUrl(
        'http://node.example/rest/',
        'workspace 1',
        'images/diagram.svg',
      ),
      fragment: '#node-a',
    })
  })

  it.each([
    'https://example.com/image.png',
    'data:image/png;base64,AAAA',
    '//cdn.example.com/image.png',
    '/images/root.png',
  ])('leaves direct source %s context-neutral', (source) => {
    expect(resolve(source)).toEqual({ kind: 'direct', url: source })
  })

  it.each([
    ['../../secret.png', 'outside-workspace'],
    ['assets%2Fsecret.png', 'invalid-path'],
    ['assets%5Csecret.png', 'invalid-path'],
    ['assets/%ZZ.png', 'invalid-path'],
  ] as const)('blocks invalid relative source %s', (source, reason) => {
    expect(resolve(source)).toEqual({ kind: 'blocked', reason })
  })
})
