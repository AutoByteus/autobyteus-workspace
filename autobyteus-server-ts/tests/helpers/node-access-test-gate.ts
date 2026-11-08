import type { FastifyInstance } from "fastify";
import { NodeAccessGate } from "../../src/api/security/node-access-gate.js";
import { registerNodeAccessPlugin } from "../../src/api/security/node-access-plugin.js";
import { OpenSocketRegistry } from "../../src/api/security/open-socket-registry.js";
import type {
  BearerCredentialVerifier,
  ClientRevocationSource,
  PeerRequestVerifier,
} from "../../src/node-access/domain/credential-verification.js";
import type { NetworkAdmissionCheck } from "../../src/node-access/domain/network-admission-facts.js";
import { NodeCredentialResolver } from "../../src/node-access/services/node-credential-resolver.js";
import { OwnerCredentialService } from "../../src/node-access/services/owner-credential-service.js";
import type { OwnerCredentialStore } from "../../src/node-access/stores/owner-credential-store.js";
import { PeerRequestSignatureVerifier } from "../../src/remote-collaboration/channel/peer-request-signature.js";

/** An in-memory owner credential store: a test's owner credentials live only as long as the test. */
export const memoryOwnerCredentialStore = (): OwnerCredentialStore => {
  let rows: Parameters<OwnerCredentialStore["write"]>[0] = [];
  return {
    filePath: () => "memory",
    read: async () => [...rows],
    write: async (records: Parameters<OwnerCredentialStore["write"]>[0]) => { rows = [...records]; },
  } as unknown as OwnerCredentialStore;
};

export type TestNodeAccess = Readonly<{
  gate: NodeAccessGate;
  openSockets: OpenSocketRegistry;
  ownerCredentials: OwnerCredentialService;
}>;

/**
 * Registers the real node access plugin and gate on a test's Fastify app (node access model §2): the real resolver
 * with an owner credential service holding `launchCredential`, the real peer signature verifier over `peerSecrets`
 * (node ID → secret), and any further verifiers. Admission admits every connection unless the test gives one.
 */
export const registerTestNodeAccess = async (app: FastifyInstance, options: Readonly<{
  launchCredential?: string;
  ownNodeId?: string;
  peerSecrets?: Readonly<Record<string, string>>;
  verifiers?: readonly (BearerCredentialVerifier & Partial<ClientRevocationSource>)[];
  peerVerifier?: PeerRequestVerifier;
  admission?: NetworkAdmissionCheck;
  revocationSources?: readonly ClientRevocationSource[];
}> = {}): Promise<TestNodeAccess> => {
  const ownerCredentials = new OwnerCredentialService(memoryOwnerCredentialStore(), options.launchCredential ?? null);
  const peerVerifier = options.peerVerifier ?? new PeerRequestSignatureVerifier({
    ownNodeId: async () => options.ownNodeId ?? "srv_test_node",
    peerSecret: async (nodeId) => options.peerSecrets?.[nodeId] ?? null,
  });
  const resolver = new NodeCredentialResolver([ownerCredentials, ...(options.verifiers ?? [])], peerVerifier);
  const openSockets = new OpenSocketRegistry();
  const gate = new NodeAccessGate(
    options.admission ?? { admits: async () => true },
    resolver,
    openSockets,
    [ownerCredentials, ...(options.revocationSources ?? [])],
  );
  await registerNodeAccessPlugin(app, gate);
  return Object.freeze({ gate, openSockets, ownerCredentials });
};
