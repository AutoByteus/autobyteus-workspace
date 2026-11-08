import { NodeAccessGate } from "../api/security/node-access-gate.js";
import { getNodeBrowserAccess } from "../api/security/node-browser-access.js";
import { OpenSocketRegistry } from "../api/security/open-socket-registry.js";
import { McpGatewayAccessGate } from "../mcp-gateway/mcp-gateway-access.js";
import { McpGatewayTokenService } from "../mcp-gateway/mcp-gateway-token-service.js";
import { getMemoryHubCredentialService } from "../memory-sync/hub/memory-hub-credential-service.js";
import { launchCredential } from "../node-access/launch-credential-intake.js";
import { LocalControlSocket } from "../node-access/services/local-control-socket.js";
import { NetworkAdmission } from "../node-access/services/network-admission.js";
import { NodeCredentialResolver } from "../node-access/services/node-credential-resolver.js";
import { OwnerCredentialService } from "../node-access/services/owner-credential-service.js";
import { SetupCodeService } from "../node-access/services/setup-code-service.js";
import { OwnerCredentialStore } from "../node-access/stores/owner-credential-store.js";
import { getNodeNetworkService } from "../remote-access/services/node-network-service.js";
import { PhoneCredentialVerifier } from "../remote-access/services/phone-credential-verifier.js";
import type { RemoteCollaborationServices } from "../remote-collaboration/remote-collaboration-services.js";

export type NodeAccess = Readonly<{
  gate: NodeAccessGate;
  ownerCredentials: OwnerCredentialService;
  setupCodes: SetupCodeService;
  mcpGatewayTokens: McpGatewayTokenService;
  mcpGatewayAccess: McpGatewayAccessGate;
  /** Opens the local control socket and starts the admission refresh. */
  start(): Promise<void>;
  close(): Promise<void>;
}>;

/**
 * Builds the node's access model (node access model §2, design DS-001): the credential verifier of each area (owner,
 * phone, memory sync source, peer) behind one resolver, network admission, the gate with its open-socket registry
 * subscribed to every area's revocations, setup codes with the local control socket, and the MCP gateway's token.
 */
export const composeNodeAccess = (input: Readonly<{
  appDataDir: string;
  remoteCollaboration: Pick<RemoteCollaborationServices, "peers" | "peerRequestVerifier">;
}>): NodeAccess => {
  const config = { getAppDataDir: () => input.appDataDir };
  const ownerCredentials = new OwnerCredentialService(new OwnerCredentialStore(config), launchCredential());
  const phoneCredentials = new PhoneCredentialVerifier();
  const memorySyncSourceCredentials = getMemoryHubCredentialService();
  const admission = new NetworkAdmission(getNodeNetworkService(), getNodeBrowserAccess().allowedClientNetworks);
  const resolver = new NodeCredentialResolver(
    [ownerCredentials, phoneCredentials, memorySyncSourceCredentials],
    input.remoteCollaboration.peerRequestVerifier,
  );
  const gate = new NodeAccessGate(admission, resolver, new OpenSocketRegistry(), [
    ownerCredentials,
    phoneCredentials,
    memorySyncSourceCredentials,
    input.remoteCollaboration.peers,
  ]);
  const setupCodes = new SetupCodeService(ownerCredentials);
  const localControlSocket = new LocalControlSocket(input.appDataDir, setupCodes);
  const mcpGatewayTokens = new McpGatewayTokenService(config);
  return Object.freeze({
    gate,
    ownerCredentials,
    setupCodes,
    mcpGatewayTokens,
    mcpGatewayAccess: new McpGatewayAccessGate(admission, mcpGatewayTokens),
    start: async () => {
      admission.start();
      await localControlSocket.start();
    },
    close: async () => {
      admission.stop();
      await localControlSocket.close();
    },
  });
};
