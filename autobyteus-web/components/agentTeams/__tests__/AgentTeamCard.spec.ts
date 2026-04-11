import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentTeamCard from '../AgentTeamCard.vue';

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'agentTeams.components.agentTeams.AgentTeamCard.moreCount') {
        return `+${params?.count ?? 0} more`;
      }

      const translations: Record<string, string> = {
        'agentTeams.components.agentTeams.AgentTeamCard.uncategorized': 'Uncategorized',
        'agentTeams.components.agentTeams.AgentTeamCard.sync': 'Sync',
        'agentTeams.components.agentTeams.AgentTeamCard.run': 'Run',
        'agentTeams.components.agentTeams.AgentTeamCard.view_details': 'View Details',
        'agentTeams.components.agentTeams.AgentTeamCard.and_rarr': '->',
        'agentTeams.components.agentTeams.AgentTeamCard.teamBadge': 'Team-local',
        'agentTeams.components.agentTeams.AgentTeamCard.no_members_defined': 'No members defined',
        'agentTeams.components.agentTeams.AgentTeamCard.coordinator': 'Coordinator',
        'agentTeams.components.agentTeams.AgentTeamCard.members': 'Members',
        'agentTeams.components.agentTeams.AgentTeamCard.nested_teams': 'Nested Teams',
        'agentTeams.components.agentTeams.AgentTeamCard.notAssigned': 'Not assigned',
        'agentTeams.components.agentTeams.AgentTeamCard.noDescription': 'No description',
      };

      return translations[key] ?? key;
    },
  }),
}));

const buildTeamDefinition = (overrides: Record<string, unknown> = {}) => ({
  id: 'team-1',
  name: 'Software Engineering Team',
  description: 'Team description',
  instructions: 'Team instructions',
  category: 'software-engineering',
  coordinatorMemberName: 'solution_designer',
  updatedAt: '2026-04-10T09:00:00.000Z',
  nodes: [
    { memberName: 'solution_designer', ref: 'agent-1', refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'architect_reviewer', ref: 'agent-2', refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'implementation_engineer', ref: 'agent-3', refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'api_e2e_engineer', ref: 'agent-4', refType: 'AGENT', refScope: 'SHARED' },
  ],
  ...overrides,
});

describe('AgentTeamCard', () => {
  it('does not render updated metadata in the footer', () => {
    const wrapper = mount(AgentTeamCard, {
      props: {
        teamDef: buildTeamDefinition(),
      },
      global: {
        mocks: {
          $t: (key: string) => {
            const translations: Record<string, string> = {
              'agentTeams.components.agentTeams.AgentTeamCard.uncategorized': 'Uncategorized',
              'agentTeams.components.agentTeams.AgentTeamCard.sync': 'Sync',
              'agentTeams.components.agentTeams.AgentTeamCard.run': 'Run',
              'agentTeams.components.agentTeams.AgentTeamCard.view_details': 'View Details',
              'agentTeams.components.agentTeams.AgentTeamCard.and_rarr': '->',
              'agentTeams.components.agentTeams.AgentTeamCard.teamBadge': 'Team-local',
              'agentTeams.components.agentTeams.AgentTeamCard.no_members_defined': 'No members defined',
              'agentTeams.components.agentTeams.AgentTeamCard.coordinator': 'Coordinator',
              'agentTeams.components.agentTeams.AgentTeamCard.members': 'Members',
              'agentTeams.components.agentTeams.AgentTeamCard.nested_teams': 'Nested Teams',
            };

            return translations[key] ?? key;
          },
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
