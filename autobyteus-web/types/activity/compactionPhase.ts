export const COMPACTION_PHASES = ['requested', 'started', 'completed', 'failed', 'stopped'] as const;
export type CompactionStatusPhase = typeof COMPACTION_PHASES[number];
export const isCompactionPhase = (value: unknown): value is CompactionStatusPhase =>
  COMPACTION_PHASES.some((phase) => phase === value);
export const isActiveCompactionPhase = (phase: CompactionStatusPhase | null | undefined): boolean =>
  phase === 'requested' || phase === 'started';
export const isCompleteCompactionPhase = (phase: CompactionStatusPhase | null | undefined): boolean =>
  phase === 'completed' || phase === 'failed' || phase === 'stopped';
