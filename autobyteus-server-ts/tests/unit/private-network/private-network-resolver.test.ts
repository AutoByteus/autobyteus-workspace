import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateNetworkResolver } from "../../../src/api/graphql/types/private-network.js";
import { composePrivateNetwork, type PrivateNetwork } from "../../../src/compositions/private-network-composition.js";
import { testExtensionManager } from "../../helpers/test-extension-manager.js";

/** autobyteus-661: the visibility switches through GraphQL are owner actions (NA-7); a refusal keeps its code. */

let composed: PrivateNetwork | null = null;
let dataDir = "";
afterEach(async () => { await composed?.close(); composed = null; if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true }); vi.restoreAllMocks(); });

const context = (kind: "owner" | "phone") => ({
  extensions: testExtensionManager(), requestAbortSignal: new AbortController().signal,
  clientIdentity: kind === "owner" ? { kind: "owner" as const, credentialId: "launch" } : { kind: "phone" as const, deviceId: "phone-1" },
}) as never;

describe.skipIf(process.platform === "win32")("PrivateNetworkResolver", () => {
  it("NAS-08 a phone is refused; the owner reads and changes the switches, and the local one names why it cannot turn on", async () => {
    dataDir = fs.mkdtempSync(path.join("/tmp", "pnr-"));
    composed = await composePrivateNetwork({ dataDir, httpServer: () => http.createServer(), extensions: testExtensionManager() });
    const state = { privateNetwork: false, localNetwork: false };
    vi.spyOn(composed.visibility, "state").mockImplementation(() => ({ ...state }));
    vi.spyOn(composed.visibility, "set").mockImplementation(async (change) => {
      if (change.localNetwork === true) throw new (await import("../../../src/private-network/node-visibility.js")).NodeVisibilityError("LOCAL_NETWORK_NOT_ALLOWED", "allow first");
      if (typeof change.privateNetwork === "boolean") state.privateNetwork = change.privateNetwork;
      return { ...state };
    });
    const resolver = new PrivateNetworkResolver();
    expect(() => resolver.nodeVisibility(context("phone"))).toThrow(expect.objectContaining({ extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } }));
    await expect(resolver.setNodeVisibility(true, null, context("phone"))).rejects.toMatchObject({ extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } });
    expect(resolver.nodeVisibility(context("owner"))).toEqual({ privateNetwork: false, localNetwork: false });
    await expect(resolver.setNodeVisibility(true, null, context("owner"))).resolves.toEqual({ privateNetwork: true, localNetwork: false });
    await expect(resolver.setNodeVisibility(null, true, context("owner"))).rejects.toMatchObject({ message: "allow first", extensions: { code: "LOCAL_NETWORK_NOT_ALLOWED" } });
  });
});
