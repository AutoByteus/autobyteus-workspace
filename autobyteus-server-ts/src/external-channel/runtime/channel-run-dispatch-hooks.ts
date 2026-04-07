export type RuntimeEventSubscription = (
  listener: (event: unknown) => void,
) => () => void;

export type ChannelAgentDispatchHooks = {
  onAgentRunResolved?: (input: {
    agentRunId: string;
    subscribeToEvents: RuntimeEventSubscription;
  }) => void;
};

export type ChannelTeamDispatchHooks = {
  onTeamRunResolved?: (input: {
    teamRunId: string;
    subscribeToEvents: RuntimeEventSubscription;
  }) => void;
};

export type ChannelRunDispatchHooks =
  & ChannelAgentDispatchHooks
  & ChannelTeamDispatchHooks;
