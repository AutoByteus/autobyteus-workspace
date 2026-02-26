import { AgentConfig } from './agent-config.js';
import { AgentRuntimeState } from './agent-runtime-state.js';
import { AgentStatus } from '../status/status-enum.js';
import { AgentInputEventQueueManager } from '../events/agent-input-event-queue-manager.js';
import { ToolInvocation } from '../tool-invocation.js';
import type { BaseLLM } from '../../llm/base.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { AgentEventStore } from '../events/event-store.js';
import type { BaseAgentWorkspace } from '../workspace/base-workspace.js';

import type { AgentStatusDeriver } from '../status/status-deriver.js';
import type { AgentStatusManager } from '../status/manager.js';
import type { MemoryManager } from '../../memory/memory-manager.js';

export class AgentContext {
  agentId: string;
  config: AgentConfig;
  state: AgentRuntimeState;

  constructor(agentId: string, config: AgentConfig, state: AgentRuntimeState) {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error("AgentContext requires a non-empty string 'agentId'.");
    }
    if (!(config instanceof AgentConfig)) {
      throw new TypeError(`AgentContext 'config' must be an AgentConfig instance. Got ${typeof config}`);
    }
    if (!(state instanceof AgentRuntimeState)) {
      throw new TypeError(`AgentContext 'state' must be an AgentRuntimeState instance. Got ${typeof state}`);
    }

    if (agentId !== state.agentId) {
      console.warn(
        `AgentContext created with mismatched agentId ('${agentId}') and state's ID ('${state.agentId}'). Using context's ID for logging.`
      );
    }

    this.agentId = agentId;
    this.config = config;
    this.state = state;

    console.info(`AgentContext composed for agent_id '${this.agentId}'. Config and State linked.`);
  }

  get toolInstances(): Record<string, BaseTool> {
    return this.state.toolInstances ?? {};
  }

  get autoExecuteTools(): boolean {
    return this.config.autoExecuteTools;
  }

  get llmInstance(): BaseLLM | null {
    return this.state.llmInstance;
  }

  set llmInstance(value: BaseLLM | null) {
    this.state.llmInstance = value;
  }

  get inputEventQueues(): AgentInputEventQueueManager {
    if (!this.state.inputEventQueues) {
      console.error(
        `AgentContext for '${this.agentId}': Attempted to access 'inputEventQueues' before they were initialized by AgentWorker.`
      );
      throw new Error(
        `Agent '${this.agentId}': Input event queues have not been initialized. This typically occurs during agent bootstrapping.`
      );
    }
    return this.state.inputEventQueues;
  }

  get currentStatus(): AgentStatus {
    return this.state.currentStatus;
  }

  set currentStatus(value: AgentStatus) {
    if (!Object.values(AgentStatus).includes(value)) {
      throw new TypeError(`currentStatus must be an AgentStatus instance. Got ${typeof value}`);
    }
    this.state.currentStatus = value;
  }

  get statusManager(): AgentStatusManager | null {
    return this.state.statusManagerRef;
  }

  get eventStore(): AgentEventStore | null {
    return this.state.eventStore;
  }

  get statusDeriver(): AgentStatusDeriver | null {
    return this.state.statusDeriver;
  }

  get pendingToolApprovals(): Record<string, ToolInvocation> {
    return this.state.pendingToolApprovals;
  }

  get customData(): Record<string, any> {
    return this.state.customData;
  }

  get workspace(): BaseAgentWorkspace | null {
    return this.state.workspace;
  }

  get processedSystemPrompt(): string | null {
    return this.state.processedSystemPrompt;
  }

  set processedSystemPrompt(value: string | null) {
    this.state.processedSystemPrompt = value;
  }

  get memoryManager(): MemoryManager | null {
    return this.state.memoryManager;
  }

  getTool(toolName: string): BaseTool | undefined {
    const tool = this.toolInstances[toolName];
    if (!tool) {
      console.warn(
        `Tool '${toolName}' not found in AgentContext.state.toolInstances for agent '${this.agentId}'. Available tools: ${Object.keys(this.toolInstances)}`
      );
    }
    return tool;
  }

  storePendingToolInvocation(invocation: ToolInvocation): void {
    this.state.storePendingToolInvocation(invocation);
  }

  retrievePendingToolInvocation(invocationId: string): ToolInvocation | undefined {
    return this.state.retrievePendingToolInvocation(invocationId);
  }

  toString(): string {
    const inputQueueStatus = this.state.inputEventQueues ? 'Initialized' : 'Pending Init';
    return (
      `AgentContext(agentId='${this.agentId}', ` +
      `currentStatus='${this.state.currentStatus}', ` +
      `llmInitialized=${this.state.llmInstance !== null}, ` +
      `toolsInitialized=${this.state.toolInstances !== null}, ` +
      `inputQueuesStatus='${inputQueueStatus}')`
    );
  }
}
