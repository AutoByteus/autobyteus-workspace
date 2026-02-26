import { AgentInputEventQueueManager } from '../events/agent-input-event-queue-manager.js';
import { AgentEventStore } from '../events/event-store.js';
import { AgentStatus } from '../status/status-enum.js';
import { BaseAgentWorkspace } from '../workspace/base-workspace.js';
import { ToolInvocation } from '../tool-invocation.js';
import { ToolInvocationTurn } from '../tool-invocation-turn.js';
import { RecentSettledInvocationCache } from './recent-settled-invocation-cache.js';
import { ToDoList } from '../../task-management/todo-list.js';
import { BaseLLM } from '../../llm/base.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { MemoryManager } from '../../memory/memory-manager.js';
import type { WorkingContextSnapshotBootstrapOptions } from '../../memory/restore/working-context-snapshot-bootstrapper.js';

import type { AgentStatusDeriver } from '../status/status-deriver.js';
import type { AgentStatusManager } from '../status/manager.js';

type ToolInstances = Record<string, BaseTool>;

export class AgentRuntimeState {
  agentId: string;
  currentStatus: AgentStatus;
  llmInstance: BaseLLM | null = null;
  toolInstances: ToolInstances | null = null;
  inputEventQueues: AgentInputEventQueueManager | null = null;
  eventStore: AgentEventStore | null = null;
  statusDeriver: AgentStatusDeriver | null = null;
  workspace: BaseAgentWorkspace | null;
  pendingToolApprovals: Record<string, ToolInvocation>;
  customData: Record<string, any>;
  activeToolInvocationTurn: ToolInvocationTurn | null = null;
  recentSettledInvocationIds: RecentSettledInvocationCache;
  todoList: ToDoList | null = null;
  memoryManager: MemoryManager | null = null;
  // Conversation/memory turn id shared across all traces for one user-originated turn.
  activeTurnId: string | null = null;
  restoreOptions: WorkingContextSnapshotBootstrapOptions | null = null;
  processedSystemPrompt: string | null = null;
  statusManagerRef: AgentStatusManager | null = null;

  constructor(
    agentId: string,
    workspace: BaseAgentWorkspace | null = null,
    customData: Record<string, any> | null = null
  ) {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error("AgentRuntimeState requires a non-empty string 'agentId'.");
    }
    if (workspace !== null && !(workspace instanceof BaseAgentWorkspace)) {
      throw new TypeError(
        `AgentRuntimeState 'workspace' must be a BaseAgentWorkspace or null. Got ${typeof workspace}`
      );
    }

    this.agentId = agentId;
    this.currentStatus = AgentStatus.UNINITIALIZED;
    this.workspace = workspace;
    this.pendingToolApprovals = {};
    this.customData = customData ?? {};
    this.recentSettledInvocationIds = new RecentSettledInvocationCache();

    console.info(
      `AgentRuntimeState initialized for agent_id '${this.agentId}'. Initial status: ${this.currentStatus}. Workspace linked. InputQueues pending initialization. Output data via notifier.`
    );
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
    const inputQueuesStatus = this.inputEventQueues ? 'Initialized' : 'Not Initialized';
    const activeTurnStatus = this.activeToolInvocationTurn ? 'Active' : 'Inactive';

    return (
      `AgentRuntimeState(agentId='${this.agentId}', currentStatus='${this.currentStatus}', ` +
      `llmStatus='${llmStatus}', toolsStatus='${toolsStatus}', ` +
      `inputQueuesStatus='${inputQueuesStatus}', ` +
      `pendingApprovals=${Object.keys(this.pendingToolApprovals).length}, ` +
      `toolInvocationTurn='${activeTurnStatus}')`
    );
  }
}
