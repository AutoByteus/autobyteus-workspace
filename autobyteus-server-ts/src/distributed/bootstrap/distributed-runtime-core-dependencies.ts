import { TeamEventAggregator } from "../event-aggregation/team-event-aggregator.js";
import { NodeDirectoryService } from "../node-directory/node-directory-service.js";
import { HostNodeBridgeClient } from "../node-bridge/host-node-bridge-client.js";
import { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";
import { InternalEnvelopeAuth, type TransportSecurityMode } from "../security/internal-envelope-auth.js";
import { HostDistributedCommandClient } from "../transport/internal-http/host-distributed-command-client.js";
import { WorkerEventUplinkClient } from "../transport/internal-http/worker-event-uplink-client.js";
import { resolveRemoteTargetForCommandDispatch } from "../addressing/transport-address-policy.js";
import {
  buildHostOnlyNodeDirectoryEntries,
  buildResolveSecretByKeyId,
  emitAddressResolutionLog,
  normalizeOptionalString,
  parseAllowedNodeIds,
  parseSecurityModeFromEnv,
} from "./runtime-composition-helpers.js";

export type DistributedRuntimeCoreDependencies = {
  hostNodeId: string;
  transportSecurityMode: TransportSecurityMode;
  nodeDirectoryService: NodeDirectoryService;
  internalEnvelopeAuth: InternalEnvelopeAuth;
  hostDistributedCommandClient: HostDistributedCommandClient;
  workerEventUplinkClient: WorkerEventUplinkClient;
  hostNodeBridgeClient: HostNodeBridgeClient;
  runScopedTeamBindingRegistry: RunScopedTeamBindingRegistry;
  teamEventAggregator: TeamEventAggregator;
  workerTeamDefinitionIdByHostTeamDefinitionId: Map<string, string>;
};

export const createDistributedRuntimeCoreDependencies =
  (): DistributedRuntimeCoreDependencies => {
    const hostNodeId = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID) ?? "node-local";
    const transportSecurityMode = parseSecurityModeFromEnv();

    const nodeDirectoryService = new NodeDirectoryService(
      buildHostOnlyNodeDirectoryEntries(hostNodeId),
      {
        protectedNodeIds: [hostNodeId],
      },
    );
    const internalEnvelopeAuth = new InternalEnvelopeAuth({
      localNodeId: hostNodeId,
      defaultKeyId: normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_KEY_ID) ?? "default",
      resolveSecretByKeyId: buildResolveSecretByKeyId(),
      allowedNodeIds: parseAllowedNodeIds(hostNodeId),
    });

    const hostDistributedCommandClient = new HostDistributedCommandClient({
      nodeDirectoryService,
      internalEnvelopeAuth,
      defaultSecurityMode: transportSecurityMode,
    });
    const workerEventUplinkClient = new WorkerEventUplinkClient({
      hostNodeId,
      nodeDirectoryService,
      internalEnvelopeAuth,
      defaultSecurityMode: transportSecurityMode,
    });

    const hostNodeBridgeClient = new HostNodeBridgeClient({
      sendEnvelopeToWorker: async (targetNodeId, envelope) => {
        const outcome = resolveRemoteTargetForCommandDispatch({
          targetNodeId,
          nodeDirectoryService,
        });
        emitAddressResolutionLog({
          operation: "command_dispatch",
          outcome,
        });
        await hostDistributedCommandClient.sendCommand(targetNodeId, envelope);
      },
    });

    return {
      hostNodeId,
      transportSecurityMode,
      nodeDirectoryService,
      internalEnvelopeAuth,
      hostDistributedCommandClient,
      workerEventUplinkClient,
      hostNodeBridgeClient,
      runScopedTeamBindingRegistry: new RunScopedTeamBindingRegistry(),
      teamEventAggregator: new TeamEventAggregator(),
      workerTeamDefinitionIdByHostTeamDefinitionId: new Map<string, string>(),
    };
  };
