import fs from 'fs';
import path from 'path';
import { Singleton } from '../../utils/singleton.js';
import { Agent } from '../agent.js';
import { AgentConfig } from '../context/agent-config.js';
import { AgentRuntimeState } from '../context/agent-runtime-state.js';
import { AgentContext } from '../context/agent-context.js';
import {
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent,
  ToolResultEvent,
  GenericEvent,
  ToolExecutionApprovalEvent,
  LLMUserMessageReadyEvent,
  ExecuteToolInvocationEvent,
  BootstrapStartedEvent,
  BootstrapStepRequestedEvent,
  BootstrapStepCompletedEvent,
  BootstrapCompletedEvent,
  AgentReadyEvent,
  AgentStoppedEvent,
  AgentIdleEvent,
  ShutdownRequestedEvent,
  AgentErrorEvent
} from '../events/agent-events.js';
import { BaseTool } from '../../tools/base-tool.js';
import { EventHandlerRegistry } from '../handlers/event-handler-registry.js';
import { UserInputMessageEventHandler } from '../handlers/user-input-message-event-handler.js';
import { InterAgentMessageReceivedEventHandler } from '../handlers/inter-agent-message-event-handler.js';
import { LLMCompleteResponseReceivedEventHandler } from '../handlers/llm-complete-response-received-event-handler.js';
import { ToolInvocationRequestEventHandler } from '../handlers/tool-invocation-request-event-handler.js';
import { ToolResultEventHandler } from '../handlers/tool-result-event-handler.js';
import { GenericEventHandler } from '../handlers/generic-event-handler.js';
import { ToolExecutionApprovalEventHandler } from '../handlers/tool-execution-approval-event-handler.js';
import { LLMUserMessageReadyEventHandler } from '../handlers/llm-user-message-ready-event-handler.js';
import { ToolInvocationExecutionEventHandler } from '../handlers/tool-invocation-execution-event-handler.js';
import { BootstrapEventHandler } from '../handlers/bootstrap-event-handler.js';
import { LifecycleEventLogger } from '../handlers/lifecycle-event-logger.js';
import { SkillRegistry } from '../../skills/registry.js';
import { FileMemoryStore, MemoryManager, resolveMemoryBaseDir } from '../../memory/index.js';
import { WorkingContextSnapshotStore } from '../../memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshotBootstrapOptions } from '../../memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryIngestInputProcessor } from '../input-processor/memory-ingest-input-processor.js';
import { MemoryIngestToolResultProcessor } from '../tool-execution-result-processor/memory-ingest-tool-result-processor.js';
import { AgentRuntime } from '../runtime/agent-runtime.js';
import { registerTools } from '../../tools/register-tools.js';
import { initializeLogging } from '../../utils/logger.js';

export class AgentFactory extends Singleton {
  protected static instance?: AgentFactory;

  private activeAgents: Map<string, Agent> = new Map();

  constructor() {
    super();
    if (AgentFactory.instance) {
      return AgentFactory.instance;
    }
    AgentFactory.instance = this;
    initializeLogging();
    registerTools();
    console.info('AgentFactory (Singleton) initialized.');
  }

  private getDefaultEventHandlerRegistry(): EventHandlerRegistry {
    const registry = new EventHandlerRegistry();
    registry.register(UserMessageReceivedEvent, new UserInputMessageEventHandler());
    registry.register(InterAgentMessageReceivedEvent, new InterAgentMessageReceivedEventHandler());
    registry.register(LLMCompleteResponseReceivedEvent, new LLMCompleteResponseReceivedEventHandler());
    registry.register(PendingToolInvocationEvent, new ToolInvocationRequestEventHandler());
    registry.register(ToolResultEvent, new ToolResultEventHandler());
    registry.register(GenericEvent, new GenericEventHandler());
    registry.register(ToolExecutionApprovalEvent, new ToolExecutionApprovalEventHandler());
    registry.register(LLMUserMessageReadyEvent, new LLMUserMessageReadyEventHandler());
    registry.register(ExecuteToolInvocationEvent, new ToolInvocationExecutionEventHandler());

    const bootstrapHandler = new BootstrapEventHandler();
    registry.register(BootstrapStartedEvent, bootstrapHandler);
    registry.register(BootstrapStepRequestedEvent, bootstrapHandler);
    registry.register(BootstrapStepCompletedEvent, bootstrapHandler);
    registry.register(BootstrapCompletedEvent, bootstrapHandler);

    const lifecycleLogger = new LifecycleEventLogger();
    registry.register(AgentReadyEvent, lifecycleLogger);
    registry.register(AgentStoppedEvent, lifecycleLogger);
    registry.register(AgentIdleEvent, lifecycleLogger);
    registry.register(ShutdownRequestedEvent, lifecycleLogger);
    registry.register(AgentErrorEvent, lifecycleLogger);
    return registry;
  }

  private prepareToolInstances(agentId: string, config: AgentConfig): Record<string, BaseTool> {
    const toolInstances: Record<string, BaseTool> = {};
    if (!config.tools || config.tools.length === 0) {
      console.info(`Agent '${agentId}': No tools provided in config.`);
      return toolInstances;
    }

    for (const toolInstance of config.tools) {
      const nameResolver = (toolInstance as any).getName;
      const instanceName =
        typeof nameResolver === 'function'
          ? (toolInstance as any).getName()
          : (toolInstance.constructor as typeof BaseTool).getName();

      if (toolInstances[instanceName]) {
        console.warn(
          `Agent '${agentId}': Duplicate tool name '${instanceName}' encountered. The last one will be used.`
        );
      }

      toolInstances[instanceName] = toolInstance;
    }

    return toolInstances;
  }

  private prepareSkills(agentId: string, config: AgentConfig): void {
    const registry = new SkillRegistry();
    const updatedSkills: string[] = [];

    for (const skillItem of config.skills) {
      const isPath = path.isAbsolute(skillItem) || fs.existsSync(skillItem);
      if (isPath) {
        try {
          const skill = registry.registerSkillFromPath(skillItem);
          updatedSkills.push(skill.name);
        } catch (error) {
          console.error(
            `Agent '${agentId}': Failed to register skill from path '${skillItem}': ${String(error)}`
          );
        }
      } else {
        updatedSkills.push(skillItem);
      }
    }

    config.skills = updatedSkills;
  }

  private createRuntimeWithId(
    agentId: string,
    config: AgentConfig,
    memoryDirOverride: string | null = null,
    restoreOptions: WorkingContextSnapshotBootstrapOptions | null = null
  ): AgentRuntime {
    this.prepareSkills(agentId, config);

    const runtimeState = new AgentRuntimeState(
      agentId,
      config.workspace ?? null,
      config.initialCustomData ?? null
    );

    const memoryDir = resolveMemoryBaseDir({
      overrideDir: memoryDirOverride ?? config.memoryDir ?? null
    });
    const memoryStore = new FileMemoryStore(memoryDir, agentId);
    const snapshotStore = new WorkingContextSnapshotStore(memoryDir, agentId);
    runtimeState.memoryManager = new MemoryManager({ store: memoryStore, workingContextSnapshotStore: snapshotStore });
    runtimeState.restoreOptions = restoreOptions;

    if (!config.inputProcessors.some((processor) => processor instanceof MemoryIngestInputProcessor)) {
      config.inputProcessors.push(new MemoryIngestInputProcessor());
    }
    if (
      !config.toolExecutionResultProcessors.some(
        (processor) => processor instanceof MemoryIngestToolResultProcessor
      )
    ) {
      config.toolExecutionResultProcessors.push(new MemoryIngestToolResultProcessor());
    }

    runtimeState.llmInstance = config.llmInstance;
    runtimeState.toolInstances = this.prepareToolInstances(agentId, config);

    console.info(
      `Agent '${agentId}': LLM instance '${config.llmInstance.constructor.name}' and ${Object.keys(runtimeState.toolInstances).length} tools prepared and stored in state.`
    );

    const context = new AgentContext(agentId, config, runtimeState);
    const eventHandlerRegistry = this.getDefaultEventHandlerRegistry();

    console.info(`Instantiating AgentRuntime for agent_id: '${agentId}' with config: '${config.name}'.`);
    return new AgentRuntime(context, eventHandlerRegistry);
  }

  createAgent(config: AgentConfig): Agent {
    if (!(config instanceof AgentConfig)) {
      throw new TypeError(`Expected AgentConfig instance, got ${String(config)}`);
    }

    let agentId = `${config.name}_${config.role}_${Math.floor(Math.random() * 9000) + 1000}`;
    while (this.activeAgents.has(agentId)) {
      agentId = `${config.name}_${config.role}_${Math.floor(Math.random() * 9000) + 1000}`;
    }

    const runtime = this.createRuntimeWithId(agentId, config);
    const agent = new Agent(runtime);
    this.activeAgents.set(agentId, agent);
    console.info(`Agent '${agentId}' created and stored successfully.`);
    return agent;
  }

  restoreAgent(agentId: string, config: AgentConfig, memoryDir: string | null = null): Agent {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('restoreAgent requires a non-empty string agentId.');
    }
    if (this.activeAgents.has(agentId)) {
      throw new Error(`Agent '${agentId}' is already active.`);
    }

    const restoreOptions = new WorkingContextSnapshotBootstrapOptions();
    const runtime = this.createRuntimeWithId(agentId, config, memoryDir, restoreOptions);
    const agent = new Agent(runtime);
    this.activeAgents.set(agentId, agent);
    console.info(`Agent '${agentId}' restored and stored successfully.`);
    return agent;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.activeAgents.get(agentId);
  }

  async removeAgent(agentId: string, shutdownTimeout: number = 10.0): Promise<boolean> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      console.warn(`Agent with ID '${agentId}' not found for removal.`);
      return false;
    }

    this.activeAgents.delete(agentId);
    console.info(`Removing agent '${agentId}'. Attempting graceful shutdown.`);
    await agent.stop(shutdownTimeout);
    return true;
  }

  listActiveAgentIds(): string[] {
    return Array.from(this.activeAgents.keys());
  }
}

export const defaultAgentFactory = AgentFactory.getInstance();
