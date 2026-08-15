import { BaseLLM } from '../../llm/base.js';
import { SkillAccessMode, resolveSkillAccessMode } from './skill-access-mode.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { BaseAgentUserInputMessageProcessor } from '../input-processor/base-user-input-processor.js';
import type { BaseToolInvocationPreprocessor } from '../tool-invocation-preprocessor/base-preprocessor.js';
import type { BaseToolExecutionResultProcessor } from '../tool-execution-result-processor/base-processor.js';
import type { BaseLLMResponseProcessor } from '../llm-response-processor/base-processor.js';
import type { BaseLifecycleEventProcessor } from '../lifecycle/base-processor.js';
import type { CompactionLineageScope } from '../../memory/lineage/compaction-lineage-scope.js';
import {
  copyMemoryCompactionConfiguration,
  DEFAULT_MEMORY_COMPACTION_CONFIGURATION,
  type MemoryCompactionConfiguration,
} from '../../memory/compaction/memory-compaction-configuration.js';

function deepClone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export class AgentConfig {
  static DEFAULT_LLM_RESPONSE_PROCESSORS: BaseLLMResponseProcessor[] = [];

  name: string;
  role: string;
  description: string;
  llmInstance: BaseLLM;
  systemPrompt?: string | null;
  tools: BaseTool[];
  workspaceRootPath: string | null;
  autoExecuteTools: boolean;
  inputProcessors: BaseAgentUserInputMessageProcessor[];
  llmResponseProcessors: BaseLLMResponseProcessor[];
  toolExecutionResultProcessors: BaseToolExecutionResultProcessor[];
  toolInvocationPreprocessors: BaseToolInvocationPreprocessor[];
  lifecycleProcessors: BaseLifecycleEventProcessor[];
  initialCustomData?: Record<string, any> | null;
  skills: string[];
  skillAccessMode: SkillAccessMode;
  memoryDir?: string | null;
  memoryCompaction: MemoryCompactionConfiguration;
  compactionLineageScope: CompactionLineageScope | null;

  constructor(
    name: string,
    role: string,
    description: string,
    llmInstance: BaseLLM,
    systemPrompt: string | null = null,
    tools: BaseTool[] | null = null,
    autoExecuteTools = true,
    inputProcessors: BaseAgentUserInputMessageProcessor[] | null = null,
    llmResponseProcessors: BaseLLMResponseProcessor[] | null = null,
    toolExecutionResultProcessors: BaseToolExecutionResultProcessor[] | null = null,
    toolInvocationPreprocessors: BaseToolInvocationPreprocessor[] | null = null,
    workspaceRootPath: string | null = null,
    lifecycleProcessors: BaseLifecycleEventProcessor[] | null = null,
    initialCustomData: Record<string, any> | null = null,
    skills: string[] | null = null,
    memoryDir: string | null = null,
    skillAccessMode: SkillAccessMode | null = null,
    memoryCompaction: MemoryCompactionConfiguration = DEFAULT_MEMORY_COMPACTION_CONFIGURATION,
    compactionLineageScope: CompactionLineageScope | null = null,
  ) {
    this.name = name;
    this.role = role;
    this.description = description;
    this.llmInstance = llmInstance;
    this.systemPrompt = systemPrompt;
    this.tools = tools ?? [];
    this.workspaceRootPath = workspaceRootPath;
    this.autoExecuteTools = autoExecuteTools;
    this.inputProcessors = inputProcessors ?? [];
    this.llmResponseProcessors =
      llmResponseProcessors !== null && llmResponseProcessors !== undefined
        ? llmResponseProcessors
        : [...AgentConfig.DEFAULT_LLM_RESPONSE_PROCESSORS];

    this.toolExecutionResultProcessors = toolExecutionResultProcessors ?? [];
    this.toolInvocationPreprocessors = toolInvocationPreprocessors ?? [];
    this.lifecycleProcessors = lifecycleProcessors ?? [];
    this.initialCustomData = initialCustomData ?? undefined;
    this.skills = skills ?? [];
    this.skillAccessMode = resolveSkillAccessMode(skillAccessMode, this.skills.length);
    this.memoryDir = memoryDir ?? undefined;
    this.memoryCompaction = memoryCompaction;
    this.compactionLineageScope = compactionLineageScope
      ? { ...compactionLineageScope }
      : null;

    console.debug(`AgentConfig created for name='${this.name}', role='${this.role}'.`);
  }

  copy(): AgentConfig {
    return new AgentConfig(
      this.name,
      this.role,
      this.description,
      this.llmInstance,
      this.systemPrompt ?? null,
      this.tools.slice(),
      this.autoExecuteTools,
      this.inputProcessors.slice(),
      this.llmResponseProcessors.slice(),
      this.toolExecutionResultProcessors.slice(),
      this.toolInvocationPreprocessors.slice(),
      this.workspaceRootPath,
      this.lifecycleProcessors.slice(),
      deepClone(this.initialCustomData ?? null),
      this.skills.slice(),
      this.memoryDir ?? null,
      this.skillAccessMode,
      copyMemoryCompactionConfiguration(this.memoryCompaction),
      this.compactionLineageScope,
    );
  }

  toString(): string {
    return (
      `AgentConfig(name='${this.name}', role='${this.role}', ` +
      `llmInstance='${this.llmInstance.constructor.name}', ` +
      `workspace_configured=${this.workspaceRootPath !== null}, skills=${JSON.stringify(this.skills)}, ` +
      `skillAccessMode='${this.skillAccessMode}')`
    );
  }
}
