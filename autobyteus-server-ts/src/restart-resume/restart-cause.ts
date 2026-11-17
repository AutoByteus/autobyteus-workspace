/**
 * Why the node restarted, as far as it can know (autobyteus-448 DEC-002): an `update` when the entry was recorded by
 * another release than this server's, otherwise a `restart` when the previous session ended gracefully (its record
 * carries `shutdownAt`), otherwise an `unexpected_stop` (a crash, a forced quit or a power loss: no graceful end).
 */
export type RestartCause = "update" | "restart" | "unexpected_stop";

export const RESTART_CAUSES: readonly RestartCause[] = ["update", "restart", "unexpected_stop"];

export const restartCauseOf = (
  entry: Readonly<{ version: string | null }>,
  shutdownAt: string | null,
  currentVersion: string | null,
): RestartCause => {
  if (entry.version !== null && currentVersion !== null && entry.version !== currentVersion) return "update";
  return shutdownAt ? "restart" : "unexpected_stop";
};
