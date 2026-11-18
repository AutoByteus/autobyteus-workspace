import { describe, expect, it } from 'vitest'
import { helpTextParts, withSkillName } from '../integrationText'

// AR-003: an integration's help text is repository content; only https: addresses become links.
describe('integration help text', () => {
  it('links https addresses only, without trailing punctuation', () => {
    expect(helpTextParts('Create one at https://github.com/settings/tokens. Then paste it.')).toEqual([
      { text: 'Create one at ', href: null },
      { text: 'https://github.com/settings/tokens', href: 'https://github.com/settings/tokens' },
      { text: '. Then paste it.', href: null },
    ])
  })

  it.each([
    'http://insecure.example/token',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://files.example',
    '<a href="https://evil.example">x</a>'.replace('https://evil.example', 'javascript:evil'),
  ])('keeps %s as plain text', (text) => {
    expect(helpTextParts(text).every((part) => part.href === null)).toBe(true)
    expect(helpTextParts(text).map((part) => part.text).join('')).toBe(text)
  })

  it('links several https addresses and keeps every character', () => {
    const text = 'See https://a.example/x and https://b.example/y?z=1, or none.'
    const parts = helpTextParts(text)
    expect(parts.filter((part) => part.href).map((part) => part.href)).toEqual(['https://a.example/x', 'https://b.example/y?z=1'])
    expect(parts.map((part) => part.text).join('')).toBe(text)
  })

  it('marks the skill name wherever a sentence names it', () => {
    expect(withSkillName('Add github-integration to an agent.', 'github-integration')).toEqual([
      { text: 'Add ', skill: false }, { text: 'github-integration', skill: true }, { text: ' to an agent.', skill: false },
    ])
  })
})
