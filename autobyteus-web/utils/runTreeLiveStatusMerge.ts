import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { RunTreeWorkspaceNode, RunTreeRow } from '~/utils/runTreeProjection';

type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR';

interface LiveStatusOverlay {
  isActive: boolean;
  lastKnownStatus: RunKnownStatus;
}

const toRunStatusOverlay = (status: AgentStatus): LiveStatusOverlay => {
  if (status === AgentStatus.Error) {
    return { isActive: false, lastKnownStatus: 'ERROR' };
  }

  if (
    status === AgentStatus.Uninitialized ||
    status === AgentStatus.ShutdownComplete ||
    status === AgentStatus.ToolDenied
  ) {
    return { isActive: false, lastKnownStatus: 'IDLE' };
  }

  return { isActive: true, lastKnownStatus: 'ACTIVE' };
};

const mergeHistoryRowWithContext = (
  row: RunTreeRow,
  context: AgentContext,
): RunTreeRow => {
  const overlay = toRunStatusOverlay(context.state.currentStatus);
  const lastActivityAt = context.state.conversation.updatedAt || row.lastActivityAt;

  return {
    ...row,
    ...overlay,
    lastActivityAt,
  };
};

export const mergeRunTreeWithLiveContexts = (
  nodes: RunTreeWorkspaceNode[],
  contexts: Map<string, AgentContext>,
): RunTreeWorkspaceNode[] => {
  if (contexts.size === 0) {
    return nodes;
  }

  return nodes.map((workspaceNode) => ({
    ...workspaceNode,
    agents: workspaceNode.agents.map((agentNode) => ({
      ...agentNode,
      runs: agentNode.runs.map((row) => {
        if (row.source !== 'history') {
          return row;
        }

        const context = contexts.get(row.agentId);
        if (!context) {
          return row;
        }

        return mergeHistoryRowWithContext(row, context);
      }),
    })),
  }));
};
