const TASK_AGENT_RUN_ID_MARKERS = [
  '__task_',
  'task-agent-run',
];

export const isTaskAgentRunId = (value?: string | null): boolean => {
  const normalized = value?.trim() || '';
  return TASK_AGENT_RUN_ID_MARKERS.some((marker) => normalized.includes(marker));
};
