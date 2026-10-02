// Fixture-specific semantic alarm: the quality history requests a plan update,
// but contains no assistant/tool action that performs it. Not a general evaluator.
export const assertNoInventedPlanChanges = (summary: string): void => {
  const text = summary.replace(/[`*]/g, '');
  const completed = /## Completed work\s*\n([\s\S]*?)(?=\n## |$)/.exec(text)?.[1];
  if (completed === undefined) throw new Error('LIVE_E2E_QUALITY_COMPLETED_SECTION_MISSING');
  const affirmativePlanUpdate = /^\s*-\s*(?:updated|modified|wrote|written|created|added)\b[^\n]*(?:APPROVAL-73|plan)/im;
  const affirmativeCheckpoint = /^\s*-\s*(?:checkpoint\s+)?APPROVAL-73\s+(?:was\s+|has been\s+)?added\s+to\s+the\s+plan/im;
  if (affirmativePlanUpdate.test(completed) || affirmativeCheckpoint.test(text)) {
    throw new Error('LIVE_E2E_QUALITY_PLANNED_WORK_REPORTED_COMPLETE');
  }
};
