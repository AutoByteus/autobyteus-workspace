/** The status words of one agent execution, shared by the server and the web. */
export type AgentExecutionStatus = "offline" | "idle" | "error" | "initializing" | "running";
/** `live`: statuses from a live stream; `historical`: stored statuses, where running work cannot be current. */
export type TeamStatusAuthority = "live" | "historical";
/**
 * The one team status rule: the highest-ranked member status
 * (offline < idle < error < initializing < running). Unknown values count as offline.
 */
export declare const foldTeamAggregateStatus: (statuses: readonly (string | null | undefined)[], authority: TeamStatusAuthority) => AgentExecutionStatus;
//# sourceMappingURL=team-aggregate-status.d.ts.map