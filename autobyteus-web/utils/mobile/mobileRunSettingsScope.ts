import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';

/**
 * Whose runtime and model the phone's Settings change for the open run (autobyteus-458), in the desktop's saved-run
 * settings (`useExistingRunConfigStore`): an agent run is its own run; a Team member is its scope in its Team run; an
 * Org's direct agent or Org Team member is its scope in its Org run. A stop stops that run (the Team or the Org).
 * Delegated copies (task agents and task teams) are edited elsewhere on the desktop: Settings does not serve them (null).
 */
export type MobileRunSettingsScope =
  | Readonly<{ kind: 'agent'; runId: string; address: '/' }>
  | Readonly<{ kind: 'team'; teamRunId: string; address: string }>
  | Readonly<{ kind: 'agent_org'; orgRunId: string; address: string }>;

export const mobileRunSettingsScope = (target: ActiveAgentWorkspaceTarget): MobileRunSettingsScope | null => {
  switch (target.kind) {
    case 'standalone_agent':
      return { kind: 'agent', runId: target.context.state.runId, address: '/' };
    case 'standalone_team_member':
      return { kind: 'team', teamRunId: target.team.rootRunId, address: target.team.focusedMemberAddress };
    case 'agent_org_direct_agent':
    case 'agent_org_team_member':
      return { kind: 'agent_org', orgRunId: target.root.orgRunId, address: target.address };
    default:
      return null;
  }
};
