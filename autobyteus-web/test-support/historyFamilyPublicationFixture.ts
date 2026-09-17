import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';
export const historyWorkspaceFixture = (active = false): RunHistoryWorkspaceGroup => ({
  workspaceRootPath: '/fixture', workspaceName: 'Fixture Workspace',
  agentDefinitions: [{ agentDefinitionId: 'agent-definition', agentName: 'History Agent', runs: [{
    runId: 'agent-history', summary: 'Agent conversation', createdAt: '2026-09-03T00:00:00.000Z',
    status: active ? AgentStatus.Running : AgentStatus.Offline, isActive: active,
  }] }], teamDefinitions: [],
});
export const buildAgentOrgHistoryRow = (input: {
  rootRunId: string;
  workspaceRootPath?: string | null;
  definitionId?: string;
  definitionName?: string;
  summary?: string;
  treeRootRunId?: string;
}): Record<string, unknown> => {
  const launchConfiguration = {
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.6-sol',
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    workspaceRootPath: input.workspaceRootPath ?? null,
  };
  return {
    root_subject_kind: 'agent_org',
    root_run_id: input.rootRunId,
    created_at: '2026-09-03T00:00:00.000Z',
    archived_at: null,
    is_active: false,
    summary: input.summary ?? 'Agent Org run',
    org: {
      schemaVersion: 1,
      subjectKind: 'agent_org',
      createdAt: '2026-09-03T00:00:00.000Z',
      archivedAt: null,
      applicationBinding: null,
      handoffs: [],
      rootOrg: {
        address: '/',
        orgDefinitionId: input.definitionId ?? 'org-definition',
        orgDefinitionName: input.definitionName ?? 'Delivery Org',
        orgRunId: input.treeRootRunId ?? input.rootRunId,
        defaultLaunchConfiguration: launchConfiguration,
        taskExecutions: [],
        members: [{
          address: '/writer',
          agentDefinitionId: 'writer-definition',
          role: null,
          description: null,
          agentRunId: `writer-${input.rootRunId}`,
          platformAgentRunId: null,
          launchConfiguration,
        }],
      },
    },
  };
};
