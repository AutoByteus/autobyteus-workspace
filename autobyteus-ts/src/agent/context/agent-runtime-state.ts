import { AgentEventStore } from '../events/event-store.js';
import { ToolExecutionApprovalEvent, ToolResultEvent } from '../events/agent-events.js';
import { AgentStatus } from '../status/status-enum.js';
import { ToolInvocation } from '../tool-invocation.js';
import { AgentTurn } from '../agent-turn.js';
import type { AgentEventInbox } from '../event-inbox/agent-event-inbox.js';
import { ToDoList } from '../../task-management/todo-list.js';
import { BaseLLM } from '../../llm/base.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { MemoryManager } from '../../memory/memory-manager.js';
import type { WorkingContextSnapshotBootstrapOptions } from '../../memory/restore/working-context-snapshot-bootstrapper.js';
import {
  normalizeToolApprovalInvocationId,
  normalizeToolApprovalTurnId,
  type PostToolApprovalResult
} from '../tool-approval-result.js';

import type { AgentStatusDeriver } from '../status/status-deriver.js';
import type { AgentStatusManager } from '../status/manager.js';
import {
  normalizeToolResultInvocationId,
  normalizeToolResultTurnId,
  type PostToolResultResult
} from '../tool-result-posting.js';

type ToolInstances = Record<string, BaseTool>;

export class AgentRuntimeState {
  agentId: string;
  currentStatus: AgentStatus;
  llmInstance: BaseLLM | null = null;
  toolInstances: ToolInstances | null = null;
  agentEventInbox: AgentEventInbox | null = null;
  eventStore: AgentEventStore | null = null;
  statusDeriver: AgentStatusDeriver | null = null;
  workspaceRootPath: string | null;
  customData: Record<string, any>;
  activeTurn: AgentTurn | null = null;
  todoList: ToDoList | null = null;
  memoryManager: MemoryManager | null = null;
  restoreOptions: WorkingContextSnapshotBootstrapOptions | null = null;
  processedSystemPrompt: string | null = null;
  statusManagerRef: AgentStatusManager | null = null;

  constructor(
    agentId: string,
    workspaceRootPath: string | null = null,
    customData: Record<string, any> | null = null
  ) {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error("AgentRuntimeState requires a non-empty string 'agentId'.");
    }
    if (
      workspaceRootPath !== null &&
      (typeof workspaceRootPath !== 'string' || workspaceRootPath.trim().length === 0)
    ) {
      throw new TypeError(
        `AgentRuntimeState 'workspaceRootPath' must be a non-empty string or null. Got ${typeof workspaceRootPath}`
      );
    }

    this.agentId = agentId;
    this.currentStatus = AgentStatus.UNINITIALIZED;
    this.workspaceRootPath = workspaceRootPath;
    this.customData = customData ?? {};

    console.info(
      `AgentRuntimeState initialized for agent_id '${this.agentId}'. Initial status: ${this.currentStatus}. Workspace linked. AgentEventInbox pending initialization. Output data via notifier.`
    );
  }

  startActiveTurn(turnId?: string | null): AgentTurn {
    if (this.activeTurn && !this.activeTurn.isSettled) {
      throw new Error(`Agent '${this.agentId}' already has active turn '${this.activeTurn.turnId}'.`);
    }

    const memoryManager = this.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${this.agentId}': Cannot start a turn without a memory manager.`);
    }

    const nextTurnId =
      typeof turnId === 'string' && turnId.trim().length > 0 ? turnId.trim() : memoryManager.startTurn();
    const nextTurn = new AgentTurn(nextTurnId);
    nextTurn.setWorkingContextCheckpoint(memoryManager.createWorkingContextTurnCheckpoint(nextTurnId));
    this.activeTurn = nextTurn;
    return nextTurn;
  }

  clearActiveTurnIfStillActive(turnId?: string | null): string | null {
    const resolvedTurnId =
      typeof turnId === 'string' && turnId.trim().length > 0
        ? turnId.trim()
        : this.activeTurn?.turnId ?? null;
    if (!resolvedTurnId) {
      return null;
    }

    if (this.activeTurn?.turnId === resolvedTurnId) {
      this.activeTurn = null;
    }
    return resolvedTurnId;
  }

  restoreWorkingContextForInterruptedTurn(turnId: string): boolean {
    const activeTurn = this.activeTurn;
    const memoryManager = this.memoryManager;
    if (!activeTurn || activeTurn.turnId !== turnId || !memoryManager) {
      return false;
    }

    return activeTurn.restoreWorkingContextCheckpoint(memoryManager);
  }

  interruptActiveTurn(reason: string): import('../interruption/agent-interruption.js').AgentInterruptResult {
    if (!this.activeTurn) {
      return {
        accepted: false,
        status: 'no_active_turn',
        turnId: null,
        reason,
        message: `Agent '${this.agentId}' has no active turn to interrupt.`
      };
    }
    const result = this.activeTurn.interrupt(reason);
    this.clearPendingToolApprovalsForTurn(this.activeTurn.turnId);
    return result;
  }

  clearPendingToolApprovalsForTurn(turnId: string): void {
    if (this.activeTurn?.turnId === turnId) {
      this.activeTurn.clearPendingToolApprovals();
    }
  }

  routeToolApprovalToActiveTurn(event: ToolExecutionApprovalEvent): PostToolApprovalResult {
    const invocationId = normalizeToolApprovalInvocationId(event.toolInvocationId) ?? String(event.toolInvocationId ?? '');
    const activeTurn = this.activeTurn;
    if (!activeTurn) {
      return {
        accepted: false,
        code: 'no_active_turn',
        invocationId,
        message: `Agent '${this.agentId}' has no active turn for tool approval '${invocationId}'.`
      };
    }

    const turnId = normalizeToolApprovalTurnId(event.turnId);
    if (turnId && turnId !== activeTurn.turnId) {
      return {
        accepted: false,
        code: 'stale_turn',
        invocationId,
        turnId,
        activeTurnId: activeTurn.turnId,
        message: `Tool approval '${invocationId}' belongs to stale turn '${turnId}', active turn is '${activeTurn.turnId}'.`
      };
    }

    return activeTurn.postToolApproval(event);
  }

  routeToolResultToActiveTurn(event: ToolResultEvent): PostToolResultResult {
    const invocationId = normalizeToolResultInvocationId(event.toolInvocationId) ?? String(event.toolInvocationId ?? '');
    const activeTurn = this.activeTurn;
    if (!activeTurn) {
      return {
        accepted: false,
        code: 'no_active_turn',
        invocationId,
        message: `Agent '${this.agentId}' has no active turn for tool result '${invocationId}'.`
      };
    }

    const turnId = normalizeToolResultTurnId(event.turnId);
    if (turnId && turnId !== activeTurn.turnId) {
      return {
        accepted: false,
        code: 'stale_turn',
        invocationId,
        turnId,
        activeTurnId: activeTurn.turnId,
        message: `Tool result '${invocationId}' belongs to stale turn '${turnId}', active turn is '${activeTurn.turnId}'.`
      };
    }

    return activeTurn.postToolResult(event);
  }

  shouldEnterIdleAfterLlmResponse(currentStatus: AgentStatus): boolean {
    return (
      currentStatus === AgentStatus.ANALYZING_LLM_RESPONSE &&
      Object.keys(this.pendingToolApprovals).length === 0
    );
  }

  get pendingToolApprovals(): Record<string, ToolInvocation> {
    return this.activeTurn?.pendingToolApprovalsSnapshot ?? {};
  }

  resolveTurnIdForIdleEvent(fallbackTurnId?: string | null): string | null {
    if (this.activeTurn?.turnId) {
      return this.activeTurn.turnId;
    }
    if (typeof fallbackTurnId === 'string' && fallbackTurnId.trim().length > 0) {
      return fallbackTurnId.trim();
    }
    return null;
  }

  storePendingToolInvocation(invocation: ToolInvocation): void {
    if (!(invocation instanceof ToolInvocation) || !invocation.id) {
      console.error(
        `Agent '${this.agentId}': Attempted to store invalid ToolInvocation for approval: ${invocation}`
      );
      return;
    }
    const activeTurn = this.activeTurn;
    if (activeTurn && activeTurn.turnId === invocation.turnId) {
      activeTurn.storePendingToolInvocation(invocation);
    } else {
      console.error(
        `Agent '${this.agentId}': Cannot store pending tool invocation '${invocation.id}' without matching active turn '${invocation.turnId ?? 'unknown'}'.`
      );
      return;
    }
    console.info(
      `Agent '${this.agentId}': Stored pending tool invocation '${invocation.id}' (${invocation.name}).`
    );
  }

  retrievePendingToolInvocation(invocationId: string): ToolInvocation | undefined {
    const invocation = this.activeTurn?.retrievePendingToolInvocation(invocationId);
    if (invocation) {
      console.info(
        `Agent '${this.agentId}': Retrieved pending tool invocation '${invocationId}' (${invocation.name}).`
      );
      return invocation;
    }
    console.warn(`Agent '${this.agentId}': Pending tool invocation '${invocationId}' not found.`);
    return undefined;
  }

  toString(): string {
    const llmStatus = this.llmInstance ? 'Initialized' : 'Not Initialized';
    const toolsStatus = this.toolInstances ? `${Object.keys(this.toolInstances).length} Initialized` : 'Not Initialized';
    const inputBoxStatus = this.agentEventInbox ? 'Initialized' : 'Not Initialized';
    const activeTurnStatus = this.activeTurn ? 'Active' : 'Inactive';

    return (
      `AgentRuntimeState(agentId='${this.agentId}', currentStatus='${this.currentStatus}', ` +
      `llmStatus='${llmStatus}', toolsStatus='${toolsStatus}', ` +
      `agentEventInboxStatus='${inputBoxStatus}', ` +
      `pendingApprovals=${Object.keys(this.pendingToolApprovals).length}, ` +
      `agentTurn='${activeTurnStatus}')`
    );
  }
}
