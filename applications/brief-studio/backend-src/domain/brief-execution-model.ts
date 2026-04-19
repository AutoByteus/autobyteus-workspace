export type BriefExecutionRecord = {
  bindingId: string;
  status: string;
  runId: string;
  definitionId: string;
  createdAt: string;
  updatedAt: string;
  terminatedAt: string | null;
  lastErrorMessage: string | null;
};
