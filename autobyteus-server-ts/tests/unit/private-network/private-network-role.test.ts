import { describe, expect, it, vi } from "vitest";
import { PrivateNetworkRole } from "../../../src/private-network/private-network-role.js";

/** autobyteus-661 design `PrivateNetworkRole`: the provider resolved per call; role answers read strictly. */

const roleWith = (provider: string | null, answers: Record<string, unknown>) => {
  const callAction = vi.fn(async (_id: string, action: string) => answers[action]);
  return { callAction, role: new PrivateNetworkRole({ extensions: { enabledProvider: vi.fn(async () => provider), callAction } as never }) };
};

describe("PrivateNetworkRole", () => {
  it("says Private Network is not set up when no extension that is on provides it", async () => {
    const f = roleWith(null, {});
    for (const call of [() => f.role.status(), () => f.role.machines(), () => f.role.relay()]) {
      await expect(call()).rejects.toMatchObject({ code: "PRIVATE_NETWORK_NOT_SET_UP", message: "Private Network is not set up on this node." });
    }
    expect(f.callAction).not.toHaveBeenCalled();
  });

  it("calls the provider's role actions and reads their answers", async () => {
    const f = roleWith("private-network", {
      status: { state: "joined", machine: { name: "home-mac", ip: "100.88.10.10", id: "nKx", account: "alex@example.com" }, message: "Connected as home-mac." },
      machines: [{ name: "linux-box", ip: "100.88.80.80", id: "m2", account: "alex@example.com", online: true },
        { name: "bob-laptop", ip: "100.88.80.81", id: "m3", account: "bob@example.com", sharedBy: "bob@example.com", online: false }],
      relay: { port: 41000, credential: "relay-credential" },
    });
    await expect(f.role.status()).resolves.toEqual({ state: "joined", machine: { name: "home-mac", ip: "100.88.10.10", id: "nKx", account: "alex@example.com" },
      message: "Connected as home-mac." });
    await expect(f.role.machines()).resolves.toEqual([
      { name: "linux-box", ip: "100.88.80.80", id: "m2", account: "alex@example.com", sharedBy: null, online: true },
      { name: "bob-laptop", ip: "100.88.80.81", id: "m3", account: "bob@example.com", sharedBy: "bob@example.com", online: false },
    ]);
    await expect(f.role.relay()).resolves.toEqual({ port: 41000, credential: "relay-credential" });
    expect(f.callAction.mock.calls.map(([id, action]) => `${id}.${action}`)).toEqual(["private-network.status", "private-network.machines", "private-network.relay"]);
  });

  it("refuses an answer in another form instead of guessing", async () => {
    const f = roleWith("private-network", { status: { state: "online", message: "x" }, machines: [{ name: "x" }], relay: { port: 0, credential: "c" } });
    for (const call of [() => f.role.status(), () => f.role.machines(), () => f.role.relay()]) {
      await expect(call()).rejects.toMatchObject({ code: "PRIVATE_NETWORK_BAD_ANSWER" });
    }
  });
});
