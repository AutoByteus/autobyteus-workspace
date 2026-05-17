export type AcceptedAgentDispatch = {
  dispatchTargetType: "AGENT";
  agentRunId: string;
  turnId: string;
  dispatchedAt: Date;
};

export type AcceptedTeamDispatch = {
  dispatchTargetType: "TEAM";
  teamRunId: string;
  memberRunId: string | null;
  memberRouteKey: string | null;
  memberPath: string[] | null;
  turnId: string;
  dispatchedAt: Date;
};

export type ChannelRunDispatchResult =
  | AcceptedAgentDispatch
  | AcceptedTeamDispatch;
