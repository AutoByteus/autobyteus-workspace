/** Read-only runtime observations, deliberately separate from streamed task lifecycle. */
export type AgentBackgroundTaskViewStatus = 'running' | 'completed' | 'failed' | 'stopped' | 'unknown';
export type AgentBackgroundTaskViewRow = {
  taskId: string;
  kind: 'shell';
  /** Safe executable basename only; blank selects the localized generic shell label. */
  description: string;
  command: null;
  status: AgentBackgroundTaskViewStatus;
  exitCode: number | null;
  startedAt: string;
};
export type AgentBackgroundTaskObservation =
  | { kind: 'snapshot'; observedAt: string; tasks: AgentBackgroundTaskViewRow[] }
  | { kind: 'unavailable'; reason: 'inactive' | 'inspection_failed' | 'incomplete' };
export type AgentBackgroundTaskInspection =
  | { readonly kind: 'snapshot'; read(): Promise<AgentBackgroundTaskObservation> }
  | { readonly kind: 'event-stream' }
  | { readonly kind: 'unsupported' };
export type AgentBackgroundTaskView =
  | { kind: 'snapshot'; agentRunId: string; runInstanceId: string; observedAt: string; tasks: AgentBackgroundTaskViewRow[] }
  | { kind: 'event-stream'; agentRunId: string }
  | { kind: 'unsupported'; agentRunId: string; reason: 'unsupported' }
  | { kind: 'unavailable'; agentRunId: string; reason: 'inactive' | 'inspection_failed' | 'incomplete' };
