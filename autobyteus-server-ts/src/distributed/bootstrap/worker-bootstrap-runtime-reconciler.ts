import type { TeamEventAggregator } from "../event-aggregation/team-event-aggregator.js";
import { memberBindingsMatch } from "./bootstrap-payload-normalization.js";
import type { WorkerRunLifecycleCoordinator } from "./worker-run-lifecycle-coordinator.js";
import type { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";
import type { RunScopedMemberBindingInput } from "../runtime-binding/run-scoped-member-binding.js";

type TeamLike = {
  isRunning?: boolean;
};

const isTeamRuntimeRunning = (team: TeamLike | null): boolean => {
  if (!team) {
    return false;
  }
  if (typeof team.isRunning === "boolean") {
    return team.isRunning;
  }
  // Preserve legacy behavior for non-standard team-like test doubles.
  return true;
};

type TeamRunManagerDependencies = {
  getTeamRun: (teamId: string) => unknown;
  createWorkerProjectionTeamRunWithId: (
    teamId: string,
    teamDefinitionId: string,
    memberConfigs: RunScopedMemberBindingInput[],
  ) => Promise<string>;
  terminateTeamRun: (teamId: string) => Promise<boolean>;
  getTeamMemberConfigs: (teamId: string) => RunScopedMemberBindingInput[];
};

type RunScopedBindingRegistryDependencies = Pick<
  RunScopedTeamBindingRegistry,
  "tryResolveRun" | "bindRun" | "unbindRun"
>;

export type ReconcileWorkerBootstrapRuntimeDependencies = {
  teamRunManager: TeamRunManagerDependencies;
  runScopedTeamBindingRegistry: RunScopedBindingRegistryDependencies;
  teamEventAggregator: Pick<TeamEventAggregator, "finalizeRun">;
  workerRunLifecycleCoordinator: Pick<
    WorkerRunLifecycleCoordinator,
    "markWorkerManagedRun" | "teardownRun"
  >;
};

export const reconcileWorkerBootstrapRuntime = async (
  input: ReconcileWorkerBootstrapRuntimeDependencies & {
    teamRunId: string;
    teamId: string;
    runVersion: string | number;
    hostTeamDefinitionId: string;
    workerTeamDefinitionId: string;
    memberBindings: RunScopedMemberBindingInput[];
    bootstrapHostNodeId: string;
  },
): Promise<{ runtimeTeamId: string; reusedBoundRuntime: boolean }> => {
  const existingBinding = input.runScopedTeamBindingRegistry.tryResolveRun(input.teamRunId);
  if (existingBinding) {
    const boundTeam = input.teamRunManager.getTeamRun(
      existingBinding.runtimeTeamId,
    ) as TeamLike | null;
    if (isTeamRuntimeRunning(boundTeam)) {
      input.workerRunLifecycleCoordinator.markWorkerManagedRun(
        input.teamRunId,
        input.bootstrapHostNodeId,
      );
      return {
        runtimeTeamId: existingBinding.runtimeTeamId,
        reusedBoundRuntime: true,
      };
    }
    if (boundTeam) {
      await input.teamRunManager.terminateTeamRun(existingBinding.runtimeTeamId);
    }
    await input.workerRunLifecycleCoordinator.teardownRun(input.teamRunId);
    input.runScopedTeamBindingRegistry.unbindRun(input.teamRunId);
    input.teamEventAggregator.finalizeRun(input.teamRunId);
  }

  const runtimeTeamId = input.teamId;
  const existingTeam = input.teamRunManager.getTeamRun(runtimeTeamId) as TeamLike | null;
  const existingTeamRunning = isTeamRuntimeRunning(existingTeam);
  if (!existingTeam) {
    await input.teamRunManager.createWorkerProjectionTeamRunWithId(
      runtimeTeamId,
      input.workerTeamDefinitionId,
      input.memberBindings,
    );
  } else if (!existingTeamRunning) {
    await input.teamRunManager.terminateTeamRun(runtimeTeamId);
    await input.teamRunManager.createWorkerProjectionTeamRunWithId(
      runtimeTeamId,
      input.workerTeamDefinitionId,
      input.memberBindings,
    );
  } else {
    const existingBindings = input.teamRunManager.getTeamMemberConfigs(runtimeTeamId);
    if (!memberBindingsMatch(existingBindings, input.memberBindings)) {
      await input.teamRunManager.terminateTeamRun(runtimeTeamId);
      await input.teamRunManager.createWorkerProjectionTeamRunWithId(
        runtimeTeamId,
        input.workerTeamDefinitionId,
        input.memberBindings,
      );
    }
  }

  input.runScopedTeamBindingRegistry.bindRun({
    teamRunId: input.teamRunId,
    teamId: input.teamId,
    runVersion: input.runVersion,
    teamDefinitionId: input.hostTeamDefinitionId,
    runtimeTeamId,
    memberBindings: input.memberBindings,
  });
  input.workerRunLifecycleCoordinator.markWorkerManagedRun(
    input.teamRunId,
    input.bootstrapHostNodeId,
  );

  return {
    runtimeTeamId,
    reusedBoundRuntime: false,
  };
};
