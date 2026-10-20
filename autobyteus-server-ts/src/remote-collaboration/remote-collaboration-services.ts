import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import type { RunModelSelectionValidator } from "../llm-management/services/run-model-selection-service.js";
import type { RuntimeAvailabilityService } from "../runtime-management/runtime-availability-service.js";
import type { ServerSettingsService } from "../services/server-settings-service.js";
import { PeerClient } from "./channel/peer-client.js";
import { PeerGateway, type DelegatedRunHandler, type RemoteMessageHandler } from "./channel/peer-gateway.js";
import { PeerDirectory } from "./settings/peer-directory.js";
import { PeerStore } from "./settings/peer-store.js";
import { PublishedAgentService } from "./settings/published-agent-service.js";
import { PublishedAgentStore } from "./settings/published-agent-store.js";
import { PublishedLaunchCheck } from "./settings/published-launch-check.js";
import { RemoteCollaborationCapability } from "./settings/remote-collaboration-capability.js";
import type { AppDataDirSource } from "./settings/settings-file-schema.js";

/** One node's remote collaboration: settings, the outbound client and the inbound gateway (DS-004, DS-005). */
export type RemoteCollaborationServices = Readonly<{
  capability: RemoteCollaborationCapability;
  peers: PeerDirectory;
  published: PublishedAgentService;
  launchCheck: PublishedLaunchCheck;
  client: PeerClient;
  gateway: PeerGateway;
}>;

/**
 * Builds the subsystem around the process's run services. The inbound handlers are given as factories over the
 * settings, because receiving a delegation needs the published Agents and receiving a message needs the peers.
 */
export const composeRemoteCollaboration = (input: Readonly<{
  config: AppDataDirSource;
  settings: Pick<ServerSettingsService, "getBooleanSetting" | "setBooleanSetting">;
  ownNodeId(): Promise<string>;
  definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  availability: Pick<RuntimeAvailabilityService, "getRuntimeAvailability">;
  validator: Pick<RunModelSelectionValidator, "validate">;
  handlers(services: Omit<RemoteCollaborationServices, "gateway">): Readonly<{ delegatedRuns: DelegatedRunHandler; messages: RemoteMessageHandler }>;
}>): RemoteCollaborationServices => {
  const capability = new RemoteCollaborationCapability(input.settings);
  const store = new PeerStore(input.config);
  let peers: PeerDirectory;
  const client = new PeerClient({
    peers: { findByName: (name) => peers.findByName(name), findByNodeId: (nodeId) => peers.findByNodeId(nodeId) },
    capability,
    ownNodeId: input.ownNodeId,
  });
  peers = new PeerDirectory({ store, probe: client, capability, ownNodeId: input.ownNodeId });
  const launchCheck = new PublishedLaunchCheck({ availability: input.availability, validator: input.validator });
  const published = new PublishedAgentService({ store: new PublishedAgentStore(input.config), definitions: input.definitions, launchCheck });
  const services = { capability, peers, published, launchCheck, client };
  const handlers = input.handlers(services);
  const gateway = new PeerGateway({ ownNodeId: input.ownNodeId, capability, peers, delegatedRuns: handlers.delegatedRuns, messages: handlers.messages });
  return Object.freeze({ ...services, gateway });
};

let processServices: RemoteCollaborationServices | null = null;

export const bindProcessRemoteCollaboration = (services: RemoteCollaborationServices): void => {
  if (!services) throw new Error("Process remote collaboration services are required.");
  if (processServices) throw new Error("The process remote collaboration services are already initialized.");
  processServices = services;
};

export const releaseProcessRemoteCollaboration = (services: RemoteCollaborationServices): void => {
  if (processServices === services) processServices = null;
};

/** The process's remote collaboration (API edge); `null` where it is not composed. */
export const findProcessRemoteCollaboration = (): RemoteCollaborationServices | null => processServices;

export const getProcessRemoteCollaboration = (): RemoteCollaborationServices => {
  if (!processServices) throw new Error("Remote collaboration is not available on this server.");
  return processServices;
};
