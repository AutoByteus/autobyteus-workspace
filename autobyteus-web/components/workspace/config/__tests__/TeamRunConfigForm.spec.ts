import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamRunConfigForm from '../TeamRunConfigForm.vue';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { useRuntimeCapabilitiesStore } from '~/stores/runtimeCapabilitiesStore';

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: vi.fn(),
}));

vi.mock('~/stores/runtimeCapabilitiesStore', () => ({
  useRuntimeCapabilitiesStore: vi.fn(),
}));

const mockTeamDef = {
  id: 'team-1',
  name: 'Test Team',
  nodes: [
    { memberName: 'Member A', refType: 'AGENT', ref: 'agent-a' },
    { memberName: 'Member B', refType: 'AGENT', ref: 'agent-b' },
  ],
  coordinatorMemberName: 'Member A',
};

const mockConfig = {
  runtimeKind: 'autobyteus',
  llmModelIdentifier: '',
  autoExecuteTools: false,
  isLocked: false,
  workspaceId: null,
  memberOverrides: {},
};

describe('TeamRunConfigForm', () => {
  let llmStore: any;
  let runtimeStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());

    llmStore = {
      providersWithModels: [
        { provider: 'OpenAI', models: [{ modelIdentifier: 'gpt-4', name: 'GPT-4' }] },
      ],
      models: ['gpt-4'],
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
      modelConfigSchemaByIdentifier: vi.fn().mockReturnValue(null),
    };

    runtimeStore = {
      hasFetched: true,
      capabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
        { runtimeKind: 'codex_app_server', enabled: true, reason: null },
      ],
      fetchRuntimeCapabilities: vi.fn().mockResolvedValue([]),
      capabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeStore.capabilities.find((capability: any) => capability.runtimeKind === runtimeKind) ?? null,
      ),
      isRuntimeEnabled: vi.fn((runtimeKind: string) =>
        runtimeStore.capabilityByKind(runtimeKind)?.enabled ?? runtimeKind === 'autobyteus',
      ),
      runtimeReason: vi.fn((runtimeKind: string) =>
        runtimeStore.capabilityByKind(runtimeKind)?.reason ?? null,
      ),
    };

    (useLLMProviderConfigStore as any).mockReturnValue(llmStore);
    (useRuntimeCapabilitiesStore as any).mockReturnValue(runtimeStore);
  });

  const buildWrapper = (configOverrides: Record<string, unknown> = {}) => {
    const config = { ...mockConfig, ...configOverrides };
    const wrapper = mount(TeamRunConfigForm, {
      props: {
        config,
        teamDefinition: mockTeamDef as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
      global: {
        stubs: {
          WorkspaceSelector: true,
          SearchableGroupedSelect: {
            name: 'SearchableGroupedSelect',
            template: '<div class="searchable-select-stub"></div>',
            props: ['modelValue', 'disabled', 'options'],
            emits: ['update:modelValue'],
          },
          MemberOverrideItem: {
            name: 'MemberOverrideItem',
            template: '<div class="member-override-item-stub"></div>',
            props: ['memberName', 'override', 'isCoordinator', 'options', 'disabled', 'globalLlmModel'],
            emits: ['update:override'],
          },
        },
      },
    });
    return { wrapper, config };
  };

  it('renders runtime selector and member override entries', () => {
    const { wrapper } = buildWrapper();

    expect(wrapper.text()).toContain('Test Team');
    expect(wrapper.find('select#team-runtime-kind').exists()).toBe(true);
    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' });
    expect(items).toHaveLength(2);
    expect(items[0].props('memberName')).toBe('Member A');
  });

  it('loads model providers for selected runtime on mount', () => {
    buildWrapper({ runtimeKind: 'codex_app_server' });
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server');
  });

  it('uses model identifiers as labels for AutoByteus runtime selections', () => {
    llmStore.providersWithModels = [
      {
        provider: 'AutoByteus',
        models: [{ modelIdentifier: 'host-a/model-x', name: 'Model X' }],
      },
    ];

    const { wrapper } = buildWrapper({ runtimeKind: 'autobyteus' });
    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options');

    expect(options[0].items[0].name).toBe('host-a/model-x');
  });

  it('keeps provider model names for non-AutoByteus runtimes', () => {
    llmStore.providersWithModels = [
      {
        provider: 'OpenAI',
        models: [{ modelIdentifier: 'gpt-4', name: 'GPT-4' }],
      },
    ];

    const { wrapper } = buildWrapper({ runtimeKind: 'codex_app_server' });
    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options');

    expect(options[0].items[0].name).toBe('GPT-4');
  });

  it('changes runtime kind and reloads runtime-scoped models', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-4',
    });

    const runtimeSelect = wrapper.find('select#team-runtime-kind');
    await runtimeSelect.setValue('codex_app_server');

    expect(config.runtimeKind).toBe('codex_app_server');
    expect(config.llmModelIdentifier).toBe('');
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server');
  });

  it('passes global model to member overrides', () => {
    const { wrapper } = buildWrapper({ llmModelIdentifier: 'gpt-4' });
    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' });
    expect(items[0].props('globalLlmModel')).toBe('gpt-4');
  });

  it('handles auto-execute toggle', async () => {
    const { wrapper, config } = buildWrapper();
    await wrapper.find('button#team-auto-execute').trigger('click');
    expect(config.autoExecuteTools).toBe(true);
  });
});
