export type LiveE2eOperation =
  | 'llm'
  | 'agent-flow'
  | 'compaction-agent-flow'
  | 'search'
  | 'audio'
  | 'image'
  | 'claude-api-key';

export type LiveE2eScenario = Readonly<{
  operation: LiveE2eOperation;
  providerId: string;
  requiredSecretId: string | null;
  model?: string;
  geminiMode?: 'AI_STUDIO' | 'VERTEX_EXPRESS';
}>;

export const liveE2eScenarios: Readonly<Record<string, LiveE2eScenario>>;
export function selectedLiveE2eScenarioIds(): string[];
