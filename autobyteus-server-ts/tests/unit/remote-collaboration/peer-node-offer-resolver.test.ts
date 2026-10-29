import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteCollaborationSettingsResolver } from "../../../src/api/graphql/types/remote-collaboration-settings.js";
import {
  bindProcessRemoteCollaboration,
  releaseProcessRemoteCollaboration,
  type RemoteCollaborationServices,
} from "../../../src/remote-collaboration/remote-collaboration-services.js";
import { RemoteCollaborationSettingsError } from "../../../src/remote-collaboration/domain/remote-collaboration-settings-error.js";

/**
 * autobyteus-267 DS-001: `peerNodeOffer(nodeId)` answers through `PeerNodeDiscovery.listAvailableAgentsOf` (the agent
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
      unreachableReason: null,
    });
    expect(asked).toHaveBeenCalledExactlyOnceWith("srv_beta");
  });

  it("maps a refusal to its code only (the window words the reason), and an empty offer to no entries", async () => {
    withDiscovery(async () => ({ accepted: false, code: "PEER_NOT_REGISTERED", message: "agent-facing text stays on the server" }));
    await expect(new RemoteCollaborationSettingsResolver().peerNodeOffer("srv_gamma")).resolves.toEqual({ entries: null, refusalCode: "PEER_NOT_REGISTERED", unreachableReason: null });
    releaseProcessRemoteCollaboration(bound!);
    withDiscovery(async () => []);
    await expect(new RemoteCollaborationSettingsResolver().peerNodeOffer("srv_delta")).resolves.toEqual({ entries: [], refusalCode: null, unreachableReason: null });
  });

  it("one-nodes-tab REQ-707: an unreachable peer's offer carries the classified reason", async () => {
    withDiscovery(async () => ({ accepted: false, code: "PEER_UNREACHABLE", reason: "timeout", message: "agent text" }));
    await expect(new RemoteCollaborationSettingsResolver().peerNodeOffer("srv_beta")).resolves.toEqual({
      entries: null, refusalCode: "PEER_UNREACHABLE", unreachableReason: "timeout" });
  });
});

/** one-nodes-tab DS-003/DS-004/DS-005: what a window needs on each node to connect two nodes. */
describe("one-nodes-tab settings operations", () => {
  const bindWith = (services: Record<string, unknown>) => {
    bound = services as unknown as RemoteCollaborationServices;
    bindProcessRemoteCollaboration(bound);
  };

  it("peerNodeAvailability answers whether a peer admits this node now, or its refusal and reason", async () => {
    const checkAvailabilityOf = vi.fn(async (nodeId: string) => nodeId === "srv_a"
      ? { accepted: true }
      : { accepted: false, code: "PEER_UNREACHABLE", reason: "not_found", message: "x" });
    bindWith({ discovery: { checkAvailabilityOf } });
    const resolver = new RemoteCollaborationSettingsResolver();
    await expect(resolver.peerNodeAvailability("srv_a")).resolves.toEqual({ available: true, refusalCode: null, unreachableReason: null });
    await expect(resolver.peerNodeAvailability("srv_b")).resolves.toEqual({ available: false, refusalCode: "PEER_UNREACHABLE", unreachableReason: "not_found" });
  });

  it("resolvePeerAddress and changePeerAddress go through their owners; a refusal carries its details as extensions", async () => {
    const resolve = vi.fn(async () => { throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", "no address", {
      address: "http://127.0.0.1:29695", reason: "refused", loopbackInContainer: true, attempts: [{ address: "http://127.0.0.1:29695", result: "refused" }] }); });
    const changeAddress = vi.fn(async (nodeId: string, baseUrl: string) => ({ nodeId, name: "docker", baseUrl, addedAt: "2026-10-20T09:00:00.000Z" }));
    bindWith({ addresses: { resolve }, peers: { changeAddress } });
    const resolver = new RemoteCollaborationSettingsResolver();
    const error = await resolver.resolvePeerAddress("srv_b", ["http://127.0.0.1:29695"]).catch((e) => e);
    expect(error).toMatchObject({ message: "no address", extensions: { code: "PEER_UNREACHABLE", address: "http://127.0.0.1:29695", reason: "refused",
      loopbackInContainer: true, attempts: [{ address: "http://127.0.0.1:29695", result: "refused" }] } });
    expect(resolve).toHaveBeenCalledWith("srv_b", ["http://127.0.0.1:29695"]);
    await expect(resolver.changePeerAddress("srv_b", "http://host.docker.internal:8001")).resolves.toMatchObject({ baseUrl: "http://host.docker.internal:8001" });
  });
});
