/**
 * The single open-work predicate for delegated children: only an agent that is
 * initializing or running holds open work. `idle`, `offline` and `error` are
 * quiet, so an errored child does not block root open work.
 * Configured members keep their own predicate.
 */
export const isRunningTaskExecutionStatus = (status: string): boolean =>
  status === "initializing" || status === "running";
