import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamMemberTreeRow, TeamTreeNode, TeamRunHistoryItem } from '~/stores/runHistoryTypes';
import { buildTeamRowsFromContext, buildTeamRowsFromHistoryItem, flattenTeamRows } from '~/stores/runHistoryTeamRows';

const leafContexts = (teamContext: AgentTeamContext): readonly AgentContext[] =>
  teamContext.view.listAgentContextEntries().map((entry) => entry.agentContext);

const persistentMemberContext = (teamContext: AgentTeamContext, memberAddress: string): AgentContext | null => {
  if (!memberAddress) return null;
  const entry = teamContext.view.listAgentContextEntries().find(
    (candidate) => candidate.memberAddress === memberAddress,
  );
  return entry?.agentContext ?? null;
};

export const summarizeTeamDraft = (teamContext: AgentTeamContext, draftSummaryPrefix: string): string => {
  const coordinatorContext = persistentMemberContext(
    teamContext,
    teamContext.view.getExecutionTree().root_team.coordinator_address,
  );
  const firstCoordinatorUserMessage = coordinatorContext?.state.conversation.messages.find(
    (message) => message.type === 'user' && message.text?.trim().length > 0,
  );
  if (firstCoordinatorUserMessage?.type === 'user') return firstCoordinatorUserMessage.text.trim();
  for (const memberContext of leafContexts(teamContext)) {
    const message = memberContext.state.conversation.messages.find(
      (candidate) => candidate.type === 'user' && candidate.text?.trim().length > 0,
    );
    if (message?.type === 'user') return message.text.trim();
  }
  return `${draftSummaryPrefix}${teamContext.view.getTeamDefinitionName() || 'Team'}`.trim();
};

export const resolveTeamLastActivityAt = (teamContext: AgentTeamContext): string => {
  let latest = '';
  for (const member of leafContexts(teamContext)) {
    const timestamp = member.state.conversation.updatedAt || member.state.conversation.createdAt || '';
    if (timestamp > latest) latest = timestamp;
  }
  return latest || new Date().toISOString();
};

export const resolveTeamWorkspaceRootPathFromContext = (
  teamContext: AgentTeamContext,
  resolveWorkspaceRootPath: (workspaceId: string | null) => string,
  unassignedWorkspaceKey: string,
): string => {
  const config = teamContext.view.getConfigurationView();
  const configured = config.workspaceMetadata?.workspaceRootPath
    || resolveWorkspaceRootPath(config.workspaceId);
  if (configured) return configured;
  for (const member of leafContexts(teamContext)) {
    const root = member.config.workspaceMetadata?.workspaceRootPath
      || resolveWorkspaceRootPath(member.config.workspaceId);
    if (root) return root;
  }
  return unassignedWorkspaceKey;
};

const rootDisplayRow = (params: {
  teamRunId: string;
  displayName: string;
  teamDefinitionId: string;
  coordinatorAddress: string;
  summary: string;
  lastActivityAt: string;
  isActive: boolean;
  children: TeamMemberTreeRow[];
}): TeamMemberTreeRow => ({
  teamRunId: params.teamRunId,
  kind: 'agent_team',
  memberAddress: '/',
  displayName: params.displayName,
  agentRunId: null,
  teamDefinitionId: params.teamDefinitionId,
  teamRunIdForNode: params.teamRunId,
  coordinatorAddress: params.coordinatorAddress,
  workspaceRootPath: null,
  summary: params.summary,
  lastActivityAt: params.lastActivityAt,
  currentStatus: null,
  isActive: params.isActive,
  deleteLifecycle: 'READY',
  children: params.children,
});

export const buildTeamNodes = (params: {
  teamRuns: TeamRunHistoryItem[];
  teamContexts: AgentTeamContext[];
  workspaceRootPath?: string;
  normalizeRootPath: (value: string | null | undefined) => string;
  resolveWorkspaceRootPath: (workspaceId: string | null) => string;
  resolveWorkspaceRootPathFromContext: (teamContext: AgentTeamContext) => string;
  summarizeTeamDraft: (teamContext: AgentTeamContext) => string;
  resolveTeamLastActivityAt: (teamContext: AgentTeamContext) => string;
  unassignedWorkspaceKey: string;
}): TeamTreeNode[] => {
  const nodesByTeamRunId = new Map<string, TeamTreeNode>();
  for (const team of params.teamRuns) {
    const fallbackWorkspaceRootPath = team.members
      .map((member) => params.normalizeRootPath(member.workspaceRootPath)).find(Boolean)
      || params.unassignedWorkspaceKey;
    const workspaceRootPath = params.normalizeRootPath(team.workspaceRootPath) || fallbackWorkspaceRootPath;
    const children = buildTeamRowsFromHistoryItem(team);
    const members = flattenTeamRows(children);
    const memberAddress = members.some((member) => member.memberAddress === team.coordinatorAddress)
      ? team.coordinatorAddress : members[0]?.memberAddress || '/';
    const focusedAgentRunId = members.find((member) => member.memberAddress === memberAddress)?.agentRunId
      ?? members.find((member) => member.agentRunId)?.agentRunId
      ?? '';
    const rootTeam = rootDisplayRow({
      teamRunId: team.teamRunId,
      displayName: team.teamDefinitionName || 'Team',
      teamDefinitionId: team.teamDefinitionId,
      coordinatorAddress: team.coordinatorAddress,
      summary: team.summary,
      lastActivityAt: team.createdAt,
      isActive: team.isActive,
      children,
    });
    nodesByTeamRunId.set(team.teamRunId, {
      teamRunId: team.teamRunId,
      teamDefinitionId: team.teamDefinitionId,
      teamDefinitionName: team.teamDefinitionName || 'Team',
      workspaceRootPath,
      summary: team.summary,
      lastActivityAt: team.createdAt,
      isActive: team.isActive,
      deleteLifecycle: 'READY',
      focusedAgentRunId,
      rootTeam,
      members,
      executionRows: [],
    });
  }
  for (const teamContext of params.teamContexts) {
    const teamRunId = teamContext.view.getRootTeamRunId();
    const existing = nodesByTeamRunId.get(teamRunId);
    const workspaceRootPath = existing?.workspaceRootPath || params.resolveWorkspaceRootPathFromContext(teamContext);
    const summary = existing?.summary?.trim() || params.summarizeTeamDraft(teamContext);
    const lastActivityAt = existing?.lastActivityAt || params.resolveTeamLastActivityAt(teamContext);
    const children = buildTeamRowsFromContext(teamContext, summary, lastActivityAt, params.resolveWorkspaceRootPath);
    const members = flattenTeamRows(children);
    const rootTeam = rootDisplayRow({
      teamRunId,
      displayName: teamContext.view.getTeamDefinitionName(),
      teamDefinitionId: teamContext.view.getExecutionTree().root_team.team_definition_id,
      coordinatorAddress: teamContext.view.getExecutionTree().root_team.coordinator_address,
      summary,
      lastActivityAt,
      isActive: teamContext.view.isRootTeamActive(),
      children,
    });
    const config = teamContext.view.getConfigurationView();
    nodesByTeamRunId.set(teamRunId, {
      teamRunId,
      teamDefinitionId: existing?.teamDefinitionId || config.teamDefinitionId || teamRunId,
      teamDefinitionName: config.teamDefinitionName || existing?.teamDefinitionName || 'Team',
      workspaceRootPath,
      summary,
      lastActivityAt,
      isActive: teamContext.view.isRootTeamActive(),
      deleteLifecycle: existing?.deleteLifecycle ?? 'READY',
      focusedAgentRunId: teamContext.view.getFocusedAgentRunId(),
      rootTeam,
      members,
      executionRows: [],
    });
  }
  const allNodes = Array.from(nodesByTeamRunId.values());
  if (!params.workspaceRootPath) return allNodes;
  const normalizedWorkspaceRootPath = params.normalizeRootPath(params.workspaceRootPath);
  return allNodes.filter((node) => node.workspaceRootPath === normalizedWorkspaceRootPath);
};
