import {
  FALLBACK_AGENT_NAME,
  FALLBACK_WORKSPACE_NAME,
  INVALID_DRAFT_WORKSPACE_WARNING,
} from '~/utils/runTreeProjectionConstants';
import type { AgentStatus } from '~/types/agent/AgentStatus';

export type ProjectionRunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';
export type RunTreeRowSource = 'history' | 'draft' | 'local';
export type ProjectionWorkspaceKind = 'filesystem' | 'temp';

export interface ProjectionRunItem {
  runId: string;
  summary: string;
  lastActivityAt: string;
  currentStatus: AgentStatus;
  lastKnownStatus: ProjectionRunKnownStatus;
  isActive: boolean;
}

export interface ProjectionAgentGroup {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  runs: ProjectionRunItem[];
}

export interface ProjectionWorkspaceGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agents: ProjectionAgentGroup[];
}

export interface ProjectionWorkspaceDescriptor {
  workspaceId: string;
  workspaceRootPath: string;
  workspaceName: string;
  workspaceKind: ProjectionWorkspaceKind;
  canRemoveFromWorkspaces: boolean;
}

export interface LocalRunSnapshot {
  runId: string;
  workspaceRootPath: string;
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  summary: string;
  lastActivityAt: string;
  currentStatus: AgentStatus;
  lastKnownStatus: ProjectionRunKnownStatus;
  isActive: boolean;
  source: Extract<RunTreeRowSource, 'draft' | 'local'>;
}

export interface RunTreeRow extends ProjectionRunItem {
  source: RunTreeRowSource;
  isDraft: boolean;
}

export interface RunTreeAgentNode {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  runs: RunTreeRow[];
}

export interface RunTreeWorkspaceNode {
  workspaceId: string;
  workspaceRootPath: string;
  workspaceName: string;
  workspaceKind: ProjectionWorkspaceKind;
  canRemoveFromWorkspaces: boolean;
  agents: RunTreeAgentNode[];
}

interface BuildRunTreeProjectionInput {
  persistedWorkspaces: ProjectionWorkspaceGroup[];
  workspaceDescriptors: ProjectionWorkspaceDescriptor[];
  localRuns: LocalRunSnapshot[];
}

interface MutableAgentNode {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl: string | null;
  runs: RunTreeRow[];
}

interface MutableWorkspaceNode {
  workspaceId: string;
  workspaceRootPath: string;
  workspaceName: string;
  workspaceKind: ProjectionWorkspaceKind;
  canRemoveFromWorkspaces: boolean;
  agentsById: Map<string, MutableAgentNode>;
}

const normalizeRootPath = (value: string | null | undefined): string => {
  const source = (value || '').trim();
  if (!source) {
    return '';
  }

  const normalized = source.replace(/\\/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/+$/, '');
};

const asTimestamp = (iso: string): number => {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
};

const compareRuns = (a: RunTreeRow, b: RunTreeRow): number => {
  const byActivity = asTimestamp(b.lastActivityAt) - asTimestamp(a.lastActivityAt);
  if (byActivity !== 0) {
    return byActivity;
  }

  if (a.isDraft !== b.isDraft) {
    return a.isDraft ? -1 : 1;
  }

  return a.runId.localeCompare(b.runId);
};

const sourcePriority = (source: RunTreeRowSource): number => {
  if (source === 'history') return 3;
  if (source === 'local') return 2;
  return 1;
};

const dedupeAndSortRuns = (rows: RunTreeRow[]): RunTreeRow[] => {
  const byRunId = new Map<string, RunTreeRow>();

  for (const row of rows) {
    const existing = byRunId.get(row.runId);
    if (!existing) {
      byRunId.set(row.runId, row);
      continue;
    }

    if (sourcePriority(row.source) > sourcePriority(existing.source)) {
      byRunId.set(row.runId, row);
      continue;
    }

    if (existing.source === row.source && compareRuns(row, existing) < 0) {
      byRunId.set(row.runId, row);
    }
  }

  return Array.from(byRunId.values()).sort(compareRuns);
};

const ensureWorkspaceNode = (
  workspaceNodes: Map<string, MutableWorkspaceNode>,
  workspaceId: string,
  workspaceRootPath: string,
  workspaceName: string,
  workspaceKind: ProjectionWorkspaceKind,
  canRemoveFromWorkspaces: boolean,
): MutableWorkspaceNode => {
  const existing = workspaceNodes.get(workspaceRootPath);
  if (existing) {
    if (!existing.workspaceName && workspaceName) {
      existing.workspaceName = workspaceName;
    }
    if (existing.canRemoveFromWorkspaces && !canRemoveFromWorkspaces) {
      existing.workspaceId = workspaceId;
      existing.workspaceKind = workspaceKind;
      existing.canRemoveFromWorkspaces = canRemoveFromWorkspaces;
    }
    return existing;
  }

  const created: MutableWorkspaceNode = {
    workspaceId,
    workspaceRootPath,
    workspaceName: workspaceName || FALLBACK_WORKSPACE_NAME,
    workspaceKind,
    canRemoveFromWorkspaces,
    agentsById: new Map<string, MutableAgentNode>(),
  };
  workspaceNodes.set(workspaceRootPath, created);
  return created;
};

const ensureAgentNode = (
  workspaceNode: MutableWorkspaceNode,
  agentDefinitionId: string,
  agentName: string,
  agentAvatarUrl?: string | null,
): MutableAgentNode => {
  const existing = workspaceNode.agentsById.get(agentDefinitionId);
  if (existing) {
    if (!existing.agentName && agentName) {
      existing.agentName = agentName;
    }
    if (!existing.agentAvatarUrl && agentAvatarUrl) {
      existing.agentAvatarUrl = agentAvatarUrl;
    }
    return existing;
  }

  const created: MutableAgentNode = {
    agentDefinitionId,
    agentName: agentName || FALLBACK_AGENT_NAME,
    agentAvatarUrl: agentAvatarUrl ?? null,
    runs: [],
  };
  workspaceNode.agentsById.set(agentDefinitionId, created);
  return created;
};

export const buildRunTreeProjection = (input: BuildRunTreeProjectionInput): RunTreeWorkspaceNode[] => {
  const workspaceNodes = new Map<string, MutableWorkspaceNode>();

  for (const workspace of input.workspaceDescriptors) {
    const normalizedRoot = normalizeRootPath(workspace.workspaceRootPath);
    if (!normalizedRoot) {
      continue;
    }
    ensureWorkspaceNode(
      workspaceNodes,
      workspace.workspaceId,
      normalizedRoot,
      workspace.workspaceName || FALLBACK_WORKSPACE_NAME,
      workspace.workspaceKind,
      workspace.canRemoveFromWorkspaces,
    );
  }

  for (const workspace of input.persistedWorkspaces) {
    const normalizedWorkspace = normalizeRootPath(workspace.workspaceRootPath);
    if (!normalizedWorkspace) {
      continue;
    }

    const workspaceNode = workspaceNodes.get(normalizedWorkspace);
    if (!workspaceNode) {
      continue;
    }

    for (const agent of workspace.agents) {
      const agentNode = ensureAgentNode(
        workspaceNode,
        agent.agentDefinitionId,
        agent.agentName || FALLBACK_AGENT_NAME,
        agent.agentAvatarUrl ?? null,
      );

      for (const run of agent.runs) {
        agentNode.runs.push({
          runId: run.runId,
          summary: run.summary,
          lastActivityAt: run.lastActivityAt,
          currentStatus: run.currentStatus,
          lastKnownStatus: run.lastKnownStatus,
          isActive: run.isActive,
          source: 'history',
          isDraft: false,
        });
      }
    }
  }

  for (const localRun of input.localRuns) {
    const normalizedWorkspace = normalizeRootPath(localRun.workspaceRootPath);
    if (!normalizedWorkspace) {
      console.warn(INVALID_DRAFT_WORKSPACE_WARNING, { runId: localRun.runId });
      continue;
    }

    const workspaceNode = workspaceNodes.get(normalizedWorkspace);
    if (!workspaceNode) {
      console.warn(INVALID_DRAFT_WORKSPACE_WARNING, { runId: localRun.runId });
      continue;
    }

    const agentNode = ensureAgentNode(
      workspaceNode,
      localRun.agentDefinitionId,
      localRun.agentName || FALLBACK_AGENT_NAME,
      localRun.agentAvatarUrl ?? null,
    );

    agentNode.runs.push({
      runId: localRun.runId,
      summary: localRun.summary,
      lastActivityAt: localRun.lastActivityAt,
      currentStatus: localRun.currentStatus,
      lastKnownStatus: localRun.lastKnownStatus,
      isActive: localRun.isActive,
      source: localRun.source,
      isDraft: localRun.source === 'draft',
    });
  }

  const workspaceList = Array.from(workspaceNodes.values()).map((workspaceNode) => {
    const agents = Array.from(workspaceNode.agentsById.values())
      .map((agentNode) => ({
        agentDefinitionId: agentNode.agentDefinitionId,
        agentName: agentNode.agentName || FALLBACK_AGENT_NAME,
        agentAvatarUrl: agentNode.agentAvatarUrl ?? null,
        runs: dedupeAndSortRuns(agentNode.runs),
      }))
      .sort((a, b) => {
        const byName = a.agentName.localeCompare(b.agentName);
        if (byName !== 0) {
          return byName;
        }
        return a.agentDefinitionId.localeCompare(b.agentDefinitionId);
      });

    return {
      workspaceId: workspaceNode.workspaceId,
      workspaceRootPath: workspaceNode.workspaceRootPath,
      workspaceName: workspaceNode.workspaceName || FALLBACK_WORKSPACE_NAME,
      workspaceKind: workspaceNode.workspaceKind,
      canRemoveFromWorkspaces: workspaceNode.canRemoveFromWorkspaces,
      agents,
    };
  });

  return workspaceList.sort((a, b) => {
    const byName = a.workspaceName.localeCompare(b.workspaceName);
    if (byName !== 0) {
      return byName;
    }
    return a.workspaceRootPath.localeCompare(b.workspaceRootPath);
  });
};
