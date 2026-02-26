import type { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";
import { createLocalTeamRoutingPortAdapter } from "autobyteus-ts/agent-team/routing/local-team-routing-port-adapter.js";
import { TeamCommandIngressError } from "../ingress/team-command-ingress-service.js";

export type WorkerLocalDispatchResult = {
  accepted: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type WorkerDispatchTeamLike = {
  runtime?: {
    context?: {
      teamManager?: {
        dispatchInterAgentMessage?: (event: InterAgentMessageRequestEvent) => Promise<void>;
        ensureNodeIsReady?: (nameOrAgentId: string) => Promise<any>;
      };
    };
  };
};

export const dispatchWithTeamLocalRoutingPort = async (input: {
  team: WorkerDispatchTeamLike;
  contextLabel: string;
  dispatch: (localRoutingPort: ReturnType<typeof createLocalTeamRoutingPortAdapter>) => Promise<WorkerLocalDispatchResult>;
}): Promise<void> => {
  const teamManager = input.team.runtime?.context?.teamManager;
  const ensureNodeIsReady = teamManager?.ensureNodeIsReady;
  if (typeof ensureNodeIsReady !== "function") {
    throw new TeamCommandIngressError(
      "TEAM_DISPATCH_UNAVAILABLE",
      `${input.contextLabel} cannot dispatch locally because TeamManager.ensureNodeIsReady is unavailable.`,
    );
  }

  const localRoutingPort = createLocalTeamRoutingPortAdapter({
    ensureNodeIsReady: ensureNodeIsReady.bind(teamManager),
  });
  const result = await input.dispatch(localRoutingPort);
  if (!result.accepted) {
    throw new TeamCommandIngressError(
      "TEAM_DISPATCH_UNAVAILABLE",
      result.errorMessage ?? result.errorCode ?? "Worker-local dispatch was rejected.",
    );
  }
};

export const dispatchWithWorkerLocalRoutingPort = async (input: {
  teamRunId: string;
  workerManagedRunIds: ReadonlySet<string>;
  team: WorkerDispatchTeamLike;
  dispatch: (localRoutingPort: ReturnType<typeof createLocalTeamRoutingPortAdapter>) => Promise<WorkerLocalDispatchResult>;
}): Promise<boolean> => {
  if (!input.workerManagedRunIds.has(input.teamRunId)) {
    return false;
  }

  await dispatchWithTeamLocalRoutingPort({
    team: input.team,
    contextLabel: `Run '${input.teamRunId}'`,
    dispatch: input.dispatch,
  });
  return true;
};

export const dispatchInterAgentMessageViaTeamManager = async (input: {
  team: WorkerDispatchTeamLike;
  event: InterAgentMessageRequestEvent;
}): Promise<boolean> => {
  const teamManager = input.team.runtime?.context?.teamManager;
  if (!teamManager || typeof teamManager.dispatchInterAgentMessage !== "function") {
    return false;
  }
  await teamManager.dispatchInterAgentMessage(input.event);
  return true;
};
