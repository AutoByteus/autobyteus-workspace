export type MediaOperationOptions = {
  signal?: AbortSignal | null;
  deadlineAt?: number | null;
  turnId?: string | null;
  invocationId?: string | null;
};
