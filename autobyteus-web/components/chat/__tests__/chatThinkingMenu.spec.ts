import { describe, expect, it } from 'vitest'
import { buildChatThinkingMenu, type ChatThinkingMenu } from '../chatThinkingMenu'

const labels: Record<string, string> = {
  'chat.thinking.title': 'Thinking',
  'chat.thinking.on': 'On',
  'chat.thinking.off': 'Off',
  'chat.thinking.default': 'Default',
}
const t = (key: string) => labels[key] ?? key

const claudeSdkSchema = {
  thinking_enabled: { type: 'boolean', default: false },
  reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'medium' },
}
const deepSeekV4Schema = {
  thinking_type: { type: 'string', enum: ['enabled', 'disabled'], default: 'enabled' },
  reasoning_effort: { type: 'string', enum: ['high', 'max'], default: 'high' },
}
const anthropicBudgetSchema = {
  thinking_enabled: { type: 'boolean', title: 'Thinking enabled', default: false },
  thinking_budget_tokens: { type: 'integer', title: 'Thinking budget tokens', default: 1024, minimum: 1024, maximum: 32000 },
}
const anthropicAdaptiveSchema = {
  thinking_enabled: { type: 'boolean', default: false },
  thinking_display: { type: 'string', enum: ['summarized', 'omitted'], default: 'summarized' },
}

type Merged = Extract<ChatThinkingMenu, { mode: 'merged' }>
type Parameters = Extract<ChatThinkingMenu, { mode: 'parameters' }>
const merged = (menu: ChatThinkingMenu): Merged => {
  expect(menu.mode).toBe('merged')
  return menu as Merged
}
const checkedIds = (menu: Merged) => menu.primary.filter((option) => option.checked).map((option) => option.id)
const pick = (menu: Merged, id: string) => menu.primary.find((option) => option.id === id)?.next

describe('buildChatThinkingMenu', () => {
  it('is hidden without thinking parameters', () => {
    expect(buildChatThinkingMenu(null, null, t)).toEqual({ mode: 'hidden' })
    expect(buildChatThinkingMenu({ temperature: { type: 'number', default: 1 } }, null, t)).toEqual({ mode: 'hidden' })
  })

  it('merges the Claude SDK switch and effort into one list: Off · levels (AC-001, AC-004)', () => {
    const menu = merged(buildChatThinkingMenu(claudeSdkSchema, null, t))
    expect(menu.title).toBe('Thinking')
    expect(menu.primary.map((option) => option.label)).toEqual(['Off', 'Low', 'Medium', 'High', 'Xhigh', 'Max'])
    expect(checkedIds(menu)).toEqual(['off'])
    expect(menu.summary).toBe('Off')
    expect(menu.active).toBe(false)
    expect(menu.secondary).toEqual([])
    expect(pick(menu, 'high')).toEqual({ thinking_enabled: true, reasoning_effort: 'high' })
  })

  it('follows the design examples table for the Claude SDK schema', () => {
    const storedOff = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: false, reasoning_effort: 'medium' }, t))
    expect(checkedIds(storedOff)).toEqual(['off'])
    expect(storedOff.summary).toBe('Off')
    expect(pick(storedOff, 'medium')).toEqual({ thinking_enabled: true, reasoning_effort: 'medium' })

    const high = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: true, reasoning_effort: 'high' }, t))
    expect(checkedIds(high)).toEqual(['high'])
    expect(high.summary).toBe('High')
    expect(high.active).toBe(true)
    expect(pick(high, 'off')).toEqual({ thinking_enabled: false, reasoning_effort: 'high' })

    const onDefault = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: true }, t))
    expect(checkedIds(onDefault)).toEqual(['medium'])
    expect(onDefault.summary).toBe('Medium')
  })

  it('merges the DeepSeek V4 typed switch: Off · High · Max (AC-002)', () => {
    const menu = merged(buildChatThinkingMenu(deepSeekV4Schema, { thinking_type: 'disabled' }, t))
    expect(menu.primary.map((option) => option.id)).toEqual(['off', 'high', 'max'])
    expect(checkedIds(menu)).toEqual(['off'])
    expect(pick(menu, 'max')).toEqual({ thinking_type: 'enabled', reasoning_effort: 'max' })

    const on = merged(buildChatThinkingMenu(deepSeekV4Schema, { thinking_type: 'enabled', reasoning_effort: 'max' }, t))
    expect(checkedIds(on)).toEqual(['max'])
    expect(on.summary).toBe('Max')
    expect(pick(on, 'off')).toEqual({ thinking_type: 'disabled' })
  })

  it('shows Off · On plus a budget field for a switch without an effort list (AC-003, AC-005 alternate)', () => {
    const off = merged(buildChatThinkingMenu(anthropicBudgetSchema, { thinking_enabled: false }, t))
    expect(off.primary.map((option) => option.label)).toEqual(['Off', 'On'])
    expect(checkedIds(off)).toEqual(['off'])
    expect(off.summary).toBe('Off')
    expect(off.secondary).toHaveLength(1)
    const budget = off.secondary[0]!
    expect(budget).toMatchObject({ key: 'thinking_budget_tokens', label: 'Thinking budget tokens', kind: 'number', value: '', minimum: 1024, maximum: 32000 })
    expect(budget.applyNumber(4096)).toEqual({ thinking_enabled: true, thinking_budget_tokens: 4096 })
    expect(pick(off, 'on')).toEqual({ thinking_enabled: true, thinking_budget_tokens: 1024 })

    const on = merged(buildChatThinkingMenu(anthropicBudgetSchema, { thinking_enabled: true, thinking_budget_tokens: 2048 }, t))
    expect(checkedIds(on)).toEqual(['on'])
    expect(on.summary).toBe('On')
    expect(on.secondary[0]!.value).toBe(2048)
  })

  it('shows display settings as a secondary group that auto-enables and shows no check while off', () => {
    const off = merged(buildChatThinkingMenu(anthropicAdaptiveSchema, null, t))
    const display = off.secondary[0]!
    expect(display.key).toBe('thinking_display')
    expect(display.options.map((option) => [option.label, option.checked])).toEqual([['Summarized', false], ['Omitted', false]])
    expect(display.options[1]!.next).toEqual({ thinking_enabled: true, thinking_display: 'omitted' })

    const on = merged(buildChatThinkingMenu(anthropicAdaptiveSchema, { thinking_enabled: true }, t))
    expect(on.secondary[0]!.options.map((option) => option.checked)).toEqual([true, false])
  })

  it('keeps the per-parameter presentation for OpenAI schemas (AC-006)', () => {
    const schema = {
      reasoning_effort: { type: 'string', title: 'Reasoning effort', enum: ['none', 'low', 'high'], default: 'none' },
      reasoning_summary: { type: 'string', enum: ['none', 'auto'], default: 'none' },
    }
    const menu = buildChatThinkingMenu(schema, { reasoning_effort: 'high' }, t) as Parameters
    expect(menu.mode).toBe('parameters')
    expect(menu.summary).toBe('High')
    expect(menu.active).toBe(true)
    expect(menu.parameters.map((parameter) => ({
      key: parameter.key,
      label: parameter.label,
      options: parameter.options.map((option) => [option.label, option.checked, option.next]),
    }))).toEqual([
      {
        key: 'reasoning_effort',
        label: 'Reasoning effort',
        options: [
          ['None', false, { reasoning_effort: 'none' }],
          ['Low', false, { reasoning_effort: 'low' }],
          ['High', true, { reasoning_effort: 'high' }],
        ],
      },
      {
        key: 'reasoning_summary',
        label: 'Reasoning summary',
        options: [
          ['None', true, { reasoning_effort: 'high', reasoning_summary: 'none' }],
          ['Auto', false, { reasoning_effort: 'high', reasoning_summary: 'auto' }],
        ],
      },
    ])
  })

  it('keeps the per-parameter presentation for Gemini and always-on GLM schemas (AC-006)', () => {
    const gemini = buildChatThinkingMenu({
      thinking_level: { type: 'string', enum: ['minimal', 'medium'], default: 'minimal' },
      include_thoughts: { type: 'boolean', default: false },
    }, null, t) as Parameters
    expect(gemini.mode).toBe('parameters')
    expect(gemini.summary).toBe('Minimal')
    expect(gemini.active).toBe(false)
    expect(gemini.parameters.map((parameter) => parameter.options.map((option) => [option.label, option.checked]))).toEqual([
      [['Minimal', true], ['Medium', false]],
      [['On', false], ['Off', true]],
    ])
    // include_thoughts is toggle-owned: On goes through the adapter toggle.
    expect(gemini.parameters[1]!.options[0]!.next).toEqual({ include_thoughts: true, thinking_level: 'medium' })

    const glm = buildChatThinkingMenu({
      thinking_type: { type: 'string', enum: ['enabled'], default: 'enabled' },
      reasoning_effort: { type: 'string', enum: ['high', 'max'], default: 'high' },
    }, null, t) as Parameters
    expect(glm.mode).toBe('parameters')
    expect(glm.summary).toBe('Enabled')
    expect(glm.parameters[1]!.options[1]!.next).toEqual({ reasoning_effort: 'max' })
  })

  it('shows Default in parameters mode when the first choice has no effective value', () => {
    const menu = buildChatThinkingMenu({ reasoning_effort: { type: 'string', enum: ['low', 'high'] } }, null, t) as Parameters
    expect(menu.summary).toBe('Default')
    expect(menu.parameters[0]!.options.every((option) => !option.checked)).toBe(true)
  })
})
