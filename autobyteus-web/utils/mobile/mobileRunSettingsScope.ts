import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';

/**
 * Whose runtime and model the phone's Settings change for the opened agent: the run that holds it (`target.browse`, built
 * by that run's own open), for every kind of run (autobyteus-522). An agent run, a standalone one or a task agent, is its
 * own run; a member of a Team run (a standalone Team or a task team) is its address in that Team run; an Org's own agent
 * or Org Team member is its address in the Org run. A stop stops that run. A run on another node is `remote`: this node
 * cannot change it, and Settings says so.
 */
export type MobileRunSettingsScope =
  | Readonly<{ kind: 'agent'; runId: string; address: '/' }>
  | Readonly<{ kind: 'team'; teamRunId: string; address: string }>
  | Readonly<{ kind: 'agent_org'; orgRunId: string; address: string }>
  | Readonly<{ kind: 'remote' }>;

export const mobileRunSettingsScope = (target: ActiveAgentWorkspaceTarget): MobileRunSettingsScope => {
  const run = target.browse;
  switch (run.kind) {
    case 'run': return { kind: 'agent', runId: run.runId, address: '/' };
    case 'teamMember': return { kind: 'team', teamRunId: run.teamRunId, address: run.memberAddress };
    case 'agentOrgMember': return { kind: 'agent_org', orgRunId: run.orgRunId, address: run.memberAddress };
    case 'peerRun': return { kind: 'remote' };
  }
};
