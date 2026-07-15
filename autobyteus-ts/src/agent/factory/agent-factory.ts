import fs from 'fs';
import path from 'path';
import { Singleton } from '../../utils/singleton.js';
import { Agent } from '../agent.js';
import { AgentConfig } from '../context/agent-config.js';
import { AgentRuntimeState } from '../context/agent-runtime-state.js';
import { AgentContext } from '../context/agent-context.js';
import { BaseTool } from '../../tools/base-tool.js';
import { SkillRegistry } from '../../skills/registry.js';
import {
  CompactionPolicy,
  FileMemoryStore,
  MemoryManager,
  resolveMemoryBaseDir
} from '../../memory/index.js';
import { WorkingContextSnapshotStore } from '../../memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshotBootstrapOptions } from '../../memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryIngestInputProcessor } from '../input-processor/memory-ingest-input-processor.js';
import { MemoryIngestToolResultProcessor } from '../tool-execution-result-processor/memory-ingest-tool-result-processor.js';
import { AgentRuntime } from '../runtime/agent-runtime.js';
import { registerTools } from '../../tools/register-tools.js';
import { initializeLogging } from '../../utils/logger.js';
import { generateReadableAgentId } from './agent-id.js';

const normalizeExplicitMemoryDir = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

type ActiveAgentEntry = {
  state: 'active';
  agent: Agent;
};

type StoppingAgentEntry = {
  state: 'stopping';
  agent: Agent;
  stopPromise: Promise<boolean>;
};

type AgentLifecycleEntry = ActiveAgentEntry | StoppingAgentEntry;

export class AgentFactory extends Singleton {
  protected static instance?: AgentFactory;

  private agents: Map<string, AgentLifecycleEntry> = new Map();

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
      config.workspaceRootPath ?? null,
      config.initialCustomData ?? null
    );

    const explicitMemoryDir =
      normalizeExplicitMemoryDir(memoryDirOverride) ??
      normalizeExplicitMemoryDir(config.memoryDir ?? null);
    const memoryDir = explicitMemoryDir ?? resolveMemoryBaseDir();
    const memoryLayoutOptions = explicitMemoryDir
      ? { agentRootSubdir: '' }
      : { agentRootSubdir: 'agents' };
    const memoryStore = new FileMemoryStore(memoryDir, agentId, memoryLayoutOptions);
    const snapshotStore = new WorkingContextSnapshotStore(memoryDir, agentId, memoryLayoutOptions);
    const compactionPolicy = new CompactionPolicy();
    runtimeState.memoryManager = new MemoryManager({
      store: memoryStore,
      compactionPolicy,
      workingContextSnapshotStore: snapshotStore
    });
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
    console.info(`Instantiating AgentRuntime for agent_id: '${agentId}' with config: '${config.name}'.`);
    return new AgentRuntime(context);
  }

  createAgent(config: AgentConfig): Agent {
    if (!(config instanceof AgentConfig)) {
      throw new TypeError(`Expected AgentConfig instance, got ${String(config)}`);
    }

    let agentId = generateReadableAgentId(config.name, config.role);
    while (this.hasKnownAgent(agentId)) {
      agentId = generateReadableAgentId(config.name, config.role);
    }

    return this.createAgentWithId(agentId, config);
  }

  createAgentWithId(agentId: string, config: AgentConfig): Agent {
    if (!(config instanceof AgentConfig)) {
      throw new TypeError(`Expected AgentConfig instance, got ${String(config)}`);
    }
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('createAgentWithId requires a non-empty string agentId.');
    }
    if (this.hasKnownAgent(agentId)) {
      throw new Error(`Agent '${agentId}' is already active or stopping.`);
    }

    const runtime = this.createRuntimeWithId(agentId, config);
    const agent = new Agent(runtime);
    this.agents.set(agentId, { state: 'active', agent });
    console.info(`Agent '${agentId}' created and stored successfully.`);
    return agent;
  }

  restoreAgent(agentId: string, config: AgentConfig, memoryDir: string | null = null): Agent {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('restoreAgent requires a non-empty string agentId.');
    }
    if (this.hasKnownAgent(agentId)) {
      throw new Error(`Agent '${agentId}' is already active or stopping.`);
    }

    const restoreOptions = new WorkingContextSnapshotBootstrapOptions();
    const runtime = this.createRuntimeWithId(agentId, config, memoryDir, restoreOptions);
    const agent = new Agent(runtime);
    this.agents.set(agentId, { state: 'active', agent });
    console.info(`Agent '${agentId}' restored and stored successfully.`);
    return agent;
  }

  getAgent(agentId: string): Agent | undefined {
    const entry = this.agents.get(agentId);
    return entry?.state === 'active' ? entry.agent : undefined;
  }

  async removeAgent(agentId: string, shutdownTimeout: number = 10.0): Promise<boolean> {
    const entry = this.agents.get(agentId);
    if (!entry) {
      console.warn(`Agent with ID '${agentId}' not found for removal.`);
      return false;
    }
    if (entry.state === 'stopping') {
      console.info(`Agent '${agentId}' is already stopping. Awaiting existing shutdown.`);
      return entry.stopPromise;
    }

    const agent = entry.agent;
    console.info(`Removing agent '${agentId}'. Attempting graceful shutdown.`);
    let stoppingEntry!: StoppingAgentEntry;
    const stopPromise = (async () => {
      await agent.stop(shutdownTimeout);
      const currentEntry = this.agents.get(agentId);
      if (currentEntry === stoppingEntry) {
        this.agents.delete(agentId);
      }
      return true;
    })();
    stoppingEntry = { state: 'stopping', agent, stopPromise };
    this.agents.set(agentId, stoppingEntry);
    return stopPromise;
  }

  listActiveAgentIds(): string[] {
    return Array.from(this.agents.entries())
      .filter(([, entry]) => entry.state === 'active')
      .map(([agentId]) => agentId);
  }

  private hasKnownAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }
}

export const defaultAgentFactory = AgentFactory.getInstance();
