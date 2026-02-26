export class AgentDefinition {
  id?: string | null;
  name: string;
  role: string;
  description: string;
  avatarUrl?: string | null;
  toolNames: string[];
  inputProcessorNames: string[];
  llmResponseProcessorNames: string[];
  systemPromptProcessorNames: string[];
  toolExecutionResultProcessorNames: string[];
  toolInvocationPreprocessorNames: string[];
  lifecycleProcessorNames: string[];
  skillNames: string[];
  systemPromptCategory?: string | null;
  systemPromptName?: string | null;

  constructor(options: {
    name: string;
    role: string;
    description: string;
    avatarUrl?: string | null;
    id?: string | null;
    toolNames?: string[];
    inputProcessorNames?: string[];
    llmResponseProcessorNames?: string[];
    systemPromptProcessorNames?: string[];
    toolExecutionResultProcessorNames?: string[];
    toolInvocationPreprocessorNames?: string[];
    lifecycleProcessorNames?: string[];
    skillNames?: string[];
    systemPromptCategory?: string | null;
    systemPromptName?: string | null;
  }) {
    this.name = options.name;
    this.role = options.role;
    this.description = options.description;
    this.avatarUrl = options.avatarUrl ?? null;
    this.id = options.id ?? null;
    this.toolNames = options.toolNames ?? [];
    this.inputProcessorNames = options.inputProcessorNames ?? [];
    this.llmResponseProcessorNames = options.llmResponseProcessorNames ?? [];
    this.systemPromptProcessorNames = options.systemPromptProcessorNames ?? [];
    this.toolExecutionResultProcessorNames = options.toolExecutionResultProcessorNames ?? [];
    this.toolInvocationPreprocessorNames = options.toolInvocationPreprocessorNames ?? [];
    this.lifecycleProcessorNames = options.lifecycleProcessorNames ?? [];
    this.skillNames = options.skillNames ?? [];
    this.systemPromptCategory = options.systemPromptCategory ?? null;
    this.systemPromptName = options.systemPromptName ?? null;
  }
}

export class AgentPromptMapping {
  id?: string | null;
  agentDefinitionId: string;
  promptName: string;
  promptCategory: string;

  constructor(options: {
    agentDefinitionId: string;
    promptName: string;
    promptCategory: string;
    id?: string | null;
  }) {
    this.agentDefinitionId = options.agentDefinitionId;
    this.promptName = options.promptName;
    this.promptCategory = options.promptCategory;
    this.id = options.id ?? null;
  }
}
