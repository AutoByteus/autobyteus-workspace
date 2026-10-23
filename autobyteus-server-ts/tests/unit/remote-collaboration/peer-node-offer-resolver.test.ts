import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteCollaborationSettingsResolver } from "../../../src/api/graphql/types/remote-collaboration-settings.js";
import {
  bindProcessRemoteCollaboration,
  releaseProcessRemoteCollaboration,
  type RemoteCollaborationServices,
} from "../../../src/remote-collaboration/remote-collaboration-services.js";

/**
 * autobyteus-267 DS-001: `peerNodeOffer(nodeId)` answers through `RemoteNodeDiscovery.listAvailableAgentsOf` (the agent
 * tools' path) and maps it for the window: entries without an address, `description` null when absent, or the
 * refusal code alone. Exactly one of the two is set.
 */

let bound: RemoteCollaborationServices | null = null;
afterEach(() => { if (bound) releaseProcessRemoteCollaboration(bound); bound = null; });

const withDiscovery = (listAvailableAgentsOf: (nodeId: string) => Promise<unknown>) => {
  bound = { discovery: { listAvailableAgentsOf: vi.fn(listAvailableAgentsOf) } } as unknown as RemoteCollaborationServices;
  bindProcessRemoteCollaboration(bound);
  return bound.discovery.listAvailableAgentsOf as unknown as ReturnType<typeof vi.fn>;
};

describe("peerNodeOffer", () => {
  it("maps an accepted offer to entries: name, kind, description or null; no address", async () => {
    const asked = withDiscovery(async () => [
      { name: "Publisher", kind: "agent", address: "/publisher" },
      { name: "Studio Team", kind: "agent_team", address: "/studio_team", description: "Writes and checks articles" },
    ]);
    await expect(new RemoteCollaborationSettingsResolver().peerNodeOffer("srv_beta")).resolves.toEqual({
      entries: [
        { name: "Publisher", kind: "agent", description: null },
        { name: "Studio Team", kind: "agent_team", description: "Writes and checks articles" },
      ],
      refusalCode: null,
    });
    expect(asked).toHaveBeenCalledExactlyOnceWith("srv_beta");
  });

  it("maps a refusal to its code only (the window words the reason), and an empty offer to no entries", async () => {
    withDiscovery(async () => ({ accepted: false, code: "PEER_NOT_REGISTERED", message: "agent-facing text stays on the server" }));
    await expect(new RemoteCollaborationSettingsResolver().peerNodeOffer("srv_gamma")).resolves.toEqual({ entries: null, refusalCode: "PEER_NOT_REGISTERED" });
    releaseProcessRemoteCollaboration(bound!);
    withDiscovery(async () => []);
    await expect(new RemoteCollaborationSettingsResolver().peerNodeOffer("srv_delta")).resolves.toEqual({ entries: [], refusalCode: null });
  });
});
