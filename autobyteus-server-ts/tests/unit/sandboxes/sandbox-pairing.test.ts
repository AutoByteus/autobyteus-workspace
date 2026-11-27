/**
 * autobyteus-581 F-1 (API-E01): a fresh sandbox node hands out its setup code a moment before its published port
 * takes connections. `connect` waits for the port to answer, then exchanges the code exactly once. Dummy values only.
 */
import { describe, expect, it, vi } from "vitest";
import { SandboxPairing, SandboxPairingError } from "../../../src/sandboxes/sandbox-pairing.js";

const BASE = "http://127.0.0.1:47581";

const pairingWith = (fetchImpl: typeof fetch) => new SandboxPairing({
  docker: {
    exec: vi.fn(async () => ({ exitCode: 0, stdout: "setup-code-1", stderr: "", truncated: false, timedOut: false })),
    copyInto: vi.fn(), makeDirectory: vi.fn(),
  } as never,
  pairing: { createInvite: vi.fn() } as never,
  peers: { findByName: vi.fn() } as never,
  discovery: { listAvailableAgents: vi.fn() } as never,
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
