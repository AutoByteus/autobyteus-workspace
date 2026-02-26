import {
  FALLBACK_AGENT_NAME,
  FALLBACK_WORKSPACE_NAME,
  INVALID_DRAFT_WORKSPACE_WARNING,
} from '~/utils/runTreeProjectionConstants';

export type ProjectionRunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';
export type RunTreeRowSource = 'history' | 'draft';

export interface ProjectionRunItem {
  agentId: string;
  summary: string;
  lastActivityAt: string;
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
  workspaceRootPath: string;
  workspaceName: string;
}

export interface DraftRunSnapshot {
  agentId: string;
  workspaceRootPath: string;
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: ProjectionRunKnownStatus;
  isActive: boolean;
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
  workspaceRootPath: string;
  workspaceName: string;
  agents: RunTreeAgentNode[];
}

interface BuildRunTreeProjectionInput {
  persistedWorkspaces: ProjectionWorkspaceGroup[];
  workspaceDescriptors: ProjectionWorkspaceDescriptor[];
  draftRuns: DraftRunSnapshot[];
}

interface MutableAgentNode {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl: string | null;
  runs: RunTreeRow[];
}

interface MutableWorkspaceNode {
  workspaceRootPath: string;
  workspaceName: string;
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

  return a.agentId.localeCompare(b.agentId);
};

const dedupeAndSortRuns = (rows: RunTreeRow[]): RunTreeRow[] => {
  const byAgentId = new Map<string, RunTreeRow>();

  for (const row of rows) {
    const existing = byAgentId.get(row.agentId);
    if (!existing) {
      byAgentId.set(row.agentId, row);
      continue;
    }

    if (existing.source === 'draft' && row.source === 'history') {
      byAgentId.set(row.agentId, row);
      continue;
    }

    if (existing.source === row.source && compareRuns(row, existing) < 0) {
      byAgentId.set(row.agentId, row);
    }
  }

  return Array.from(byAgentId.values()).sort(compareRuns);
};

const ensureWorkspaceNode = (
  workspaceNodes: Map<string, MutableWorkspaceNode>,
  workspaceRootPath: string,
  workspaceName: string,
): MutableWorkspaceNode => {
  const existing = workspaceNodes.get(workspaceRootPath);
  if (existing) {
    if (!existing.workspaceName && workspaceName) {
      existing.workspaceName = workspaceName;
    }
    return existing;
  }

  const created: MutableWorkspaceNode = {
    workspaceRootPath,
    workspaceName: workspaceName || FALLBACK_WORKSPACE_NAME,
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
      normalizedRoot,
      workspace.workspaceName || FALLBACK_WORKSPACE_NAME,
    );
  }

  for (const workspace of input.persistedWorkspaces) {
    const normalizedWorkspace = normalizeRootPath(workspace.workspaceRootPath);
    if (!normalizedWorkspace) {
      continue;
    }

    const workspaceNode = ensureWorkspaceNode(
      workspaceNodes,
      normalizedWorkspace,
      workspace.workspaceName || FALLBACK_WORKSPACE_NAME,
    );

    for (const agent of workspace.agents) {
      const agentNode = ensureAgentNode(
        workspaceNode,
        agent.agentDefinitionId,
        agent.agentName || FALLBACK_AGENT_NAME,
        agent.agentAvatarUrl ?? null,
      );

      for (const run of agent.runs) {
        agentNode.runs.push({
          agentId: run.agentId,
          summary: run.summary,
          lastActivityAt: run.lastActivityAt,
          lastKnownStatus: run.lastKnownStatus,
          isActive: run.isActive,
          source: 'history',
          isDraft: false,
        });
      }
    }
  }

  for (const draft of input.draftRuns) {
    const normalizedWorkspace = normalizeRootPath(draft.workspaceRootPath);
    if (!normalizedWorkspace) {
      console.warn(INVALID_DRAFT_WORKSPACE_WARNING, { agentId: draft.agentId });
      continue;
    }

    const workspaceNode = ensureWorkspaceNode(
      workspaceNodes,
      normalizedWorkspace,
      FALLBACK_WORKSPACE_NAME,
    );

    const agentNode = ensureAgentNode(
      workspaceNode,
      draft.agentDefinitionId,
      draft.agentName || FALLBACK_AGENT_NAME,
      draft.agentAvatarUrl ?? null,
    );

    agentNode.runs.push({
      agentId: draft.agentId,
      summary: draft.summary,
      lastActivityAt: draft.lastActivityAt,
      lastKnownStatus: draft.lastKnownStatus,
      isActive: draft.isActive,
      source: 'draft',
      isDraft: true,
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
      workspaceRootPath: workspaceNode.workspaceRootPath,
      workspaceName: workspaceNode.workspaceName || FALLBACK_WORKSPACE_NAME,
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
