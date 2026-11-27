/**
 * autobyteus-581 F-1 (API-E01): a fresh sandbox node hands out its setup code a moment before its published port
 * takes connections. `connect` waits for the port to answer, then exchanges the code exactly once.
 * autobyteus-661 AR-001: `pair` has the sandbox make a grant, then pairs with it, saving the sandbox marked `sandbox`
 * (the sandbox keeps the first of the host's addresses that answers it, contract §2). Dummy values only.
 */
import { describe, expect, it, vi } from "vitest";
import { SandboxPairing, SandboxPairingError } from "../../../src/sandboxes/sandbox-pairing.js";

const BASE = "http://127.0.0.1:47581";

const execResult = (stdout: string, exitCode = 0) => ({ exitCode, stdout, stderr: "", truncated: false, timedOut: false });

const pairingWith = (fetchImpl: typeof fetch, overrides: { exec?: ReturnType<typeof vi.fn>; pair?: ReturnType<typeof vi.fn> } = {}) => new SandboxPairing({
  docker: {
    exec: overrides.exec ?? vi.fn(async () => execResult("setup-code-1")),
    copyInto: vi.fn(), makeDirectory: vi.fn(),
  } as never,
  pairing: { pair: overrides.pair ?? vi.fn() } as never,
  discovery: { listAvailableAgents: vi.fn() } as never,
  hostNodeId: async () => "srv_host_000000000000000000000000000000",
  fetch: fetchImpl,
});

const dropped = () => Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_SOCKET" } });

describe("SandboxPairing.connect", () => {
  it("asks the health route again after a dropped connection, then exchanges the setup code once", async () => {
    const calls: string[] = [];
    let healthAttempts = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      calls.push(`${init?.method ?? "GET"} ${target.slice(BASE.length)}`);
      if (target.endsWith("/rest/health")) {
        healthAttempts += 1;
        if (healthAttempts === 1) throw dropped();
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }
      expect(JSON.parse(String(init?.body))).toEqual({ setupCode: "setup-code-1", desktopName: "sandbox host" });
      return new Response(JSON.stringify({ credential: "owner-credential" }), { status: 201 });
    }) as unknown as typeof fetch;

    const session = await pairingWith(fetchImpl).connect("sbx_1", BASE, Date.now() + 60_000);

    expect(session.baseUrl).toBe(BASE);
    expect(calls).toEqual(["GET /rest/health", "GET /rest/health", "POST /rest/node-access/setup-exchanges"]);
  });

  it("refuses with SANDBOX_START_FAILED when the port never answers before the deadline, without exchanging", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/rest/health")) throw dropped();
      throw new Error("the setup code must not be exchanged");
    }) as unknown as typeof fetch;

    const refused = await pairingWith(fetchImpl).connect("sbx_1", BASE, Date.now() + 300).catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(SandboxPairingError);
    expect(refused).toMatchObject({ code: "SANDBOX_START_FAILED" });
    expect(vi.mocked(fetchImpl).mock.calls.every(([url]) => String(url).endsWith("/rest/health"))).toBe(true);
  });
});

describe("SandboxPairing.pair (autobyteus-661 AR-001)", () => {
  const session = (graphql: ReturnType<typeof vi.fn>) => ({ baseUrl: BASE, graphql }) as never;

  it("has the sandbox grant an own pair named `host`, then pairs with it at its published port, marked sandbox", async () => {
    const graphql = vi.fn(async () => ({ createPairingGrant: { grant: "grant-1" } }))
    const exec = vi.fn();
    const pair = vi.fn(async () => ({ state: "paired", peer: { nodeId: "srv_sandbox", sandbox: true } }));
    await expect(pairingWith(vi.fn() as never, { exec, pair }).pair(session(graphql), "sbx_1")).resolves.toBe("srv_sandbox");
    expect(graphql).toHaveBeenCalledWith('mutation($host: String!) { createPairingGrant(relation: "own", forNodeId: $host, nameForAsker: "host") { grant } }',
      { host: "srv_host_000000000000000000000000000000" });
    expect(pair).toHaveBeenCalledWith({ address: BASE, grant: "grant-1", name: "sbx_1", sandbox: true });
    expect(exec).not.toHaveBeenCalled();
  });

  it("refuses SANDBOX_START_FAILED when the sandbox gives no grant or refuses the pair (it reaches the host at none of its addresses)", async () => {
    await expect(pairingWith(vi.fn() as never).pair(session(vi.fn(async () => { throw new Error("NODE_ROUTE_NOT_PERMITTED"); })), "sbx_1"))
      .rejects.toMatchObject({ code: "SANDBOX_START_FAILED", message: expect.stringContaining("NODE_ROUTE_NOT_PERMITTED") });
    const graphql = vi.fn(async () => ({ createPairingGrant: { grant: "grant-1" } }));
    const refusing = vi.fn(async () => { throw new Error("This node reaches the asking node at none of the addresses it gave."); });
    await expect(pairingWith(vi.fn() as never, { pair: refusing }).pair(session(graphql), "sbx_1"))
      .rejects.toMatchObject({ code: "SANDBOX_START_FAILED", message: expect.stringContaining("none of the addresses") });
  });
});
