export type AcceptedAgentDispatch = {
  dispatchTargetType: "AGENT";
  agentRunId: string;
  turnId: string;
  dispatchedAt: Date;
};

export type AcceptedTeamDispatch = {
  dispatchTargetType: "TEAM";
  teamRunId: string;
  agentRunId: string;
  turnId: string;
  dispatchedAt: Date;
};

export type ChannelRunDispatchResult =
  | AcceptedAgentDispatch
  | AcceptedTeamDispatch;
