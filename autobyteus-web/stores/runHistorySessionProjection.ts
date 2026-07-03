import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import {
  resolveWorkspaceHistorySessionDisplayLabel,
  type WorkspaceHistorySessionDisplayLabel,
} from '~/stores/runHistorySessionLabels';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { RunTreeRow, RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

export type WorkspaceHistorySessionKind = 'agent' | 'team';

export interface WorkspaceHistoryAgentSessionSource {
  sourceName: string;
}

export interface WorkspaceHistoryTeamSessionSource {
  sourceName: string;
  memberCount: number;
}

export interface WorkspaceHistoryAgentSessionRow {
  kind: 'agent';
  sessionKey: string;
  sessionId: string;
  workspaceRootPath: string;
  displayLabel: WorkspaceHistorySessionDisplayLabel;
  source: WorkspaceHistoryAgentSessionSource;
  status: AgentStatus;
  isActive: boolean;
  lastActivityAt: string;
  agentRun: RunTreeRow;
}

export interface WorkspaceHistoryTeamSessionRow {
  kind: 'team';
  sessionKey: string;
  sessionId: string;
  workspaceRootPath: string;
  displayLabel: WorkspaceHistorySessionDisplayLabel;
  source: WorkspaceHistoryTeamSessionSource;
  status: AgentTeamStatus;
  isActive: boolean;
  lastActivityAt: string;
  teamRun: TeamTreeNode;
}

export type WorkspaceHistorySessionRow =
  | WorkspaceHistoryAgentSessionRow
  | WorkspaceHistoryTeamSessionRow;

export interface BuildWorkspaceHistorySessionRowsInput {
  workspaceNode: RunTreeWorkspaceNode;
  teamNodes: TeamTreeNode[];
}

export const toWorkspaceHistorySessionKey = (
  kind: WorkspaceHistorySessionKind,
  sessionId: string,
): string => `${kind}:${sessionId.trim()}`;

const asTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareSessions = (
  a: WorkspaceHistorySessionRow,
  b: WorkspaceHistorySessionRow,
): number => {
  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1;
  }

  const byActivity = asTimestamp(b.lastActivityAt) - asTimestamp(a.lastActivityAt);
  if (byActivity !== 0) {
    return byActivity;
  }

  return a.sessionKey.localeCompare(b.sessionKey);
};

const explicitTitleFrom = (source: unknown): string | null => {
  const candidate = source as {
    displayTitle?: unknown;
    sessionTitle?: unknown;
  };
  if (typeof candidate.displayTitle === 'string') {
    return candidate.displayTitle;
  }
  if (typeof candidate.sessionTitle === 'string') {
    return candidate.sessionTitle;
  }
  return null;
};

const flattenTeamMembers = (members: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
  members.flatMap((member) => [member, ...flattenTeamMembers(member.children)]);

const rootTeamMembers = (team: TeamTreeNode): readonly TeamMemberTreeRow[] => (
  team.memberTree.length > 0 ? team.memberTree : team.members
);

const teamMemberCount = (team: TeamTreeNode): number => flattenTeamMembers(rootTeamMembers(team)).length;

export const buildWorkspaceHistorySessionRows = ({
  workspaceNode,
  teamNodes,
}: BuildWorkspaceHistorySessionRowsInput): WorkspaceHistorySessionRow[] => {
  const sessions: WorkspaceHistorySessionRow[] = [];

  for (const agentNode of workspaceNode.agents) {
    for (const run of agentNode.runs) {
      sessions.push({
        kind: 'agent',
        sessionKey: toWorkspaceHistorySessionKey('agent', run.runId),
        sessionId: run.runId,
        workspaceRootPath: workspaceNode.workspaceRootPath,
        displayLabel: resolveWorkspaceHistorySessionDisplayLabel({
          kind: 'agent',
          explicitTitle: explicitTitleFrom(run),
          summary: run.summary,
          sourceName: agentNode.agentName,
        }),
        source: {
          sourceName: agentNode.agentName || 'Agent',
        },
        status: run.currentStatus,
        isActive: run.isActive,
        lastActivityAt: run.lastActivityAt,
        agentRun: run,
      });
    }
  }

  for (const team of teamNodes) {
    const memberCount = teamMemberCount(team);
    sessions.push({
      kind: 'team',
      sessionKey: toWorkspaceHistorySessionKey('team', team.teamRunId),
      sessionId: team.teamRunId,
      workspaceRootPath: team.workspaceRootPath,
      displayLabel: resolveWorkspaceHistorySessionDisplayLabel({
        kind: 'team',
        explicitTitle: explicitTitleFrom(team),
        summary: team.summary,
        sourceName: team.teamDefinitionName,
        memberCount,
      }),
      source: {
        sourceName: team.teamDefinitionName || 'Team',
        memberCount,
      },
      status: team.currentStatus,
      isActive: team.isActive,
      lastActivityAt: team.lastActivityAt,
      teamRun: team,
    });
  }

  return sessions.sort(compareSessions);
};
