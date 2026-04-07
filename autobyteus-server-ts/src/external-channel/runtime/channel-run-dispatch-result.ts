export type AcceptedAgentDispatch = {
  dispatchTargetType: "AGENT";
  agentRunId: string;
  dispatchedAt: Date;
};

export type AcceptedTeamDispatch = {
  dispatchTargetType: "TEAM";
  teamRunId: string;
  memberRunId: string | null;
  memberName: string | null;
  dispatchedAt: Date;
};

export type ChannelRunDispatchResult =
  | AcceptedAgentDispatch
  | AcceptedTeamDispatch;
