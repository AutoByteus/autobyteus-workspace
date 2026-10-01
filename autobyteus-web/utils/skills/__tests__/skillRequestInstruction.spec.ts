import { describe, expect, it } from 'vitest'
import { compose, parse } from '../skillRequestInstruction'

describe('skillRequestInstruction', () => {
  it('composes the approved single and multiple skill wording before the user text', () => {
    expect(compose(['skill-optimizer'], 'Help me tune this.'))
      .toBe('Use the skill-optimizer skill for this request.\n\nHelp me tune this.')
    expect(compose(['a', 'b'], 'x')).toBe('Use these skills for this request: a, b.\n\nx')
  })

  it('composes a tags-only message as the instruction alone', () => {
    expect(compose(['a'], '')).toBe('Use the a skill for this request.')
    expect(compose(['a', 'b'], '   ')).toBe('Use these skills for this request: a, b.')
  })

  it('leaves text unchanged when there are no tags', () => {
    expect(compose([], 'plain')).toBe('plain')
  })

  it('round-trips compose and parse', () => {
    for (const [names, text] of [
      [['skill-optimizer'], 'Help me…'],
      [['a', 'b', 'c'], 'multi\nline\n\ntext'],
      [['only'], ''],
    ] as const) {
      expect(parse(compose(names, text))).toEqual({ skillNames: [...names], text })
    }
  })

  it('returns null unless the content starts with exactly one sentence form', () => {
    expect(parse('Hello there')).toBeNull()
    expect(parse('Please Use the a skill for this request.')).toBeNull()
    expect(parse('Use the a skill for this request.\nsame-paragraph text')).toBeNull()
    expect(parse('Use these skills for this request: a.')).toBeNull()
  })

  it('keeps any trailing runtime-appended content as part of the user text', () => {
    expect(parse('Use the a skill for this request.\n\nuser text\n\n<context files>'))
      .toEqual({ skillNames: ['a'], text: 'user text\n\n<context files>' })
  })
})
