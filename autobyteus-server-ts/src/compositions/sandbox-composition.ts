import { appConfigProvider } from "../config/app-config-provider.js";
import { getNodeIdentityService } from "../remote-access/services/node-identity-service.js";
import type { RemoteCollaborationServices } from "../remote-collaboration/remote-collaboration-services.js";
import { SandboxDocker } from "../sandboxes/sandbox-docker.js";
import { SandboxManager } from "../sandboxes/sandbox-manager.js";
import { SandboxPairing } from "../sandboxes/sandbox-pairing.js";
import { checkSandboxPlatform } from "../sandboxes/sandbox-platform.js";
import { bindProcessSandboxManager } from "../sandboxes/sandbox-process-binding.js";
import { SandboxRecordsStore } from "../sandboxes/sandbox-records-store.js";
import { sandboxImageFor } from "../sandboxes/sandbox-settings.js";

/** The test vault setting a sandbox folder may never contain (TESTING.md). */
const TEST_VAULT_SETTING = "AUTOBYTEUS_TEST_VAULT";

/**
 * autobyteus-581: the studio's sandboxes, composed after remote collaboration (a sandbox pairs as a peer) and bound
 * for the sandbox tools before the server serves. The start sweep runs in the background; the release unbinds the
 * tools and stops the expiry timers.
 */
export const composeSandboxes = (input: Readonly<{
  appDataDir: string;
  remote: Pick<RemoteCollaborationServices, "peers" | "pairing" | "discovery">;
  /** This node's relay offer for a new sandbox (the credential proxy's, DEC-109). */
  relayOffer: () => Promise<Readonly<Record<string, string>>>;
}>): Readonly<{ manager: SandboxManager; release: () => void }> => {
  const docker = new SandboxDocker();
  const read = (key: string) => appConfigProvider.config.get(key);
  const manager = new SandboxManager({
    docker,
    records: new SandboxRecordsStore(input.appDataDir),
    pairing: new SandboxPairing({
      docker, pairing: input.remote.pairing, discovery: input.remote.discovery,
      hostNodeId: () => getNodeIdentityService().getNodeId(),
    }),
    peers: input.remote.peers,
    checkPlatform: () => checkSandboxPlatform(docker),
    hostNodeId: () => getNodeIdentityService().getNodeId(),
    relayOffer: input.relayOffer,
    image: () => sandboxImageFor(read),
    appDataDir: input.appDataDir,
    testVault: read(TEST_VAULT_SETTING)?.trim() || null,
  });
  bindProcessSandboxManager(manager);
  void manager.sweepAtStart();
  return Object.freeze({
    manager,
    release: () => {
      manager.close();
      bindProcessSandboxManager(null);
    },
  });
};
