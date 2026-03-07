export type SkillAccessMode = 'PRELOADED_ONLY' | 'GLOBAL_DISCOVERY' | 'NONE';
export type AgentRuntimeKind = string;
export const DEFAULT_AGENT_RUNTIME_KIND: AgentRuntimeKind = 'autobyteus';

const AGENT_RUNTIME_KIND_LABELS: Record<string, string> = {
  autobyteus: 'AutoByteus Runtime',
  codex_app_server: 'Codex App Server',
  claude_agent_sdk: 'Claude Agent SDK',
};

export const runtimeKindToLabel = (runtimeKind: string): string => {
  const normalized = runtimeKind.trim();
  if (!normalized) {
    return AGENT_RUNTIME_KIND_LABELS[DEFAULT_AGENT_RUNTIME_KIND] ?? 'Runtime';
  }
  const known = AGENT_RUNTIME_KIND_LABELS[normalized];
  if (known) {
    return known;
  }
  return normalized
    .split(/[_-]+/g)
    .filter((token) => token.length > 0)
    .map((token) => `${token.slice(0, 1).toUpperCase()}${token.slice(1)}`)
    .join(' ');
};

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
