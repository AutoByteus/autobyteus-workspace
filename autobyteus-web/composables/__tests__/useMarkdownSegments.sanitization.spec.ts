// @vitest-environment jsdom
// Sanitisation must be proven under jsdom: happy-dom lets DOMPurify skip nodes after the first removal, so injected
// markup survives there even though production (a real DOM) removes it (TESTING.md, web layers).
import { describe, expect, it } from 'vitest'
import { useMarkdownSegments } from '~/composables/useMarkdownSegments'

const renderedHtml = (markdown: string): string => useMarkdownSegments(markdown).parsedSegments.value
  .filter((segment) => segment.type === 'html')
  .map((segment) => segment.content)
  .join('\n')

describe('useMarkdownSegments sanitisation (jsdom)', () => {
  it('removes script, event handlers, javascript: links and iframes from raw HTML', () => {
    const html = renderedHtml([
      'Before <script>window.__injected = true</script> after',
      '',
      '<img src="x.png" onerror="window.__injected = true">',
      '',
      '<a href="javascript:window.__injected=true">raw link</a>',
      '',
      '<iframe src="https://example.com/embed"></iframe>',
      '',
      '<div onclick="window.__injected = true">clickable box</div>',
    ].join('\n'))

    expect(html).not.toMatch(/<script/i)
    expect(html).not.toContain('__injected')
    expect(html).not.toMatch(/\son[a-z]+=/i)
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toMatch(/<iframe/i)
    // The harmless parts stay.
    expect(html).toContain('src="x.png"')
    expect(html).toContain('raw link')
    expect(html).toContain('clickable box')
  })

  it('does not turn a Markdown javascript: link into a link', () => {
    const html = renderedHtml('[click me](javascript:window.__injected=true)')

    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).not.toMatch(/<a\b/i)
  })

  it('keeps allowed formatting and inline styles', () => {
    const html = renderedHtml('<strong>bold</strong> and <span style="color: red">red</span>')

    expect(html).toContain('<strong>bold</strong>')
    expect(html).toMatch(/<span style="color: red;?">red<\/span>/)
  })
})
