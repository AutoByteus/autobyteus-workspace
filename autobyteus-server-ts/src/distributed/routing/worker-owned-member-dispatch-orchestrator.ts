import { createLocalTeamRoutingPortAdapter } from "autobyteus-ts/agent-team/routing/local-team-routing-port-adapter.js";
import type { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";
import {
  resolveWorkerMemberDispatchOwnership,
  type WorkerMemberDispatchOwnership,
} from "./worker-member-locality-resolver.js";
import type { WorkerDispatchTeamLike } from "./worker-local-dispatch.js";

export type WorkerOwnedMemberDispatchOutcome = {
  handled: boolean;
  ownership: WorkerMemberDispatchOwnership;
};

type WorkerLocalDispatchResult = {
  accepted: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export const dispatchToWorkerOwnedMemberIfEligible = async (input: {
  selfNodeId: string;
  teamRunId: string;
  targetMemberName: string;
  runScopedTeamBindingRegistry: Pick<RunScopedTeamBindingRegistry, "tryResolveRun">;
  workerManagedRunIds: ReadonlySet<string>;
  team: WorkerDispatchTeamLike;
  dispatch: (
    localRoutingPort: ReturnType<typeof createLocalTeamRoutingPortAdapter>,
  ) => Promise<WorkerLocalDispatchResult>;
}): Promise<WorkerOwnedMemberDispatchOutcome> => {
  const ownership = resolveWorkerMemberDispatchOwnership({
    selfNodeId: input.selfNodeId,
    teamRunId: input.teamRunId,
    targetMemberName: input.targetMemberName,
    runScopedTeamBindingRegistry: input.runScopedTeamBindingRegistry,
  });
  if (ownership !== "WORKER_OWNS_TARGET_MEMBER") {
    return {
      handled: false,
      ownership,
    };
  }
  if (!input.workerManagedRunIds.has(input.teamRunId)) {
    return {
      handled: false,
      ownership,
    };
  }

  const teamManager = input.team.runtime?.context?.teamManager;
  const ensureNodeIsReady = teamManager?.ensureNodeIsReady;
  if (typeof ensureNodeIsReady !== "function") {
    throw new Error(
      `Run '${input.teamRunId}' cannot dispatch locally because TeamManager.ensureNodeIsReady is unavailable.`,
    );
  }

  const localRoutingPort = createLocalTeamRoutingPortAdapter({
    ensureNodeIsReady: ensureNodeIsReady.bind(teamManager),
  });
  const result = await input.dispatch(localRoutingPort);
  if (!result.accepted) {
    throw new Error(result.errorMessage ?? result.errorCode ?? "Worker-local dispatch was rejected.");
  }

  return {
    handled: true,
    ownership,
  };
};
