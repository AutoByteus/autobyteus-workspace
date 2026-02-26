import { NodeDirectoryService } from "../../distributed/node-directory/node-directory-service.js";
import {
  createDiscoveryAdmissionPolicy,
  type DiscoveryAdmissionPolicy,
} from "../admission/discovery-admission-policy.js";
import {
  resolveDiscoveryAdmissionMode,
  type DiscoveryAdmissionMode,
} from "../config/discovery-admission-mode.js";
import {
  resolveDiscoveryRoleConfig,
  type DiscoveryRoleConfig,
} from "../config/discovery-role-config.js";
import { DiscoveryNodeDirectoryBridge } from "../integration/discovery-node-directory-bridge.js";
import { DiscoveryRegistryClientService } from "../services/discovery-registry-client-service.js";
import {
  getNodeIdentityService,
  resetNodeIdentityServiceForTests,
  type NodeSelfIdentity,
} from "../services/node-identity-service.js";
import { NodeDiscoveryRegistryService } from "../services/node-discovery-registry-service.js";

export type DiscoveryRuntimeContext = {
  roleConfig: DiscoveryRoleConfig;
  admissionMode: DiscoveryAdmissionMode;
  admissionPolicy: DiscoveryAdmissionPolicy;
  selfIdentity: NodeSelfIdentity;
  registryService: NodeDiscoveryRegistryService;
  registryClientService: DiscoveryRegistryClientService | null;
  nodeDirectoryBridge: DiscoveryNodeDirectoryBridge | null;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseInterval = (raw: string | null | undefined, fallback: number): number => {
  const normalized = normalizeOptionalString(raw);
  if (!normalized) {
    return fallback;
  }
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

let runtimeContext: DiscoveryRuntimeContext | null = null;
let runtimeStarted = false;

export const initializeDiscoveryRuntime = (): DiscoveryRuntimeContext => {
  if (runtimeContext) {
    return runtimeContext;
  }

  const roleConfig = resolveDiscoveryRoleConfig(process.env);
  const admissionMode = resolveDiscoveryAdmissionMode(process.env);
  const admissionPolicy = createDiscoveryAdmissionPolicy(admissionMode);
  const selfIdentity = getNodeIdentityService().resolveSelfIdentity();

  process.env.AUTOBYTEUS_NODE_ID ??= selfIdentity.nodeId;
  process.env.AUTOBYTEUS_NODE_NAME ??= selfIdentity.nodeName;

  const ttlMs = parseInterval(process.env.AUTOBYTEUS_NODE_DISCOVERY_TTL_MS, 120_000);
  const degradedAfterMs = parseInterval(
    process.env.AUTOBYTEUS_NODE_DISCOVERY_DEGRADED_AFTER_MS,
    20_000,
  );
  const unreachableAfterMs = parseInterval(
    process.env.AUTOBYTEUS_NODE_DISCOVERY_UNREACHABLE_AFTER_MS,
    45_000,
  );

  const registryService = new NodeDiscoveryRegistryService({
    ttlMs,
    degradedAfterMs,
    unreachableAfterMs,
    protectedNodeIds: [selfIdentity.nodeId],
  });

  registryService.announce({
    nodeId: selfIdentity.nodeId,
    nodeName: selfIdentity.nodeName,
    baseUrl: selfIdentity.baseUrl,
    trustMode: "lan_open",
  });

  const registryClientService =
    roleConfig.discoveryEnabled && roleConfig.role === "client" && roleConfig.registryUrl
      ? new DiscoveryRegistryClientService({
          selfIdentity,
          registryService,
          registryUrl: roleConfig.registryUrl,
          heartbeatIntervalMs: parseInterval(
            process.env.AUTOBYTEUS_NODE_DISCOVERY_HEARTBEAT_INTERVAL_MS,
            5_000,
          ),
          syncIntervalMs: parseInterval(process.env.AUTOBYTEUS_NODE_DISCOVERY_SYNC_INTERVAL_MS, 8_000),
        })
      : null;

  runtimeContext = {
    roleConfig,
    admissionMode,
    admissionPolicy,
    selfIdentity,
    registryService,
    registryClientService,
    nodeDirectoryBridge: null,
  };

  return runtimeContext;
};

export const getDiscoveryRuntime = (): DiscoveryRuntimeContext => {
  return runtimeContext ?? initializeDiscoveryRuntime();
};

export const attachDiscoveryNodeDirectoryBridge = (nodeDirectoryService: NodeDirectoryService): void => {
  const runtime = getDiscoveryRuntime();
  if (!runtime.roleConfig.discoveryEnabled) {
    return;
  }

  if (!runtime.nodeDirectoryBridge) {
    runtime.nodeDirectoryBridge = new DiscoveryNodeDirectoryBridge({
      hostNodeId: runtime.selfIdentity.nodeId,
      nodeDirectoryService,
      discoveryRegistryService: runtime.registryService,
    });
  }

  runtime.nodeDirectoryBridge.start();
};

export const startDiscoveryRuntime = async (): Promise<void> => {
  const runtime = getDiscoveryRuntime();
  if (!runtime.roleConfig.discoveryEnabled || runtimeStarted) {
    return;
  }

  runtimeStarted = true;

  if (runtime.roleConfig.role === "registry") {
    runtime.registryService.startMaintenanceTicker(
      parseInterval(process.env.AUTOBYTEUS_NODE_DISCOVERY_MAINTENANCE_INTERVAL_MS, 5_000),
    );
    return;
  }

  if (runtime.registryClientService) {
    await runtime.registryClientService.start();
  }
};

export const stopDiscoveryRuntime = (): void => {
  const runtime = getDiscoveryRuntime();
  runtime.registryClientService?.stop();
  runtime.registryService.stopMaintenanceTicker();
  runtime.nodeDirectoryBridge?.stop();
  runtimeStarted = false;
};

export const resetDiscoveryRuntimeForTests = (): void => {
  if (runtimeContext) {
    runtimeContext.registryClientService?.stop();
    runtimeContext.registryService.stopMaintenanceTicker();
    runtimeContext.nodeDirectoryBridge?.stop();
  }
  runtimeContext = null;
  runtimeStarted = false;
  resetNodeIdentityServiceForTests();
};
