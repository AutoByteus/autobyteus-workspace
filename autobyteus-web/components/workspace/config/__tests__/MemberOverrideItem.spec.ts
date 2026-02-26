import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MemberOverrideItem from '../MemberOverrideItem.vue';
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: vi.fn()
}));

describe('MemberOverrideItem', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    
    // Setup mock store
    const mockStore = {
        providersWithModels: [
          {
            provider: 'Google',
            models: [
              { 
                modelIdentifier: 'gemini-1.5-pro', 
                name: 'Gemini 1.5 Pro', 
                value: 'gemini-1.5-pro', 
                canonicalName: 'gemini-1.5-pro', 
                provider: 'google', 
                runtime: 'python',
                configSchema: {
                    thinking_level: { type: 'integer', description: 'Thinking Budget' }
                }
              }
            ]
          }
        ],
        fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
        modelConfigSchemaByIdentifier: vi.fn((id) => {
             // Access providersWithModels from the mock object itself if possible, or use closure
             // But here we can just use the local var if we define it outside?
             // Or simpler: access this.providersWithModels if binding works, but mockReturnValue usually returns plain obj.
             // We can just rely on the test updating the return value if needed, or implement logic here.
             
             // Simplest: duplicate logic, using the mockStore object defined below in closure?
             // But we can't access it before declaration.
             // Let's use a function that accesses a variable we can update.
             return null; 
        }) 
    };
    
    // Fix circular ref for getter logic
    mockStore.modelConfigSchemaByIdentifier = vi.fn((id) => {
         const model = mockStore.providersWithModels.flatMap(p => p.models).find(m => m.modelIdentifier === id);
         return model?.configSchema || null;
    });

    (useLLMProviderConfigStore as any).mockReturnValue(mockStore);
  });

  const defaultProps = {
    memberName: 'Member A',
    agentDefinitionId: 'def-1',
    override: undefined,
    globalLlmModel: 'gemini-1.5-pro',
    options: [],
    disabled: false,
    isCoordinator: false,
  };

  it('renders correctly', () => {
    const wrapper = mount(MemberOverrideItem, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('Member A');
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true); // Auto-execute checkbox
  });

  it('inherits global model schema when no override is set', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: undefined,
        globalLlmModel: 'gemini-1.5-pro'
      },
    });

    await wrapper.vm.$nextTick();

    const advancedToggle = wrapper.find('[data-testid=\"advanced-params-toggle\"]');
    await advancedToggle.trigger('click');

    // Check if dynamic form from global model is visible
    expect(wrapper.text()).toContain('Thinking Level');
    expect(wrapper.text()).toContain('Thinking Level');
  });

  it('uses overridden model schema when override is set', async () => {
     const store = useLLMProviderConfigStore();
     store.providersWithModels.push({
         provider: 'Anthropic',
         models: [{ 
             modelIdentifier: 'claude-3-opus', 
             name: 'Claude 3 Opus', 
             value: 'claude-3-opus', provider: 'anthropic', runtime: 'python', canonicalName: 'claude-3-opus',
             configSchema: {
                 thinking_enabled: { type: 'boolean', description: 'Enable Thinking' }
             }
         }]
     });

    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
            agentDefinitionId: 'def-1',
            llmModelIdentifier: 'claude-3-opus'
        },
        globalLlmModel: 'gemini-1.5-pro'
      },
    });

    await wrapper.vm.$nextTick();

    const advancedToggle = wrapper.find('[data-testid=\"advanced-params-toggle\"]');
    await advancedToggle.trigger('click');

    expect(wrapper.text()).toContain('Thinking Enabled');
    expect(wrapper.text()).not.toContain('system_prompt_strength');
  });

  it('emits update:override with llmConfig when dynamic input changes', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: defaultProps,
    });

    await wrapper.vm.$nextTick();
    
    const advancedToggle = wrapper.find('[data-testid=\"advanced-params-toggle\"]');
    await advancedToggle.trigger('click');

    const label = wrapper.findAll('label').find(l => l.text().includes('Thinking Level'));
    const inputId = label?.attributes('for');
    const input = wrapper.find(`input[id="${inputId}"]`);
    
    await input.setValue('5');
    
    expect(wrapper.emitted('update:override')).toBeTruthy();
    const eventArgs = wrapper.emitted('update:override')![0];
    // memberName is arg 0, override is arg 1
    expect(eventArgs[0]).toBe('Member A');
    
    const emittedOverride = eventArgs[1] as any;
    expect(emittedOverride.llmConfig.thinking_level).toBe(5);
  });
});
