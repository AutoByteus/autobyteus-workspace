import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { DependencyHydrationService } from "../dependency-hydration/dependency-hydration-service.js";
import { EnvelopeBuilder } from "../envelope/envelope-builder.js";
import { projectRemoteExecutionEventsFromTeamEvent } from "../event-aggregation/remote-event-projection.js";
import {
  TeamCommandIngressError,
  TeamCommandIngressService,
} from "../ingress/team-command-ingress-service.js";
import { TeamRunLocator } from "../ingress/team-run-locator.js";
import { WorkerNodeBridgeServer } from "../node-bridge/worker-node-bridge-server.js";
import { RunDegradationPolicy } from "../policies/run-degradation-policy.js";
import { RemoteEventIdempotencyPolicy } from "../policies/remote-event-idempotency-policy.js";
import { RunVersionFencingPolicy } from "../policies/run-version-fencing-policy.js";
import { ToolApprovalConcurrencyPolicy } from "../policies/tool-approval-concurrency-policy.js";
import { TeamRoutingPortAdapter } from "../routing/team-routing-port-adapter.js";
import { TeamRoutingPortAdapterRegistry } from "../routing/team-routing-port-adapter-registry.js";
import type { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";
import { type TransportSecurityMode } from "../security/internal-envelope-auth.js";
import { TeamRunOrchestrator } from "../team-run-orchestrator/team-run-orchestrator.js";
import {
  RemoteMemberExecutionGateway,
  type RemoteExecutionEvent,
} from "../worker-execution/remote-member-execution-gateway.js";
import {
  normalizeDistributedBaseUrl as normalizeDistributedBaseUrlFromPolicy,
  resolveRemoteTargetForEventUplink,
} from "../addressing/transport-address-policy.js";
import {
  emitAddressResolutionLog,
} from "./runtime-composition-helpers.js";
import {
  createDistributedRuntimeCoreDependencies,
  type DistributedRuntimeCoreDependencies,
} from "./distributed-runtime-core-dependencies.js";
import { createHostRuntimeRoutingDispatchers } from "./host-runtime-routing-dispatcher.js";
import { createRemoteEnvelopeCommandHandlers } from "./remote-envelope-command-handlers.js";
import { WorkerRunLifecycleCoordinator } from "./worker-run-lifecycle-coordinator.js";
import {
  resolveBootstrapBindingSnapshot,
  resolveBootstrapTeamDefinitionSnapshot,
  resolveHostRuntimeTeamByRunId,
  resolveHostTeamIdByRunId,
} from "./host-bootstrap-snapshot-resolver.js";
import {
  resolveBoundRuntimeTeamFromRegistries,
  resolveRuntimeTeamById,
  type TeamLike,
} from "./runtime-team-resolution.js";
import { createWorkerTeamDefinitionResolver } from "./worker-team-definition-reconciler.js";

export type DefaultDistributedRuntimeComposition = {
  hostNodeId: string;
  transportSecurityMode: TransportSecurityMode;
  nodeDirectoryService: DistributedRuntimeCoreDependencies["nodeDirectoryService"];
  internalEnvelopeAuth: DistributedRuntimeCoreDependencies["internalEnvelopeAuth"];
  hostDistributedCommandClient: DistributedRuntimeCoreDependencies["hostDistributedCommandClient"];
  workerEventUplinkClient: DistributedRuntimeCoreDependencies["workerEventUplinkClient"];
  hostNodeBridgeClient: DistributedRuntimeCoreDependencies["hostNodeBridgeClient"];
  workerNodeBridgeServer: WorkerNodeBridgeServer;
  teamRunOrchestrator: TeamRunOrchestrator;
  teamRunLocator: TeamRunLocator;
  teamCommandIngressService: TeamCommandIngressService;
  teamEventAggregator: DistributedRuntimeCoreDependencies["teamEventAggregator"];
  remoteEventIdempotencyPolicy: RemoteEventIdempotencyPolicy;
  runVersionFencingPolicy: RunVersionFencingPolicy;
  runScopedTeamBindingRegistry: RunScopedTeamBindingRegistry;
};

export const normalizeDistributedBaseUrl = normalizeDistributedBaseUrlFromPolicy;

export const ensureNodeDirectoryEntryForHostUplink = (input: {
  localNodeId: string;
  targetHostNodeId: string;
  nodeDirectoryService: DistributedRuntimeCoreDependencies["nodeDirectoryService"];
  distributedUplinkBaseUrl?: string | null;
  discoveryRegistryUrl?: string | null;
}): boolean => {
  const outcome = resolveRemoteTargetForEventUplink({
    localNodeId: input.localNodeId,
    targetNodeId: input.targetHostNodeId,
    nodeDirectoryService: input.nodeDirectoryService,
    distributedUplinkBaseUrl: input.distributedUplinkBaseUrl,
    discoveryRegistryUrl: input.discoveryRegistryUrl,
  });
  return outcome.resolved;
};

export const createDistributedRuntimeComposition = (): DefaultDistributedRuntimeComposition => {
  const teamRunManager = AgentTeamRunManager.getInstance();
  const teamDefinitionService = AgentTeamDefinitionService.getInstance();
  const envelopeBuilder = new EnvelopeBuilder();

  const {
    hostNodeId,
    transportSecurityMode,
    nodeDirectoryService,
    internalEnvelopeAuth,
    hostDistributedCommandClient,
    workerEventUplinkClient,
    hostNodeBridgeClient,
    runScopedTeamBindingRegistry,
    teamEventAggregator,
    workerTeamDefinitionIdByHostTeamDefinitionId,
  } = createDistributedRuntimeCoreDependencies();

  let teamRunLocator: TeamRunLocator | null = null;

  const ensureHostNodeDirectoryEntryForWorkerRun = (targetHostNodeId: string): void => {
    const outcome = resolveRemoteTargetForEventUplink({
      localNodeId: hostNodeId,
      targetNodeId: targetHostNodeId,
      nodeDirectoryService,
      distributedUplinkBaseUrl: process.env.AUTOBYTEUS_DISTRIBUTED_UPLINK_BASE_URL ?? "",
      discoveryRegistryUrl: process.env.AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL ?? "",
    });
    emitAddressResolutionLog({
      operation: "event_uplink",
      outcome,
    });
  };

  const resolveHostRuntimeTeam = (teamRunId: string): TeamLike =>
    resolveHostRuntimeTeamByRunId({
      teamRunId,
      teamRunLocator,
      resolveTeamById: (teamId) =>
        resolveRuntimeTeamById({
          teamId,
          teamRunManager,
        }),
    }) as TeamLike;

  const resolveBoundRuntimeTeam = (input: {
    teamRunId: string;
  }): {
    team: TeamLike;
    teamDefinitionId: string;
  } =>
    resolveBoundRuntimeTeamFromRegistries({
      teamRunId: input.teamRunId,
      runScopedTeamBindingRegistry,
      teamRunOrchestrator,
      resolveTeamById: (teamId) => resolveRuntimeTeamById({ teamId, teamRunManager }),
      resolveTeamByRunId: (teamRunId) => resolveHostRuntimeTeam(teamRunId),
    });

  const resolveWorkerTeamDefinitionId = createWorkerTeamDefinitionResolver({
    teamDefinitionService,
    workerTeamDefinitionIdByHostTeamDefinitionId,
  });

  const dispatchRemoteBootstrapEnvelope = async (input: {
    targetNodeId: string;
    teamId: string;
    teamRunId: string;
    runVersion: string | number;
    teamDefinitionId: string;
    hostNodeId: string;
  }): Promise<void> => {
    const memberBindings = resolveBootstrapBindingSnapshot({
      teamRunId: input.teamRunId,
      teamDefinitionId: input.teamDefinitionId,
      teamRunLocator,
      teamRunManager,
    });
    const teamDefinitionSnapshot = await resolveBootstrapTeamDefinitionSnapshot({
      teamDefinitionId: input.teamDefinitionId,
      teamDefinitionService,
    });
    await hostNodeBridgeClient.sendCommand(
      input.targetNodeId,
      envelopeBuilder.buildEnvelope({
        teamRunId: input.teamRunId,
        runVersion: input.runVersion,
        kind: "RUN_BOOTSTRAP",
        payload: {
          teamId: input.teamId,
          teamDefinitionId: input.teamDefinitionId,
          teamDefinitionSnapshot,
          memberBindings,
          hostNodeId: input.hostNodeId,
        },
      }),
    );
  };

  let workerRunLifecycleCoordinator: WorkerRunLifecycleCoordinator;

  const publishRemoteExecutionEventToHost = async (event: RemoteExecutionEvent): Promise<void> => {
    const targetHostNodeId = workerRunLifecycleCoordinator.resolveHostNodeId(event.teamRunId, hostNodeId);
    const ensured = ensureNodeDirectoryEntryForHostUplink({
      localNodeId: hostNodeId,
      targetHostNodeId,
      nodeDirectoryService,
      distributedUplinkBaseUrl: process.env.AUTOBYTEUS_DISTRIBUTED_UPLINK_BASE_URL ?? "",
      discoveryRegistryUrl: process.env.AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL ?? "",
    });
    if (!ensured) {
      throw new Error(`Address resolution failed for worker event uplink target '${targetHostNodeId}'.`);
    }
    await workerEventUplinkClient.publishRemoteEvent(event, targetHostNodeId);
  };

  workerRunLifecycleCoordinator = new WorkerRunLifecycleCoordinator({
    sourceNodeId: hostNodeId,
    projectRemoteExecutionEventsFromTeamEvent,
    publishRemoteExecutionEventToHost,
  });

  const remoteEnvelopeCommandHandlers = createRemoteEnvelopeCommandHandlers({
    hostNodeId,
    selfNodeId: hostNodeId,
    teamRunManager,
    runScopedTeamBindingRegistry,
    teamEventAggregator,
    hostNodeBridgeClient,
    workerRunLifecycleCoordinator,
    resolveWorkerTeamDefinitionId,
    resolveBoundRuntimeTeam,
    ensureHostNodeDirectoryEntryForWorkerRun,
    onTeamDispatchUnavailable: (code, message) => new TeamCommandIngressError(code, message),
  });

  const remoteMemberExecutionGateway = new RemoteMemberExecutionGateway({
    ...remoteEnvelopeCommandHandlers,
    publishEventToHost: publishRemoteExecutionEventToHost,
  });

  const workerNodeBridgeServer = new WorkerNodeBridgeServer(async (envelope) => {
    await remoteMemberExecutionGateway.dispatchEnvelope(envelope);
  });

  const teamRunOrchestrator = new TeamRunOrchestrator({
    dependencyHydrationService: new DependencyHydrationService(),
    routingRegistry: new TeamRoutingPortAdapterRegistry(),
    runDegradationPolicy: new RunDegradationPolicy(),
    createRoutingAdapter: ({
      teamRunId,
      teamDefinitionId,
      runVersion,
      hostNodeId: runHostNodeId,
      placementByMember,
    }) =>
      new TeamRoutingPortAdapter({
        teamRunId,
        runVersion,
        localNodeId: runHostNodeId,
        placementByMember,
        dispatchRemoteEnvelope: async (targetNodeId, envelope) => {
          await hostNodeBridgeClient.sendCommand(targetNodeId, envelope);
        },
        ensureRemoteNodeReady: async (targetNodeId) => {
          await dispatchRemoteBootstrapEnvelope({
            targetNodeId,
            teamId: resolveHostTeamIdByRunId({ teamRunId, teamRunLocator }),
            teamRunId,
            runVersion,
            teamDefinitionId,
            hostNodeId: runHostNodeId,
          });
        },
        ...createHostRuntimeRoutingDispatchers({
          teamRunId,
          resolveHostRuntimeTeam,
        }),
      }),
  });

  const bindHostRuntimeRoutingPortForRun = (teamRunId: string): void => {
    const runRecord = teamRunOrchestrator.getRunRecord(teamRunId);
    if (!runRecord || runRecord.status === "stopped") {
      return;
    }

    const routingPort = teamRunOrchestrator.resolveRoutingPort(teamRunId);
    if (!routingPort) {
      return;
    }

    let team: TeamLike;
    try {
      team = resolveHostRuntimeTeam(teamRunId);
    } catch {
      return;
    }

    const teamManager = team.runtime?.context?.teamManager;
    if (teamManager && typeof teamManager.setTeamRoutingPort === "function") {
      teamManager.setTeamRoutingPort(routingPort);
    }
  };

  const defaultTeamRunLocator = new TeamRunLocator({
    teamRunOrchestrator,
    teamDefinitionService,
    teamRunManager,
    hostNodeId,
    defaultNodeId: hostNodeId,
    nodeSnapshotProvider: () => nodeDirectoryService.listPlacementCandidates(),
    onRunResolved: (record) => {
      bindHostRuntimeRoutingPortForRun(record.teamRunId);
    },
  });
  teamRunLocator = defaultTeamRunLocator;

  const teamCommandIngressService = new TeamCommandIngressService({
    teamRunLocator: defaultTeamRunLocator,
    teamRunOrchestrator,
    toolApprovalConcurrencyPolicy: new ToolApprovalConcurrencyPolicy(),
  });

  const remoteEventIdempotencyPolicy = new RemoteEventIdempotencyPolicy();
  const runVersionFencingPolicy = new RunVersionFencingPolicy(async (teamRunId) =>
    teamRunOrchestrator.resolveCurrentRunVersion(teamRunId),
  );

  return {
    hostNodeId,
    transportSecurityMode,
    nodeDirectoryService,
    internalEnvelopeAuth,
    hostDistributedCommandClient,
    workerEventUplinkClient,
    hostNodeBridgeClient,
    workerNodeBridgeServer,
    teamRunOrchestrator,
    teamRunLocator: defaultTeamRunLocator,
    teamCommandIngressService,
    teamEventAggregator,
    remoteEventIdempotencyPolicy,
    runVersionFencingPolicy,
    runScopedTeamBindingRegistry,
  };
};
