/**
 * Whether a request begun on a run still belongs to the same run instance when it returns (a stop's local teardown, for an
 * agent run and a Team's members). Another instance is a known start instance that differs from the current one. An
 * instance unknown at the start (no input-state yet) or now is not another run: the interrupt's input-state often arrives
 * during the stop (autobyteus-458 REQ-011).
 */
export const sameRunInstance = (atStart: string | null | undefined, current: string | null | undefined): boolean =>
  !atStart || !current || atStart === current;
