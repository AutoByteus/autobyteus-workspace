export type AgentDefinitionOwnershipScope = "shared" | "team_local";

export class AgentDefinition {
  id?: string | null;
  name: string;
  role?: string;
  description: string;
  instructions: string;
  category?: string;
  avatarUrl?: string | null;
  toolNames: string[];
  inputProcessorNames: string[];
  llmResponseProcessorNames: string[];
  systemPromptProcessorNames: string[];
  toolExecutionResultProcessorNames: string[];
  toolInvocationPreprocessorNames: string[];
  lifecycleProcessorNames: string[];
  skillNames: string[];
  ownershipScope: AgentDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;

  constructor(options: {
    name: string;
    role?: string;
    description: string;
    instructions: string;
    category?: string;
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
    ownershipScope?: AgentDefinitionOwnershipScope;
    ownerTeamId?: string | null;
    ownerTeamName?: string | null;
  }) {
    this.name = options.name;
    this.role = options.role;
    this.description = options.description;
    this.instructions = options.instructions;
    this.category = options.category;
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
    this.ownershipScope = options.ownershipScope ?? "shared";
    this.ownerTeamId = options.ownerTeamId ?? null;
    this.ownerTeamName = options.ownerTeamName ?? null;
  }
}

export type AgentDefinitionUpdate = {
  name?: string;
  role?: string;
  description?: string;
  instructions?: string;
  category?: string;
  avatarUrl?: string | null;
  toolNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  skillNames?: string[];
};
