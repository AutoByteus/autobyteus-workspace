export type AcceptedAgentDispatch = {
  dispatchTargetType: "AGENT";
  agentRunId: string;
  turnId: string | null;
  dispatchedAt: Date;
};

export type AcceptedTeamDispatch = {
  dispatchTargetType: "TEAM";
  teamRunId: string;
  memberRunId: string | null;
  memberName: string | null;
  turnId: string | null;
  dispatchedAt: Date;
};

export type ChannelRunDispatchResult =
  | AcceptedAgentDispatch
  | AcceptedTeamDispatch;
