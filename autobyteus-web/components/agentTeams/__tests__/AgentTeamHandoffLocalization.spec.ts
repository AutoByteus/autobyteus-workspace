import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentTeamDefinitionForm from '../AgentTeamDefinitionForm.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

const { agentDefinitionStore, fileUploadStore } = vi.hoisted(() => {
  const agent = { id: 'agent-1', name: 'Agent One', ownershipScope: 'SHARED' };
  return {
    agentDefinitionStore: {
      agentDefinitions: [agent],
      sharedAgentDefinitions: [agent],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
      getAgentDefinitionById: vi.fn((id: string) => id === agent.id ? agent : null),
      getTeamLocalAgentDefinitionsByOwnerTeamId: vi.fn(() => []),
    },
    fileUploadStore: {
      isUploading: false,
      error: null,
      uploadFile: vi.fn().mockResolvedValue(''),
    },
  };
});

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStore,
}));

vi.mock('~/stores/fileUploadStore', () => ({
  useFileUploadStore: () => fileUploadStore,
}));

const translate = (key: string, params?: Record<string, string | number>): string => (
  localizationRuntime.translate(key, params)
);

describe('AgentTeamDefinitionForm handoff localization', () => {
  afterEach(async () => {
    await localizationRuntime.setPreference('en');
  });

  it('renders both native handoff endpoint groups from the zh-CN catalog', async () => {
    await localizationRuntime.setPreference('zh-CN');
    const wrapper = mount(AgentTeamDefinitionForm, {
      props: {
        isSubmitting: false,
        submitButtonText: 'Create Team',
      },
      global: {
        mocks: { $t: translate },
        stubs: {
          DefinitionLaunchPreferencesSection: true,
        },
      },
    });

    const agentButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Agent One'));
    expect(agentButton).toBeDefined();
    await agentButton!.trigger('click');
    await wrapper.get('[data-test="add-handoff"]').trigger('click');

    expect(wrapper.findAll('optgroup').map((group) => group.attributes('label'))).toEqual([
      '团队智能体',
      '团队智能体',
    ]);
    expect(wrapper.text()).toContain('添加交接规则');
  });
});
