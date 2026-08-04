export type AcceptedAgentDispatch = {
  dispatchTargetType: "AGENT";
  agentRunId: string;
  turnId: string;
  dispatchedAt: Date;
};

export type AcceptedTeamDispatch = {
  dispatchTargetType: "TEAM";
  teamRunId: string;
  executionAddress: import("../../agent-team-execution/domain/team-execution-address.js").TeamExecutionAddress;
  turnId: string;
  dispatchedAt: Date;
};

export type ChannelRunDispatchResult =
  | AcceptedAgentDispatch
  | AcceptedTeamDispatch;
