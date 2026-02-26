import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkspaceRunsSection from '../WorkspaceRunsSection.vue';

describe('WorkspaceRunsSection', () => {
  const mountComponent = () => mount(WorkspaceRunsSection, {
    props: {
      workspaceNodes: [
        {
          workspaceRootPath: '/ws/a',
          workspaceName: 'Temp Workspace',
          agents: [
            {
              agentDefinitionId: 'agent-def-1',
              agentName: 'Super Agent',
              agentAvatarUrl: null,
              runs: [
                {
                  agentId: 'run-1',
                  summary: 'Do work',
                  lastActivityAt: '2026-01-01T00:00:00.000Z',
                  lastKnownStatus: 'IDLE',
                  isActive: false,
                  source: 'history',
                  isDraft: false,
                },
              ],
            },
          ],
        },
      ],
      selectedAgentId: null,
      expandedWorkspace: {},
      expandedAgents: {},
      terminatingAgentIds: {},
      deletingAgentIds: {},
      showAgentAvatar: () => false,
      formatRelativeTime: () => 'now',
    },
    global: {
      stubs: {
        Icon: { template: '<span class="icon-stub" />' },
      },
    },
  });

  it('emits run selection and create-run intent', async () => {
    const wrapper = mountComponent();

    const runButton = wrapper.findAll('button').find((button) => button.text().includes('Do work'));
    expect(runButton).toBeTruthy();
    await runButton!.trigger('click');

    const createRunButton = wrapper.find('button[title="New run with this agent"]');
    await createRunButton.trigger('click');

    expect(wrapper.emitted('select-run')).toBeTruthy();
    expect(wrapper.emitted('create-run')?.[0]).toEqual(['/ws/a', 'agent-def-1']);
  });

  it('emits delete-run when delete button is clicked', async () => {
    const wrapper = mountComponent();
    const deleteButton = wrapper.find('button[title="Delete run permanently"]');
    expect(deleteButton.exists()).toBe(true);

    await deleteButton.trigger('click');
    expect(wrapper.emitted('delete-run')).toBeTruthy();
  });
});
