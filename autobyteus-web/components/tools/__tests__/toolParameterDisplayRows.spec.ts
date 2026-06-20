import { describe, expect, it } from 'vitest'
import { buildToolParameterDisplayRows } from '../toolParameterDisplayRows'
import type { ToolParameter } from '~/stores/toolManagementStore'

describe('buildToolParameterDisplayRows', () => {
  it('renders nested object schema properties under their parent parameter', () => {
    const parameters: ToolParameter[] = [
      {
        name: 'prompt',
        paramType: 'STRING',
        description: 'Text to speak.',
        required: true,
        defaultValue: null,
        enumValues: null,
        jsonSchema: { type: 'string', description: 'Text to speak.' },
      },
      {
        name: 'generation_config',
        paramType: 'OBJECT',
        description: 'Model-specific generation options.',
        required: false,
        defaultValue: null,
        enumValues: null,
        jsonSchema: {
          type: 'object',
          description: 'Model-specific generation options.',
          required: ['voice'],
          properties: {
            voice: {
              type: 'string',
              description: 'Voice to use.',
              default: 'coral',
              enum: ['alloy', 'coral'],
            },
            format: {
              type: 'string',
              description: 'Audio format.',
              enum: ['mp3', 'wav'],
            },
            instructions: {
              type: 'string',
              description: 'Delivery instructions.',
            },
          },
        },
      },
    ]

    const rows = buildToolParameterDisplayRows(parameters)

    expect(rows.map((row) => row.path)).toEqual([
      'prompt',
      'generation_config',
      'generation_config.voice',
      'generation_config.format',
      'generation_config.instructions',
    ])
    expect(rows.find((row) => row.path === 'generation_config.voice')).toEqual({
      id: 'generation_config.voice',
      name: 'voice',
      path: 'generation_config.voice',
      depth: 1,
      paramType: 'STRING',
      required: true,
      description: 'Voice to use.',
      defaultValue: 'coral',
      enumValues: ['alloy', 'coral'],
    })
  })

  it('ignores unsupported schema shapes without dropping the top-level parameter', () => {
    const parameters: ToolParameter[] = [
      {
        name: 'generation_config',
        paramType: 'OBJECT',
        description: 'Model-specific generation options.',
        required: false,
        defaultValue: null,
        enumValues: null,
        jsonSchema: {
          type: 'object',
          properties: {
            unsupported: true,
          },
        },
      },
    ]

    expect(buildToolParameterDisplayRows(parameters)).toEqual([
      {
        id: 'generation_config',
        name: 'generation_config',
        path: 'generation_config',
        depth: 0,
        paramType: 'OBJECT',
        required: false,
        description: 'Model-specific generation options.',
        defaultValue: null,
        enumValues: null,
      },
    ])
  })
})
