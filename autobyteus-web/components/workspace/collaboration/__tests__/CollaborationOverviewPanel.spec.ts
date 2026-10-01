import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import CollaborationOverviewPanel from '../CollaborationOverviewPanel.vue';
import {
  buildTestTeamContext,
  testAgentNode,
  testDelegation,
} from '~/test-support/currentTeamTestFixtures';
import { testCollaborationMessagesContextView } from '~/test-support/teamWorkspaceContextView';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
};

const CollaborationMessagesPanelStub = defineComponent({
  name: 'CollaborationMessagesPanel',
  props: ['messages'],
  template: '<div data-test="collaboration-messages-panel" />',
});

const seedTeam = () => buildTestTeamContext({
  teamRunId: 'team-1',
  teamDefinitionName: 'Engineering Team',
  rootChildren: [
    testAgentNode('/implementation_engineer', { agentRunId: 'impl-run' }),
    testAgentNode('/code_reviewer', { agentRunId: 'review-run' }),
  ],
  coordinatorAddress: '/implementation_engineer',
  focusedAgentRunId: 'impl-run',
  delegations: [testDelegation({
    delegatorAgentRunId: 'impl-run', recipientAddress: '/code_reviewer', target: { agentRunId: 'review-child-run' },
  })],
  messages: [{
    message_id: 'message-1', sender_agent_run_id: 'impl-run', receiver_agent_run_id: 'review-child-run',
    content: 'Please review this.', message_type: 'agent_message', created_at: '2026-04-12T10:00:00.000Z',
    reference_files: [],
  }],
});

const mountPanel = () => {
  const team = seedTeam();
  return mount(CollaborationOverviewPanel, {
    props: { messages: testCollaborationMessagesContextView(team) },
    global: {
      stubs: { CollaborationMessagesPanel: CollaborationMessagesPanelStub },
      mocks: { $t: (key: string) => labels[key] ?? key },
    },
  });
};

describe('CollaborationOverviewPanel', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('shows only the Messages section, always expanded, with no delegated-task section or toggle', () => {
    const wrapper = mountPanel();
    expect(wrapper.find('[data-test="collaboration-messages-section"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="collaboration-messages-panel"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-test="collaboration-messages-header"]').element.tagName).toBe('DIV');
    expect(wrapper.text()).toContain('1 Messages');
    expect(wrapper.text()).not.toMatch(/task/i);
    expect(wrapper.findAll('button')).toHaveLength(0);
  });
});
