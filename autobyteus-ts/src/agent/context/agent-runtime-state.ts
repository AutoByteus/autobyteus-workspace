import { AgentEventStore } from '../events/event-store.js';
import { AgentStatus } from '../status/status-enum.js';
import { ToolInvocation } from '../tool-invocation.js';
import { AgentTurn } from '../agent-turn.js';
import type { AgentInputBox } from '../input-box/agent-input-box.js';
import { RecentSettledInvocationCache } from './recent-settled-invocation-cache.js';
import { ToDoList } from '../../task-management/todo-list.js';
import { BaseLLM } from '../../llm/base.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { MemoryManager, WorkingContextTurnCheckpoint } from '../../memory/memory-manager.js';
import type { WorkingContextSnapshotBootstrapOptions } from '../../memory/restore/working-context-snapshot-bootstrapper.js';
import {
  normalizeToolApprovalInvocationId,
  normalizeToolApprovalTurnId,
  type ToolApprovalInputMessage,
  type PostToolApprovalResult
} from '../tool-approval-command.js';

import type { AgentStatusDeriver } from '../status/status-deriver.js';
import type { AgentStatusManager } from '../status/manager.js';

type ToolInstances = Record<string, BaseTool>;

export class AgentRuntimeState {
  agentId: string;
  currentStatus: AgentStatus;
  llmInstance: BaseLLM | null = null;
  toolInstances: ToolInstances | null = null;
  agentInputBox: AgentInputBox | null = null;
  eventStore: AgentEventStore | null = null;
  statusDeriver: AgentStatusDeriver | null = null;
  workspaceRootPath: string | null;
  pendingToolApprovals: Record<string, ToolInvocation>;
  customData: Record<string, any>;
  activeTurn: AgentTurn | null = null;
  recentSettledInvocationIds: RecentSettledInvocationCache;
  todoList: ToDoList | null = null;
  memoryManager: MemoryManager | null = null;
  restoreOptions: WorkingContextSnapshotBootstrapOptions | null = null;
  processedSystemPrompt: string | null = null;
  statusManagerRef: AgentStatusManager | null = null;
  private activeWorkingContextCheckpoint: WorkingContextTurnCheckpoint | null = null;

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
    this.pendingToolApprovals = {};
    this.customData = customData ?? {};
    this.recentSettledInvocationIds = new RecentSettledInvocationCache();

    console.info(
      `AgentRuntimeState initialized for agent_id '${this.agentId}'. Initial status: ${this.currentStatus}. Workspace linked. AgentInputBox pending initialization. Output data via notifier.`
    );
  }

  startActiveTurn(turnId?: string | null): AgentTurn {
    const memoryManager = this.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${this.agentId}': Cannot start a turn without a memory manager.`);
    }

    const nextTurnId =
      typeof turnId === 'string' && turnId.trim().length > 0 ? turnId.trim() : memoryManager.startTurn();
    const nextTurn = new AgentTurn(nextTurnId);
    this.activeWorkingContextCheckpoint = memoryManager.createWorkingContextTurnCheckpoint(nextTurnId);
    this.activeTurn = nextTurn;
    return nextTurn;
  }

  completeActiveTurn(turnId?: string | null): string | null {
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
    if (this.activeWorkingContextCheckpoint?.turnId === resolvedTurnId) {
      this.activeWorkingContextCheckpoint = null;
    }
    return resolvedTurnId;
  }

  restoreWorkingContextForInterruptedTurn(turnId: string): boolean {
    const checkpoint = this.activeWorkingContextCheckpoint;
    const memoryManager = this.memoryManager;
    if (!checkpoint || checkpoint.turnId !== turnId || !memoryManager) {
      return false;
    }

    memoryManager.restoreWorkingContextTurnCheckpoint(checkpoint);
    this.activeWorkingContextCheckpoint = null;
    return true;
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
    const activeBatch = this.activeTurn.activeToolInvocationBatch;
    if (activeBatch) {
      this.recentSettledInvocationIds.addMany(activeBatch.getExpectedInvocationIds());
    }
    return result;
  }

  clearPendingToolApprovalsForTurn(turnId: string): void {
    for (const [invocationId, invocation] of Object.entries(this.pendingToolApprovals)) {
      if (!invocation.turnId || invocation.turnId === turnId) {
        delete this.pendingToolApprovals[invocationId];
      }
    }
  }

  postToolApprovalToActiveTurn(input: ToolApprovalInputMessage): PostToolApprovalResult {
    const invocationId = normalizeToolApprovalInvocationId(input.invocationId) ?? String(input.invocationId ?? '');
    const activeTurn = this.activeTurn;
    if (!activeTurn) {
      return {
        accepted: false,
        code: 'no_active_turn',
        invocationId,
        message: `Agent '${this.agentId}' has no active turn for tool approval '${invocationId}'.`
      };
    }

    const turnId = normalizeToolApprovalTurnId(input.turnId);
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

    if (activeTurn.isSettled) {
      return {
        accepted: false,
        code: 'stale_turn',
        invocationId,
        turnId: activeTurn.turnId,
        activeTurnId: activeTurn.turnId,
        message: `Tool approval '${invocationId}' targets already-settled turn '${activeTurn.turnId}'.`
      };
    }

    if (activeTurn.executionScope.isInterrupted) {
      return {
        accepted: false,
        code: 'interrupted_turn',
        invocationId,
        turnId: activeTurn.turnId,
        message: `Tool approval '${invocationId}' targets interrupted turn '${activeTurn.turnId}'.`
      };
    }

    const pendingInvocation = this.pendingToolApprovals[invocationId];
    if (!pendingInvocation || (pendingInvocation.turnId && pendingInvocation.turnId !== activeTurn.turnId)) {
      return {
        accepted: false,
        code: 'no_pending_invocation',
        invocationId,
        turnId: activeTurn.turnId,
        message: `Tool approval invocation '${invocationId}' is not pending for active turn '${activeTurn.turnId}'.`
      };
    }

    const postResult = activeTurn.inputBox.postApproval({
      kind: 'tool_approval',
      invocationId,
      turnId: activeTurn.turnId,
      approved: input.approved,
      reason: input.reason ?? null,
      ...(input.requestedBy ? { requestedBy: input.requestedBy } : {})
    });
    if (!postResult.accepted) {
      const code = postResult.code === 'closed' ? 'interrupted_turn' : 'no_pending_invocation';
      return code === 'interrupted_turn'
        ? {
            accepted: false,
            code,
            invocationId,
            turnId: activeTurn.turnId,
            message: postResult.message ?? `Tool approval '${invocationId}' could not be posted to interrupted turn.`
          }
        : {
            accepted: false,
            code,
            invocationId,
            turnId: activeTurn.turnId,
            message: postResult.message ?? `Tool approval '${invocationId}' is not pending.`
          };
    }

    return {
      accepted: true,
      code: 'posted',
      turnId: activeTurn.turnId,
      invocationId
    };
  }


  shouldEnterIdleAfterLlmResponse(currentStatus: AgentStatus): boolean {
    return (
      currentStatus === AgentStatus.ANALYZING_LLM_RESPONSE &&
      Object.keys(this.pendingToolApprovals).length === 0
    );
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
    this.pendingToolApprovals[invocation.id] = invocation;
    console.info(
      `Agent '${this.agentId}': Stored pending tool invocation '${invocation.id}' (${invocation.name}).`
    );
  }

  retrievePendingToolInvocation(invocationId: string): ToolInvocation | undefined {
    const invocation = this.pendingToolApprovals[invocationId];
    if (invocation) {
      delete this.pendingToolApprovals[invocationId];
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
    const inputBoxStatus = this.agentInputBox ? 'Initialized' : 'Not Initialized';
    const activeTurnStatus = this.activeTurn ? 'Active' : 'Inactive';

    return (
      `AgentRuntimeState(agentId='${this.agentId}', currentStatus='${this.currentStatus}', ` +
      `llmStatus='${llmStatus}', toolsStatus='${toolsStatus}', ` +
      `agentInputBoxStatus='${inputBoxStatus}', ` +
      `pendingApprovals=${Object.keys(this.pendingToolApprovals).length}, ` +
      `agentTurn='${activeTurnStatus}')`
    );
  }
}
