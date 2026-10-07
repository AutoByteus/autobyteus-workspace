/** The status words of one agent execution, shared by the server and the web. */
export type AgentExecutionStatus = "offline" | "idle" | "error" | "initializing" | "running";

/** `live`: statuses from a live stream; `historical`: stored statuses, where running work cannot be current. */
export type TeamStatusAuthority = "live" | "historical";

const statusRank: Readonly<Record<AgentExecutionStatus, number>> = Object.freeze({
  offline: 0,
  idle: 1,
  error: 2,
  initializing: 3,
  running: 4,
});

const normalizeAgentStatus = (status: string | null | undefined, authority: TeamStatusAuthority): AgentExecutionStatus => {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (normalized === "running" || normalized === "initializing") return authority === "live" ? normalized : "offline";
  if (normalized === "error") return "error";
  if (normalized === "idle") return "idle";
  return "offline";
};

/**
 * The one team status rule: the highest-ranked member status
 * (offline < idle < error < initializing < running). Unknown values count as offline.
 */
export const foldTeamAggregateStatus = (
  statuses: readonly (string | null | undefined)[],
  authority: TeamStatusAuthority,
): AgentExecutionStatus => {
  let aggregate: AgentExecutionStatus = "offline";
  for (const candidate of statuses) {
    const status = normalizeAgentStatus(candidate, authority);
    if (statusRank[status] > statusRank[aggregate]) aggregate = status;
    if (aggregate === "running") break;
  }
  return aggregate;
};
