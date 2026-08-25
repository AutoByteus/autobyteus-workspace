import { describe, expect, it } from 'vitest'
import { projectHistoricalModelConfigFields } from '../historicalModelConfigFields'
import type { UiModelConfigSchema } from '../llmConfigSchema'

const schema: UiModelConfigSchema = Object.freeze({
  temperature: Object.freeze({ type: 'number', title: 'Temperature' }),
  reasoning_effort: Object.freeze({
    type: 'string',
    title: 'Reasoning Effort',
    enum: Object.freeze(['low', 'medium', 'high', 'xhigh']) as unknown as string[],
    default: 'medium',
  }),
  current_only: Object.freeze({ type: 'boolean', default: false }),
  legacy_shape: Object.freeze({ title: 'Legacy Shape' }),
})

describe('projectHistoricalModelConfigFields', () => {
  it('classifies every exact persisted value once without mutation or editable default normalization', () => {
    const stored = Object.freeze({
      temperature: 0.2,
      reasoning_effort: 'ultra',
      z_removed: Object.freeze({ exact: true }),
      removed_parameter: 'persisted-value',
      legacy_shape: Object.freeze({ exact: true }),
    })
    const before = JSON.stringify(stored)

    const fields = projectHistoricalModelConfigFields(stored, schema)

    expect(fields).toEqual([
      expect.objectContaining({
        kind: 'current_control', key: 'temperature', hasExplicitStoredValue: true, storedValue: 0.2,
      }),
      expect.objectContaining({
        kind: 'historical_residual', key: 'reasoning_effort', exactStoredValue: 'ultra',
        reason: 'value_not_representable',
      }),
      expect.objectContaining({
        kind: 'current_control', key: 'current_only', hasExplicitStoredValue: false,
      }),
      expect.objectContaining({
        kind: 'historical_residual', key: 'legacy_shape', exactStoredValue: { exact: true },
        reason: 'value_not_representable',
      }),
      expect.objectContaining({
        kind: 'historical_residual', key: 'removed_parameter', exactStoredValue: 'persisted-value',
        reason: 'removed_key',
      }),
      expect.objectContaining({
        kind: 'historical_residual', key: 'z_removed', exactStoredValue: { exact: true },
        reason: 'removed_key',
      }),
    ])
    expect(fields.filter((field) => field.key === 'reasoning_effort')).toHaveLength(1)
    expect(fields.filter((field) => field.key === 'removed_parameter')).toHaveLength(1)
    expect(JSON.stringify(stored)).toBe(before)
    expect(Object.isFrozen(fields)).toBe(true)
  })

  it('treats whole-schema absence as the same stable residual projection', () => {
    const fields = projectHistoricalModelConfigFields({ zeta: 2, alpha: 'persisted' }, null)
    expect(fields).toEqual([
      expect.objectContaining({ kind: 'historical_residual', key: 'alpha', exactStoredValue: 'persisted' }),
      expect.objectContaining({ kind: 'historical_residual', key: 'zeta', exactStoredValue: 2 }),
    ])
  })

  it('keeps current controls in schema order when no explicit historical value exists', () => {
    expect(projectHistoricalModelConfigFields(null, schema).map((field) => field.key))
      .toEqual(['temperature', 'reasoning_effort', 'current_only', 'legacy_shape'])
  })
})
