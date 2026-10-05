import { describe, expect, it } from 'vitest'
import {
  applyModelOption,
  buildModelOptions,
  onlyModelOptions,
  otherModelSettingKeys,
  setModelOptionLabels,
  withoutModelOptions,
} from '../chatModelOptions'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

const labels = { default: 'Default', on: 'On', off: 'Off' }
// Codex: reasoning effort (thinking) and Fast mode (`service_tier`, one value).
const codex = {
  reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
  service_tier: { type: 'string', enum: ['fast'], title: 'Fast mode' },
} as unknown as UiModelConfigSchema
const multi = {
  verbosity: { type: 'string', enum: ['low', 'high'], title: 'Verbosity' },
  temperature: { type: 'number', minimum: 0, maximum: 2 },
} as unknown as UiModelConfigSchema

describe('chatModelOptions (REQ-022)', () => {
  it('finds the non-thinking enum/boolean settings; numeric ones are not presented', () => {
    expect(otherModelSettingKeys(codex)).toEqual(['service_tier'])
    expect(otherModelSettingKeys(multi)).toEqual(['verbosity'])
    expect(otherModelSettingKeys(null)).toEqual([])
  })

  it('presents "Default or one value" as a toggle labelled by the schema title and value', () => {
    const [fast] = buildModelOptions(codex, { reasoning_effort: 'high' }, labels)
    expect(fast).toMatchObject({ key: 'service_tier', title: 'Fast mode', kind: 'toggle', onValue: 'fast', onLabel: 'Fast', set: false, valueLabel: 'Default' })
    expect(buildModelOptions(codex, { service_tier: 'fast' }, labels)[0]!.set).toBe(true)
  })

  it('presents several values as a menu with Default first', () => {
    const [verbosity] = buildModelOptions(multi, { verbosity: 'high' }, labels)
    expect(verbosity!.kind).toBe('choice')
    expect(verbosity!.choices.map((choice) => [choice.label, choice.checked])).toEqual([['Default', false], ['Low', false], ['High', true]])
  })

  it('sets and unsets a setting without touching thinking, and vice versa', () => {
    expect(applyModelOption({ reasoning_effort: 'high' }, 'service_tier', 'fast')).toEqual({ reasoning_effort: 'high', service_tier: 'fast' })
    expect(applyModelOption({ reasoning_effort: 'high', service_tier: 'fast' }, 'service_tier', undefined)).toEqual({ reasoning_effort: 'high' })
    expect(applyModelOption({ service_tier: 'fast' }, 'service_tier', undefined)).toBeNull()
    expect(withoutModelOptions(codex, { reasoning_effort: 'high', service_tier: 'fast' })).toEqual({ reasoning_effort: 'high' })
    expect(onlyModelOptions(codex, { reasoning_effort: 'high', service_tier: 'fast' })).toEqual({ service_tier: 'fast' })
  })

  it('summarizes the settings that are on (member summary "· Fast ·")', () => {
    expect(setModelOptionLabels(buildModelOptions(codex, { service_tier: 'fast' }, labels))).toEqual(['Fast'])
    expect(setModelOptionLabels(buildModelOptions(multi, { verbosity: 'low' }, labels))).toEqual(['Verbosity: Low'])
  })
})
