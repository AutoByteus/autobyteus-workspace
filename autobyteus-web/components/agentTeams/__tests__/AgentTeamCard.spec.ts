import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentTeamCard from '../AgentTeamCard.vue';

describe('AgentTeamCard', () => {
  it('does not render the legacy updated status row', () => {
    const wrapper = mount(AgentTeamCard, {
      props: {
        teamDef: {
          id: 'team-1',
          name: 'Super Team',
          description: 'Team description',
          role: 'Orchestration',
          avatarUrl: null,
          coordinatorMemberName: 'lead_agent',
          nodes: [
            {
              memberName: 'lead_agent',
              referenceId: 'agent-1',
              referenceType: 'AGENT',
            },
            {
              memberName: 'nested_team',
              referenceId: 'team-2',
              referenceType: 'AGENT_TEAM',
            },
          ],
        },
      },
    });

    expect(wrapper.text()).toContain('Coordinator');
    expect(wrapper.text()).toContain('Members');
    expect(wrapper.text()).toContain('Nested Teams');
    expect(wrapper.text()).not.toContain('Updated');
    expect(wrapper.text()).not.toContain('Not tracked');
  });
});
