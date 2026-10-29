import { describe, expect, it } from 'vitest'
import { buildChatThinkingMenu, type ChatThinkingMenu } from '../chatThinkingMenu'

const labels: Record<string, string> = {
  'chat.thinking.title': 'Thinking',
  'chat.thinking.on': 'On',
  'chat.thinking.off': 'Off',
  'chat.thinking.default': 'Default',
  'chat.thinking.summaryWithEffort': '{{state}} · {{effort}}',
}
const t = (key: string, params?: Record<string, string>) =>
  (labels[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) => params?.[name] ?? '')

const claudeSdkSchema = {
  thinking_enabled: { type: 'boolean', default: false },
  reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'medium' },
}
const deepSeekV4Schema = {
  thinking_type: { type: 'string', enum: ['enabled', 'disabled'], default: 'enabled' },
  reasoning_effort: { type: 'string', enum: ['high', 'max'], default: 'high' },
}
const effortLevels = ['low', 'medium', 'high', 'xhigh', 'max']
/** AutoByteus Claude row with a switch (e.g. claude-sonnet-5-5). */
const anthropicSwitchSchema = {
  thinking_enabled: { type: 'boolean', default: false },
  thinking_display: { type: 'string', enum: ['omitted', 'summarized'], default: 'summarized' },
  reasoning_effort: { type: 'string', title: 'Reasoning effort', enum: effortLevels, default: 'high' },
}
/** claude-opus-5-5: adaptive thinking always on, no switch. */
const anthropicOpus55Schema = {
  thinking_display: { type: 'string', enum: ['omitted', 'summarized'], default: 'omitted' },
  reasoning_effort: { type: 'string', title: 'Reasoning effort', enum: effortLevels, default: 'medium' },
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

  it('shows the Claude SDK switch as Off · On with an independent effort group (AC-005)', () => {
    const menu = merged(buildChatThinkingMenu(claudeSdkSchema, null, t))
    expect(menu.title).toBe('Thinking')
    expect(menu.primary.map((option) => option.label)).toEqual(['Off', 'On'])
    expect(checkedIds(menu)).toEqual(['off'])
    expect(menu.summary).toBe('Off · Medium')
    expect(menu.active).toBe(false)
    expect(menu.secondary.map((parameter) => parameter.key)).toEqual(['reasoning_effort'])
    const effort = menu.secondary[0]!
    expect(effort.options.map((option) => [option.label, option.checked])).toEqual([
      ['Low', false], ['Medium', true], ['High', false], ['Xhigh', false], ['Max', false],
    ])
    expect(pick(menu, 'on')).toEqual({ thinking_enabled: true })
  })

  it('keeps thinking off for low/medium/high and turns it on for xhigh/max (AC-005)', () => {
    const off = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: false, reasoning_effort: 'medium' }, t))
    const next = (id: string) => off.secondary[0]!.options.find((option) => option.id === id)!.next
    expect(next('low')).toEqual({ thinking_enabled: false, reasoning_effort: 'low' })
    expect(next('high')).toEqual({ thinking_enabled: false, reasoning_effort: 'high' })
    expect(next('xhigh')).toEqual({ thinking_enabled: true, reasoning_effort: 'xhigh' })
    expect(next('max')).toEqual({ thinking_enabled: true, reasoning_effort: 'max' })

    const on = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: true, reasoning_effort: 'low' }, t))
    expect(on.secondary[0]!.options.find((option) => option.id === 'medium')!.next)
      .toEqual({ thinking_enabled: true, reasoning_effort: 'medium' })
  })

  it('turning thinking off with xhigh or max selected falls back to high (AC-005)', () => {
    const max = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: true, reasoning_effort: 'max' }, t))
    expect(checkedIds(max)).toEqual(['on'])
    expect(max.summary).toBe('On · Max')
    expect(max.active).toBe(true)
    expect(pick(max, 'off')).toEqual({ thinking_enabled: false, reasoning_effort: 'high' })

    const low = merged(buildChatThinkingMenu(claudeSdkSchema, { thinking_enabled: true, reasoning_effort: 'low' }, t))
    expect(pick(low, 'off')).toEqual({ thinking_enabled: false, reasoning_effort: 'low' })
  })

  it('orders an AutoByteus Claude switch row as Off · On, effort, then display (AC-005, DEC-006)', () => {
    const off = merged(buildChatThinkingMenu(anthropicSwitchSchema, { thinking_enabled: false, reasoning_effort: 'low' }, t))
    expect(off.primary.map((option) => option.id)).toEqual(['off', 'on'])
    expect(off.secondary.map((parameter) => parameter.key)).toEqual(['reasoning_effort', 'thinking_display'])
    expect(off.secondary[0]!.label).toBe('Reasoning effort')
    expect(off.summary).toBe('Off · Low')
    // Display stays dependent: no check while off, and choosing it turns thinking on.
    expect(off.secondary[1]!.options.every((option) => !option.checked)).toBe(true)
    expect(off.secondary[1]!.options[0]!.next).toEqual({ thinking_enabled: true, reasoning_effort: 'low', thinking_display: 'omitted' })

    const onDefault = merged(buildChatThinkingMenu(anthropicSwitchSchema, { thinking_enabled: true }, t))
    expect(onDefault.summary).toBe('On · High')
    expect(onDefault.secondary[0]!.options.find((option) => option.checked)?.id).toBe('high')
  })

  it('offers Opus 5.5 its effort levels as the Thinking menu, Medium checked by default (AC-006)', () => {
    const menu = buildChatThinkingMenu(anthropicOpus55Schema, null, t) as Parameters
    expect(menu.mode).toBe('parameters')
    expect(menu.summary).toBe('Medium')
    expect(menu.parameters.map((parameter) => parameter.key)).toEqual(['reasoning_effort'])
    expect(menu.parameters[0]!.options.map((option) => [option.label, option.checked])).toEqual([
      ['Low', false], ['Medium', true], ['High', false], ['Xhigh', false], ['Max', false],
    ])
    expect(menu.parameters[0]!.options[4]!.next).toEqual({ reasoning_effort: 'max' })

    const fable51 = buildChatThinkingMenu({ reasoning_effort: anthropicSwitchSchema.reasoning_effort }, null, t) as Parameters
    expect(fable51.mode).toBe('parameters')
    expect(fable51.summary).toBe('High')
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
