import type { AgentTeamDefinition as DomainAgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { HostNodeBridgeClient } from "../node-bridge/host-node-bridge-client.js";
import { WorkerUplinkRoutingAdapter } from "../routing/worker-uplink-routing-adapter.js";
import type { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";
import type { TeamEventAggregator } from "../event-aggregation/team-event-aggregator.js";
import type { TeamEnvelope } from "../envelope/envelope-builder.js";
import { normalizeRouteSegment } from "../event-aggregation/remote-event-projection.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamMemberMemoryLayoutStore } from "../../run-history/store/team-member-memory-layout-store.js";
import { TeamMemberRunManifestStore } from "../../run-history/store/team-member-run-manifest-store.js";
import {
  getPayloadRecord,
  normalizeBootstrapTeamId,
  normalizeBootstrapMemberBindingSnapshotList,
  normalizeBootstrapTeamDefinitionSnapshot,
} from "./bootstrap-payload-normalization.js";
import { WorkerRunLifecycleCoordinator } from "./worker-run-lifecycle-coordinator.js";
import { createWorkerBootstrapMemberArtifactService } from "./worker-bootstrap-member-artifact-service.js";
import { reconcileWorkerBootstrapRuntime } from "./worker-bootstrap-runtime-reconciler.js";

type TeamLike = {
  isRunning?: boolean;
  runtime?: {
    context?: {
      teamManager?: {
        setTeamRoutingPort?: (port: unknown) => void;
      };
    };
  };
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

type TeamRunManagerDependencies = Pick<
  AgentTeamRunManager,
  | "getTeamRun"
  | "createWorkerProjectionTeamRunWithId"
  | "terminateTeamRun"
  | "getTeamMemberConfigs"
  | "getTeamEventStream"
>;

type RunScopedBindingRegistryDependencies = Pick<
  RunScopedTeamBindingRegistry,
  "tryResolveRun" | "bindRun" | "unbindRun"
>;

export type CreateDispatchRunBootstrapHandlerDependencies = {
  hostNodeId: string;
  teamRunManager: TeamRunManagerDependencies;
  runScopedTeamBindingRegistry: RunScopedBindingRegistryDependencies;
  teamEventAggregator: Pick<TeamEventAggregator, "finalizeRun">;
  hostNodeBridgeClient: Pick<HostNodeBridgeClient, "sendCommand">;
  workerRunLifecycleCoordinator: WorkerRunLifecycleCoordinator;
  resolveWorkerTeamDefinitionId: (input: {
    hostTeamDefinitionId: string;
    snapshot: DomainAgentTeamDefinition | null;
  }) => Promise<string>;
  ensureHostNodeDirectoryEntryForWorkerRun: (targetHostNodeId: string) => void;
};

export const createDispatchRunBootstrapHandler = (
  deps: CreateDispatchRunBootstrapHandlerDependencies,
): ((envelope: TeamEnvelope) => Promise<void>) => {
  return async (envelope: TeamEnvelope): Promise<void> => {
    const payload = getPayloadRecord(envelope.payload);
    const teamId = normalizeBootstrapTeamId(payload);
    const hostTeamDefinitionId = normalizeRequiredString(
      String(payload.teamDefinitionId ?? ""),
      "payload.teamDefinitionId",
    );
    const teamDefinitionSnapshot = normalizeBootstrapTeamDefinitionSnapshot(
      payload.teamDefinitionSnapshot,
    );
    const workerTeamDefinitionId = await deps.resolveWorkerTeamDefinitionId({
      hostTeamDefinitionId,
      snapshot: teamDefinitionSnapshot,
    });
    const memoryDir = appConfigProvider.config.getMemoryDir();
    const memberArtifactService = createWorkerBootstrapMemberArtifactService({
      localNodeId: deps.hostNodeId,
      memberLayoutStore: new TeamMemberMemoryLayoutStore(memoryDir),
      memberRunManifestStore: new TeamMemberRunManifestStore(memoryDir),
    });
    const memberBindings = memberArtifactService.prepareMemberBindings(
      teamId,
      normalizeBootstrapMemberBindingSnapshotList(payload),
    );
    await memberArtifactService.persistLocalMemberRunManifests({
      teamRunId: teamId,
      runVersion: envelope.runVersion,
      memberBindings,
    });
    const bootstrapHostNodeId = normalizeRouteSegment(payload.hostNodeId) ?? deps.hostNodeId;
    deps.ensureHostNodeDirectoryEntryForWorkerRun(bootstrapHostNodeId);

    const runtimeBootstrapResult = await reconcileWorkerBootstrapRuntime({
      teamRunId: envelope.teamRunId,
      teamId,
      runVersion: envelope.runVersion,
      hostTeamDefinitionId,
      workerTeamDefinitionId,
      memberBindings,
      bootstrapHostNodeId,
      teamRunManager: deps.teamRunManager,
      runScopedTeamBindingRegistry: deps.runScopedTeamBindingRegistry,
      teamEventAggregator: deps.teamEventAggregator,
      workerRunLifecycleCoordinator: deps.workerRunLifecycleCoordinator,
    });
    if (runtimeBootstrapResult.reusedBoundRuntime) {
      return;
    }
    const runtimeTeamId = runtimeBootstrapResult.runtimeTeamId;

    const runtimeTeam = deps.teamRunManager.getTeamRun(runtimeTeamId) as TeamLike | null;
    const teamManager = runtimeTeam?.runtime?.context?.teamManager;
    if (teamManager?.setTeamRoutingPort) {
      teamManager.setTeamRoutingPort(
        new WorkerUplinkRoutingAdapter({
          teamRunId: envelope.teamRunId,
          runVersion: envelope.runVersion,
          forwardToHost: async (forwardEnvelope) => {
            await deps.hostNodeBridgeClient.sendCommand(bootstrapHostNodeId, forwardEnvelope);
          },
        }),
      );
    }

    await deps.workerRunLifecycleCoordinator.replaceEventForwarder({
      teamRunId: envelope.teamRunId,
      runVersion: envelope.runVersion,
      runtimeTeamId,
      eventStream: deps.teamRunManager.getTeamEventStream(runtimeTeamId),
    });
  };
};
