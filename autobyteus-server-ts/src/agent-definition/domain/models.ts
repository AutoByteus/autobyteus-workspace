export type AgentDefinitionOwnershipScope = "shared" | "team_local" | "application_owned";

export type AgentDefinitionDefaultLaunchConfig = {
  llmModelIdentifier: string | null;
  runtimeKind: string | null;
  llmConfig: Record<string, unknown> | null;
};

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
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
  defaultLaunchConfig: AgentDefinitionDefaultLaunchConfig | null;

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
    ownerApplicationId?: string | null;
    ownerApplicationName?: string | null;
    ownerPackageId?: string | null;
    ownerLocalApplicationId?: string | null;
    defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null;
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
    this.ownerApplicationId = options.ownerApplicationId ?? null;
    this.ownerApplicationName = options.ownerApplicationName ?? null;
    this.ownerPackageId = options.ownerPackageId ?? null;
    this.ownerLocalApplicationId = options.ownerLocalApplicationId ?? null;
    this.defaultLaunchConfig = options.defaultLaunchConfig ?? null;
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
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null;
};
