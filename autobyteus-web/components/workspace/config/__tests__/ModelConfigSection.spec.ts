import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ModelConfigSection from '../ModelConfigSection.vue';

// Mock the store
vi.mock('~/stores/llmProviderConfig', () => ({
  useLlmProviderConfigStore: vi.fn(() => ({
    providersWithModels: [
      {
        id: 'anthropic',
        name: 'Anthropic',
        models: [
          {
            id: 'claude-3-5-sonnet',
            name: 'Claude 3.5 Sonnet',
            config_schema: {
              properties: {
                thinking_enabled: { type: 'boolean', title: 'Thinking Enabled', default: true },
                thinking_level: { type: 'integer', title: 'Thinking Level', default: 5 }
              }
            }
          },
          {
            id: 'gpt-4',
            name: 'GPT-4',
            config_schema: {
              properties: {
                temperature: { type: 'number', title: 'Temperature', default: 0.7 }
              }
            }
          }
        ]
      }
    ],
    getProviderForModel: (modelId: string) => {
      if (modelId.startsWith('claude')) return { id: 'anthropic' };
      if (modelId.startsWith('gpt')) return { id: 'openai' };
      return null;
    },
    getModel: (modelId: string) => {
      if (modelId === 'claude-3-5-sonnet') return {
        id: 'claude-3-5-sonnet',
        config_schema: {
          properties: {
            thinking_enabled: { type: 'boolean', title: 'Thinking Enabled', default: true },
            thinking_level: { type: 'integer', title: 'Thinking Level', default: 5 }
          }
        }
      };
      if (modelId === 'gpt-4') return {
        id: 'gpt-4',
        config_schema: {
          properties: {
            temperature: { type: 'number', title: 'Temperature', default: 0.7 }
          }
        }
      };
      return null;
    }
  }))
}));

describe('ModelConfigSection', () => {
  const flushPromises = async () => {
    await Promise.resolve()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }

  it('preserves configuration while schema metadata is absent', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: { reasoning_effort: 'xhigh' },
        schema: null,
        applyDefaults: true,
      },
    });

    await flushPromises();

    expect(wrapper.emitted('update:config')).toBeUndefined();

    await wrapper.setProps({
      schema: {
        reasoning_effort: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'xhigh'] },
      },
    });
    await flushPromises();

    expect(wrapper.emitted('update:config')).toBeUndefined();
  });

  it('does not reset configuration merely because schema changes', async () => {
    const config = { reasoning_effort: 'high' }
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: config,
        schema: {
          reasoning_effort: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
        }
      }
    });

    await wrapper.setProps({
      modelConfig: config,
      schema: {
        reasoning_effort: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'xhigh'] },
      }
    });
    await wrapper.vm.$nextTick();
    await flushPromises();

    const updates = wrapper.emitted('update:config') || [];
    const hasNullReset = updates.some(args => args[0] === null);
    expect(hasNullReset).toBe(false);
  });

  it('does NOT reset configuration when switching agents (context switch)', async () => {
    const configA = { thinking_enabled: true };
    const configB = { temperature: 0.5 };
    
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelId: 'claude',
        modelConfig: configA, 
        schema: {
          thinking_enabled: { type: 'boolean', default: true }
        }
      }
    });

    // Switch "Agent" -> New Schema AND New Config Object
    await wrapper.setProps({
      modelId: 'gpt',
      modelConfig: configB, // Different object ref
      schema: {
        temperature: { type: 'number', default: 0.7 }
      }
    });
    await wrapper.vm.$nextTick();

    // Should NOT emit null (Agent B's config should be preserved)
    // It usually emits defaults for the new schema, but specifically NOT null
    const updates = wrapper.emitted('update:config') || [];
    const hasNullReset = updates.some(args => args[0] === null);
    expect(hasNullReset).toBe(false);
  });


  it('does not reset configuration when schema is identical', async () => {
    const schema = {
      thinking_enabled: { type: 'boolean', title: 'Thinking Enabled', default: true }
    };

    const wrapper = mount(ModelConfigSection, {
      props: {
        modelId: 'claude-3-5-sonnet',
        modelConfig: { thinking_enabled: true },
        schema: schema
      }
    });

    // Update with identical schema
    await wrapper.setProps({
      schema: { ...schema } // New object, same content
    });

    // Should NOT emit null
    const emits = wrapper.emitted('update:config');
    if (emits) {
        expect(emits.some(args => args[0] === null)).toBe(false);
    } else {
        expect(emits).toBeUndefined();
    }
  });

  it('sanitizes persisted config values that are invalid for the current schema', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: {
          reasoning_effort: 'ultra',
          temperature: 0.2,
          unknown_key: 'remove-me',
        },
        schema: {
          reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          temperature: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    });

    await wrapper.vm.$nextTick();

    const updates = wrapper.emitted('update:config') || [];
    const hasSanitizedUpdate = updates.some((args) =>
      JSON.stringify(args[0]) === JSON.stringify({ temperature: 0.2 }),
    );
    expect(hasSanitizedUpdate).toBe(true);
  });

  it('expands advanced params initially when requested, even while inputs are disabled', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: { reasoning_effort: 'high' },
        disabled: true,
        advancedInitiallyExpanded: true,
        schema: {
          reasoning_effort: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
        },
      },
    });

    const toggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(toggle.attributes('disabled')).toBeUndefined();
    expect(wrapper.get('select').element.disabled).toBe(true);
  });

  it('does not emit config normalization updates while read-only', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: {
          reasoning_effort: 'ultra',
          temperature: 0.2,
        },
        disabled: true,
        readOnly: true,
        schema: {
          reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          temperature: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:config')).toBeUndefined();
  });

  it('renders not-recorded state for missing historical model config instead of blank controls', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        disabled: true,
        readOnly: true,
        missingHistoricalConfig: true,
        advancedInitiallyExpanded: true,
        schema: {
          reasoning_effort: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
        },
      },
    });

    expect(wrapper.get('[data-testid="missing-historical-config-basic"]').text()).toContain('Not recorded for this historical run');
    expect(wrapper.get('[data-testid="missing-historical-config-value"]').text()).toContain('Not recorded for this historical run');
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.emitted('update:config')).toBeUndefined();
  });
});
