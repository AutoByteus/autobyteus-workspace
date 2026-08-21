import type { RunActivity, RunActivityKind } from '~/types/activity/RunActivity';

export type SystemInstructionSourceKey =
  | 'native'
  | 'claude'
  | 'codex'
  | 'unknown';

export const getSystemInstructionSourceKey = (runtimeKind: string | null | undefined): SystemInstructionSourceKey => {
  switch (runtimeKind) {
    case 'autobyteus': return 'native';
    case 'claude_agent_sdk': return 'claude';
    case 'codex_app_server': return 'codex';
    default: return 'unknown';
  }
};

export const countUnicodeCodePoints = (content: string): number => Array.from(content).length;

export const assertUnreachableRunActivity = (activity: never): never => {
  throw new Error(`Unsupported Activity kind: ${String((activity as { kind?: unknown }).kind)}`);
};

export const getRunActivityDispatchKind = (activity: RunActivity): RunActivityKind => {
  switch (activity.kind) {
    case 'tool': return 'tool';
    case 'compaction': return 'compaction';
    case 'system_instruction': return 'system_instruction';
    default: return assertUnreachableRunActivity(activity);
  }
};
