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

  it('renders a collapsed disclosure for non-thinking advanced schema parameters', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          service_tier: {
            type: 'string',
            title: 'Fast mode',
            description: 'Enable Codex Fast mode for this model.',
            enum: ['fast'],
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Fast mode');
    const toggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');
    const select = wrapper.get('select#config-service_tier');

    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(advancedContainer.attributes('style')).toContain('display: none');
    expect(select.text()).toContain('fast');

    await toggle.trigger('click');

    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
  });

  it('renders effort-only reasoning defaults with thinking on but non-disable-capable', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['low', 'medium', 'high', 'xhigh'],
            default: 'medium',
          },
          service_tier: {
            type: 'string',
            title: 'Fast mode',
            enum: ['fast'],
          },
        },
      },
    });

    await flushPromises();

    const reasoningSelect = wrapper.get('select#config-reasoning_effort');
    const serviceTierSelect = wrapper.get('select#config-service_tier');
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' });
    const toggle = wrapper.get('[data-testid="advanced-params-toggle"]');

    expect(thinkingRow.props('enabled')).toBe(true);
    expect(thinkingRow.props('neutralEnabled')).toBe(true);
    expect(thinkingRow.get('button').element.disabled).toBe(true);
    expect(thinkingRow.get('button').classes()).toContain('bg-gray-300');
    expect(thinkingRow.get('button').classes()).not.toContain('bg-blue-600');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(reasoningSelect.isVisible()).toBe(true);
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium');
    expect((serviceTierSelect.element as HTMLSelectElement).value).toBe('__default__');
    expect(wrapper.emitted('update:config')).toBeUndefined();

    await thinkingRow.get('button').trigger('click');
    expect(wrapper.emitted('update:config')).toBeUndefined();

    await reasoningSelect.setValue('high');

    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toEqual({
      reasoning_effort: 'high',
    });
  });

  it('inlines one advanced row only when opted in and thinking is on', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        inlineSingleAdvancedRowWhenThinkingOn: true,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['low', 'medium', 'high', 'xhigh'],
            default: 'medium',
          },
        },
      },
    });

    await flushPromises();

    const reasoningSelect = wrapper.get('select#config-reasoning_effort');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' });

    expect(thinkingRow.props('enabled')).toBe(true);
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false);
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
    expect(reasoningSelect.isVisible()).toBe(true);
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium');
  });

  it('keeps the advanced disclosure for the opt-in path when thinking is off', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        inlineSingleAdvancedRowWhenThinkingOn: true,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['none', 'low', 'medium', 'high'],
            default: 'none',
          },
        },
      },
    });

    const advancedToggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(false);
    expect(advancedToggle.attributes('aria-expanded')).toBe('false');
    expect(advancedContainer.attributes('style')).toContain('display: none');
  });

  it('applies default-on thinking only through explicit launch-surface opt-in', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        applyDefaults: true,
        defaultThinkingOnWhenSupported: true,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['none', 'low', 'medium', 'high'],
            default: 'none',
          },
          reasoning_summary: {
            type: 'string',
            title: 'Reasoning Summary',
            enum: ['none', 'auto', 'concise'],
            default: 'none',
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toEqual({
      reasoning_summary: 'auto',
    });
  });

  it('preserves explicit thinking-off state when default-on thinking is opted in', async () => {
    const explicitOff = { reasoning_effort: 'none', reasoning_summary: 'none' };
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: explicitOff,
        applyDefaults: true,
        defaultThinkingOnWhenSupported: true,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['none', 'low', 'medium', 'high'],
            default: 'none',
          },
          reasoning_summary: {
            type: 'string',
            title: 'Reasoning Summary',
            enum: ['none', 'auto', 'concise'],
            default: 'none',
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(false);
    expect(wrapper.emitted('update:config')).toBeUndefined();
  });

  it('does not apply default-on thinking in read-only, disabled, or missing-historical states', async () => {
    const schema = {
      reasoning_effort: {
        type: 'string',
        title: 'Reasoning Effort',
        enum: ['none', 'low', 'medium', 'high'],
        default: 'none',
      },
      reasoning_summary: {
        type: 'string',
        title: 'Reasoning Summary',
        enum: ['none', 'auto', 'concise'],
        default: 'none',
      },
    };
    const wrappers = [
      mount(ModelConfigSection, {
        props: {
          modelConfig: null,
          applyDefaults: true,
          defaultThinkingOnWhenSupported: true,
          readOnly: true,
          schema,
        },
      }),
      mount(ModelConfigSection, {
        props: {
          modelConfig: null,
          applyDefaults: true,
          defaultThinkingOnWhenSupported: true,
          disabled: true,
          schema,
        },
      }),
      mount(ModelConfigSection, {
        props: {
          modelConfig: null,
          applyDefaults: true,
          defaultThinkingOnWhenSupported: true,
          readOnly: true,
          missingHistoricalConfig: true,
          schema,
        },
      }),
    ];

    await flushPromises();

    for (const wrapper of wrappers) {
      expect(wrapper.emitted('update:config')).toBeUndefined();
    }
  });

  it('keeps the advanced disclosure for the opt-in path when multiple advanced rows remain', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        inlineSingleAdvancedRowWhenThinkingOn: true,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['low', 'medium', 'high', 'xhigh'],
            default: 'medium',
          },
          service_tier: {
            type: 'string',
            title: 'Fast mode',
            enum: ['fast'],
          },
        },
      },
    });

    const advancedToggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(true);
    expect(advancedToggle.attributes('aria-expanded')).toBe('true');
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
  });

  it('renders advanced rows flat only when the caller explicitly opts in', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        advancedDisplayMode: 'flat',
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['low', 'medium', 'high', 'xhigh'],
            default: 'medium',
          },
          service_tier: {
            type: 'string',
            title: 'Fast mode',
            enum: ['fast'],
          },
        },
      },
    });

    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');

    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false);
    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(true);
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.get('select#config-reasoning_effort').text()).toContain('medium');
    expect(wrapper.get('select#config-service_tier').text()).toContain('fast');
  });

  it('keeps compact effort-only reasoning controls collapsed but shows the effective default when expanded', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        compact: true,
        modelConfig: null,
        schema: {
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['low', 'medium', 'high', 'xhigh'],
            default: 'medium',
          },
        },
      },
    });

    const toggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');
    const reasoningSelect = wrapper.get('select#config-reasoning_effort');
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' });

    expect(thinkingRow.props('enabled')).toBe(true);
    expect(thinkingRow.props('neutralEnabled')).toBe(true);
    expect(thinkingRow.get('button').element.disabled).toBe(true);
    expect(thinkingRow.get('button').classes()).toContain('bg-gray-300');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(advancedContainer.attributes('style')).toContain('display: none');
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium');

    await toggle.trigger('click');

    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.emitted('update:config')).toBeUndefined();
  });

  it('renders OpenAI Responses none defaults off with primary advanced collapsed', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          reasoning_effort: {
            type: 'string',
            enum: ['none', 'low', 'medium', 'high'],
            default: 'none',
          },
          reasoning_summary: {
            type: 'string',
            enum: ['none', 'auto', 'concise'],
            default: 'none',
          },
        },
      },
    });

    const toggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' });

    expect(thinkingRow.props('enabled')).toBe(false);
    expect(thinkingRow.get('button').element.disabled).toBe(false);
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(advancedContainer.attributes('style')).toContain('display: none');
    expect((wrapper.get('select#config-reasoning_effort').element as HTMLSelectElement).value).toBe('none');
    expect((wrapper.get('select#config-reasoning_summary').element as HTMLSelectElement).value).toBe('none');
  });

  it('renders DeepSeek defaults on with advanced open and thinking_type owned by the toggle', () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          reasoning_effort: {
            type: 'string',
            enum: ['high', 'max'],
            default: 'high',
          },
          thinking_type: {
            type: 'string',
            enum: ['enabled', 'disabled'],
            default: 'enabled',
          },
        },
      },
    });

    const advancedLabels = wrapper.findAll('label[for]').map((label) => label.text().trim());
    const selects = wrapper.findAll('select');
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' });

    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="advanced-params-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(thinkingRow.props('enabled')).toBe(true);
    expect(thinkingRow.get('button').element.disabled).toBe(false);
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(0);
    expect(advancedLabels).toContain('Reasoning Effort');
    expect(advancedLabels).not.toContain('Thinking Type');
    expect(advancedLabels).not.toContain('Thinking');
    expect(wrapper.find('select#config-thinking_type').exists()).toBe(false);
    expect(selects).toHaveLength(1);
    expect((selects[0]?.element as HTMLSelectElement).value).toBe('high');
    expect(selects[0]?.text()).toContain('high');
    expect(selects[0]?.text()).toContain('max');
  });

  it('uses thinking_enabled to keep Claude-style mixed schemas off while showing effort defaults', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          thinking_enabled: {
            type: 'boolean',
            default: false,
          },
          reasoning_effort: {
            type: 'string',
            title: 'Reasoning Effort',
            enum: ['low', 'medium', 'high'],
            default: 'medium',
          },
        },
      },
    });

    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' });
    const reasoningSelect = wrapper.get('select#config-reasoning_effort');

    expect(thinkingRow.props('enabled')).toBe(false);
    expect(thinkingRow.get('button').element.disabled).toBe(false);
    expect(wrapper.get('[data-testid="advanced-params-toggle"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('button#config-thinking_enabled').exists()).toBe(false);
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium');
    expect(wrapper.emitted('update:config')).toBeUndefined();

    await thinkingRow.get('button').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toEqual({
      thinking_enabled: true,
    });
    expect(wrapper.get('[data-testid="advanced-params-toggle"]').attributes('aria-expanded')).toBe('true');
  });

  it('renders Gemini and GLM effective defaults through the top-level thinking row', () => {
    const geminiOff = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          thinking_level: { type: 'string', enum: ['minimal', 'low', 'medium'], default: 'minimal' },
          include_thoughts: { type: 'boolean', default: false },
        },
      },
    });
    const geminiOn = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          thinking_level: { type: 'string', enum: ['minimal', 'low', 'medium'], default: 'medium' },
        },
      },
    });
    const glmOn = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          thinking_type: { type: 'string', enum: ['enabled', 'disabled'], default: 'enabled' },
        },
      },
    });

    expect(geminiOff.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(false);
    expect(geminiOff.get('[data-testid="advanced-params-toggle"]').attributes('aria-expanded')).toBe('false');
    expect((geminiOff.get('select#config-thinking_level').element as HTMLSelectElement).value).toBe('minimal');
    expect(geminiOn.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(true);
    expect(geminiOn.get('[data-testid="advanced-params-toggle"]').attributes('aria-expanded')).toBe('true');
    expect((geminiOn.get('select#config-thinking_level').element as HTMLSelectElement).value).toBe('medium');
    expect(glmOn.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(true);
    expect(glmOn.find('select#config-thinking_type').exists()).toBe(false);
  });

  it('opens advanced params when a real thinking toggle is changed from off to on', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        compact: true,
        modelConfig: {
          thinking_type: 'disabled',
        },
        schema: {
          reasoning_effort: {
            type: 'string',
            enum: ['high', 'max'],
            default: 'high',
          },
          thinking_type: {
            type: 'string',
            enum: ['enabled', 'disabled'],
            default: 'enabled',
          },
        },
      },
    });

    const advancedToggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');
    expect(advancedToggle.attributes('aria-expanded')).toBe('false');
    expect(advancedContainer.attributes('style')).toContain('display: none');

    await wrapper.getComponent({ name: 'ModelConfigBasic' }).get('button').trigger('click');
    await wrapper.vm.$nextTick();

    expect(advancedToggle.attributes('aria-expanded')).toBe('true');
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toEqual({
      thinking_type: 'enabled',
      reasoning_effort: 'high',
    });
  });

  it('keeps advanced open after a user toggles thinking off', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: {
          reasoning_effort: 'high',
          thinking_type: 'enabled',
        },
        schema: {
          reasoning_effort: {
            type: 'string',
            enum: ['high', 'max'],
            default: 'high',
          },
          thinking_type: {
            type: 'string',
            enum: ['enabled', 'disabled'],
            default: 'enabled',
          },
        },
      },
    });

    const advancedToggle = wrapper.get('[data-testid="advanced-params-toggle"]');
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]');
    expect(advancedToggle.attributes('aria-expanded')).toBe('true');

    await wrapper.getComponent({ name: 'ModelConfigBasic' }).get('button').trigger('click');
    await wrapper.vm.$nextTick();

    expect(advancedToggle.attributes('aria-expanded')).toBe('true');
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toEqual({
      thinking_type: 'disabled',
    });
  });

  it('emits Codex Fast mode through service_tier and removes it through Default', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: null,
        schema: {
          service_tier: {
            type: 'string',
            title: 'Fast mode',
            enum: ['fast'],
          },
        },
      },
    });

    const select = wrapper.get('select');
    await select.setValue('fast');

    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toEqual({
      service_tier: 'fast',
    });

    await wrapper.setProps({
      modelConfig: { service_tier: 'fast' },
    });
    await select.setValue('__default__');

    expect(wrapper.emitted('update:config')?.at(-1)?.[0]).toBeNull();
  });

  it('sanitizes stale Codex Fast mode when the current schema no longer supports it', async () => {
    const wrapper = mount(ModelConfigSection, {
      props: {
        modelConfig: {
          service_tier: 'fast',
          reasoning_effort: 'high',
        },
        schema: {
          reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    });

    await wrapper.vm.$nextTick();

    const updates = wrapper.emitted('update:config') || [];
    const hasSanitizedUpdate = updates.some((args) =>
      JSON.stringify(args[0]) === JSON.stringify({ reasoning_effort: 'high' }),
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
        inlineSingleAdvancedRowWhenThinkingOn: true,
        schema: {
          reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
        },
      },
    });

    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="missing-historical-config-basic"]').text()).toContain('Not recorded for this historical run');
    expect(wrapper.get('[data-testid="missing-historical-config-value"]').text()).toContain('Not recorded for this historical run');
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.emitted('update:config')).toBeUndefined();
  });
});
