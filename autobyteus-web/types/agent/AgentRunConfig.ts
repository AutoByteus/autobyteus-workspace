export type SkillAccessMode = 'PRELOADED_ONLY' | 'GLOBAL_DISCOVERY' | 'NONE';
export const AGENT_RUNTIME_KINDS = ['autobyteus', 'codex_app_server', 'claude_agent_sdk'] as const;
export type AgentRuntimeKind = (typeof AGENT_RUNTIME_KINDS)[number];
export const DEFAULT_AGENT_RUNTIME_KIND: AgentRuntimeKind = 'autobyteus';

export const isAgentRuntimeKind = (value: unknown): value is AgentRuntimeKind =>
  typeof value === 'string' && (AGENT_RUNTIME_KINDS as readonly string[]).includes(value);

/**
 * Configuration for a running agent run.
 * 
 * Each agent run has its own config that is:
 * - Editable before the first message is sent
 * - Locked (isLocked=true) after the first message
 */
export interface AgentRunConfig {
  /** ID of the agent definition this run is based on */
  agentDefinitionId: string;
  
  /** Display name of the agent (from definition) */
  agentDefinitionName: string;

  /** Optional avatar URL for the selected agent definition */
  agentAvatarUrl?: string | null;
  
  /** LLM model identifier (e.g., 'gpt-4-turbo', 'claude-3-sonnet') */
  llmModelIdentifier: string;

  /** Runtime backend used for this run (e.g. local runtime or codex app server). */
  runtimeKind: AgentRuntimeKind;
  
  /** Workspace ID if a workspace is attached, null otherwise */
  workspaceId: string | null;
  
  /** Whether to auto-execute tool calls without user confirmation */
  autoExecuteTools: boolean;

  /** Controls which skills this agent can use for this run */
  skillAccessMode: SkillAccessMode;
  
  /** 
   * Whether this config is locked (read-only).
   * Set to true after the first message is sent to the backend.
   */
  isLocked: boolean;
  
  /**
   * Model-specific runtime configuration (e.g., thinking_level for Gemini).
   * Schema is defined by the model's configSchema.
   */
  llmConfig?: Record<string, unknown> | null;
}
