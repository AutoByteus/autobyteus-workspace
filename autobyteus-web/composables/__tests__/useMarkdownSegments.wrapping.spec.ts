// @vitest-environment jsdom
// The table wrapper must survive sanitisation, which is proven only under jsdom (TESTING.md, web layers).
// Layout (wrapping, overflow) cannot be measured here; these specs prove the markup and the text a user copies.
import { describe, expect, it } from 'vitest'
import { useMarkdownSegments } from '~/composables/useMarkdownSegments'

const renderedBody = (markdown: string): HTMLElement => {
  const body = document.createElement('div')
  body.innerHTML = useMarkdownSegments(markdown).parsedSegments.value
    .filter((segment) => segment.type === 'html')
    .map((segment) => segment.content)
    .join('\n')
  return body
}

const fence = (info: string, content: string): string => `\`\`\`${info}\n${content}\n\`\`\``

describe('useMarkdownSegments code block text and table scroll boxes (jsdom)', () => {
  const longUrl = `https://example.com/${'segment-'.repeat(30)}end`
  const proseDraft = [
    'Hello team, this is a long draft line that goes well past any message width and must wrap rather than scroll sideways.',
    '',
    '    An indented line with four leading spaces and enough words to wrap on a narrow phone screen as well.',
    '\tA tab-indented line & <angle brackets> "quotes" kept as written.',
    longUrl,
  ].join('\n')

  it('keeps the exact text of a fence without a language', () => {
    const code = renderedBody(fence('', proseDraft)).querySelector('pre > code')

    expect(code).not.toBeNull()
    expect(code!.className).toBe('')
    expect(code!.textContent).toBe(`${proseDraft}\n`)
  })

  it('keeps the exact text of a highlighted fence with a language', () => {
    const source = [
      'def handler(event, context):',
      '    message = "a long string literal that keeps going so the line is wider than a phone screen for sure"',
      '',
      '    return message',
    ].join('\n')
    const code = renderedBody(fence('python', source)).querySelector('pre.language-python > code.language-python')

    expect(code).not.toBeNull()
    expect(code!.querySelector('.token')).not.toBeNull()
    expect(code!.textContent).toBe(`${source}\n`)
  })

  it('puts a table in its own scroll box after sanitisation', () => {
    const body = renderedBody([
      'Intro',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n'))

    const table = body.querySelector('table')
    expect(table).not.toBeNull()
    expect(table!.parentElement!.classList.contains('markdown-table-scroll')).toBe(true)
    expect(body.querySelectorAll('.markdown-table-scroll')).toHaveLength(1)
    expect(body.querySelector('.markdown-table-scroll > table > thead > tr > th')!.textContent).toBe('A')
  })

  it('puts a table inside a list item in its own scroll box', () => {
    const body = renderedBody([
      '- item',
      '',
      '  | A | B |',
      '  | --- | --- |',
      '  | 1 | 2 |',
    ].join('\n'))

    const table = body.querySelector('li table')
    expect(table).not.toBeNull()
    expect(table!.parentElement!.classList.contains('markdown-table-scroll')).toBe(true)
  })

  it('keeps cell alignment on a wrapped table', () => {
    const body = renderedBody([
      '| Left | Right |',
      '| :--- | ---: |',
      '| a | b |',
    ].join('\n'))

    expect(body.querySelector('.markdown-table-scroll td:last-child')!.getAttribute('style')).toMatch(/text-align:\s*right/)
  })
})
