import { testExtensionManager } from "../../helpers/test-extension-manager.js";
import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteCollaborationSettingsResolver } from "../../../src/api/graphql/types/remote-collaboration-settings.js";
import { RemoteCollaborationSettingsError } from "../../../src/remote-collaboration/domain/remote-collaboration-settings-error.js";
import {
  bindProcessRemoteCollaboration,
  releaseProcessRemoteCollaboration,
  type RemoteCollaborationServices,
} from "../../../src/remote-collaboration/remote-collaboration-services.js";

/**
 * autobyteus-661 contract §3: the pairing API of the Nodes tab. Every change is an owner action (NA-7, NAS-08); a
 * Pair outcome is `paired` with the peer or `waiting` with this node's request ID; a refusal is a GraphQL error with
 * the settings code and its details.
 */

let bound: RemoteCollaborationServices | null = null;
afterEach(() => { if (bound) releaseProcessRemoteCollaboration(bound); bound = null; });

const context = (kind: "owner" | "phone") => ({
  extensions: testExtensionManager(), requestAbortSignal: new AbortController().signal,
  clientIdentity: kind === "owner" ? { kind: "owner" as const, credentialId: "launch" } : { kind: "phone" as const, deviceId: "phone-1" },
}) as never;
const PEER = { nodeId: "srv_b", name: "docker", address: "http://localhost:8001", machine: null, account: null, relation: "own" as const,
  sandbox: false, addedAt: "2026-11-27T09:00:00.000Z", paired: true };

const withPairing = (pairing: Record<string, unknown>) => {
  bound = { pairing } as unknown as RemoteCollaborationServices;
  bindProcessRemoteCollaboration(bound);
};

describe("pairing GraphQL (autobyteus-661)", () => {
  it("NAS-08 every pairing change and the request lists are refused to a phone", async () => {
    withPairing({ createGrant: vi.fn(), pair: vi.fn(), accept: vi.fn(), reject: vi.fn(), cancel: vi.fn(), unpair: vi.fn(),
      pendingRequests: vi.fn(() => []), outstandingRequests: vi.fn(() => []) });
    const resolver = new RemoteCollaborationSettingsResolver();
    const phone = context("phone");
    const refused = { extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } };
    expect(() => resolver.createPairingGrant("own", "srv_a", null, null, phone)).toThrow(expect.objectContaining(refused));
    await expect(Promise.resolve().then(() => resolver.pairWithNode("http://x", null, null, null, null, null, phone))).rejects.toMatchObject(refused);
    await expect(Promise.resolve().then(() => resolver.acceptPairRequest("id", null, phone))).rejects.toMatchObject(refused);
    await expect(Promise.resolve().then(() => resolver.rejectPairRequest("id", phone))).rejects.toMatchObject(refused);
    expect(() => resolver.cancelPairRequest("r", phone)).toThrow(expect.objectContaining(refused));
    await expect(Promise.resolve().then(() => resolver.unpairPeerNode("srv_b", phone))).rejects.toMatchObject(refused);
    expect(() => resolver.pendingPairRequests(phone)).toThrow(expect.objectContaining(refused));
    expect(() => resolver.outstandingPairRequests(phone)).toThrow(expect.objectContaining(refused));
  });

  it("a grant for a known relation only; Pair answers paired with the peer, or waiting with the request ID", async () => {
    const pair = vi.fn()
      .mockResolvedValueOnce({ state: "paired", peer: PEER })
      .mockResolvedValueOnce({ state: "waiting", requestId: "req-1" });
    const createGrant = vi.fn(() => ({ grant: "g", expiresAt: "2026-11-27T09:10:00.000Z", addresses: ["http://192.168.1.10:29695"] }));
    withPairing({ pair, createGrant });
    const resolver = new RemoteCollaborationSettingsResolver();
    const owner = context("owner");
    expect(resolver.createPairingGrant("own", "srv_a", null, "host", owner)).toEqual({ grant: "g", expiresAt: "2026-11-27T09:10:00.000Z",
      addresses: ["http://192.168.1.10:29695"] });
    expect(createGrant).toHaveBeenCalledWith({ relation: "own", forNodeId: "srv_a", forMachine: null, nameForAsker: "host" });
    expect(() => resolver.createPairingGrant("admin", "srv_a", null, null, owner)).toThrow(expect.objectContaining({ extensions: { code: "BAD_USER_INPUT" } }));
    await expect(resolver.pairWithNode("http://localhost:8001", ["http://192.168.1.10:8001"], "g", "srv_b", "docker", null, owner)).resolves.toEqual({ state: "paired", peer: PEER, requestId: null });
    expect(pair).toHaveBeenCalledWith({ address: "http://localhost:8001", addresses: ["http://192.168.1.10:8001"], grant: "g", nodeId: "srv_b", name: "docker", machine: null });
    await expect(resolver.pairWithNode("http://192.168.1.20:8000", null, null, null, null, null, owner)).resolves.toEqual({ state: "waiting", peer: null, requestId: "req-1" });
  });

  it("a refused pair is a GraphQL error with the settings code and details", async () => {
    withPairing({ pair: vi.fn(async () => { throw new RemoteCollaborationSettingsError("PEER_HOST_REFUSED", "refused", { address: "http://lvh.me:1", host: "lvh.me" }); }) });
    await expect(new RemoteCollaborationSettingsResolver().pairWithNode("http://lvh.me:1", null, null, null, null, null, context("owner")))
      .rejects.toMatchObject({ message: "refused", extensions: { code: "PEER_HOST_REFUSED", address: "http://lvh.me:1", host: "lvh.me" } });
  });
});
