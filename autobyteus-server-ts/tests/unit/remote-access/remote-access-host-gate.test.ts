import fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// autobyteus-416 D1/D9 (REQ-001, REQ-006, QR-001): the Host gate as the node's first hook and its refusal line.

const pairedHosts = new Set<string>();
vi.mock("../../../src/remote-access/services/remote-access-pairing-service.js", () => ({
  getRemoteAccessPairingService: () => ({
    isPairedPhoneHost: async (hostName: string) => pairedHosts.has(hostName),
  }),
}));

const { registerRemoteAccessHostGate } = await import("../../../src/api/security/remote-access-host-gate.js");
const { resetNodeBrowserAccessForTests } = await import("../../../src/api/security/node-browser-access.js");
const { registerMcpGatewayRoutes } = await import("../../../src/mcp-gateway/mcp-gateway-routes.js");

const HINT = "(add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)";

describe("registerRemoteAccessHostGate", () => {
  let app: FastifyInstance;
  let warnings: string[];
  const handled = vi.fn();

  beforeEach(async () => {
    process.env.AUTOBYTEUS_ALLOWED_HOSTS = "node.example.com";
    resetNodeBrowserAccessForTests();
    pairedHosts.clear();
    warnings = [];
    handled.mockReset();
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    });
    app = fastify();
    registerRemoteAccessHostGate(app);
    app.all("/graphql", async () => {
      handled();
      return { ok: true };
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.AUTOBYTEUS_ALLOWED_HOSTS;
    resetNodeBrowserAccessForTests();
    vi.restoreAllMocks();
  });

  it("refuses a public name with 403 REMOTE_ACCESS_HOST_REFUSED before the handler, with or without Origin", async () => {
    for (const headers of [
      { host: "evil.example:29695" },
      { host: "evil.example:29695", origin: "http://evil.example:29695" },
      { host: "evil.example:29695", "x-forwarded-host": "127.0.0.1:29695" },
    ]) {
      const response = await app.inject({ method: "POST", url: "/graphql", headers });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: "REMOTE_ACCESS_HOST_REFUSED",
        code: "REMOTE_ACCESS_HOST_REFUSED",
        message: "Requests addressed to this host name are not accepted by this node.",
      });
    }
    expect(handled).not.toHaveBeenCalled();
  });

  it("logs one line naming the host, the redacted route and the setting, and no header or credential (QR-001)", async () => {
    await app.inject({
      method: "GET",
      url: "/graphql?access_token=mra_secret&x=1",
      headers: { host: "Evil.Example.:29695", authorization: "Bearer mra_secret", cookie: "c=mra_secret" },
    });
    expect(warnings).toEqual([
      `Node request refused REMOTE_ACCESS_HOST_REFUSED /graphql?access_token=%5BREDACTED%5D&x=1 from 127.0.0.1 host evil.example ${HINT}`,
    ]);
    expect(warnings.join("\n")).not.toContain("mra_secret");
  });

  it("logs a malformed Host bounded to 100 characters with non-printable characters escaped (R-5)", async () => {
    await app.inject({ method: "GET", url: "/graphql", headers: { host: `bad/\u0007${"x".repeat(300)}` } });
    expect(warnings).toHaveLength(1);
    const shown = warnings[0]!.slice(warnings[0]!.indexOf(" host ") + 6, warnings[0]!.indexOf(` ${HINT}`));
    expect(shown.startsWith("bad/\\u0007xxx")).toBe(true);
    expect(shown).toHaveLength(101);
    expect(shown.endsWith("…")).toBe(true);
  });

  it("passes the node's names: classes, configured names and paired-phone hosts", async () => {
    pairedHosts.add("phone.company.example");
    for (const host of ["127.0.0.1:29695", "localhost", "mymac.local:29695", "desktop.tail.ts.net", "node.example.com", "phone.company.example"]) {
      const response = await app.inject({ method: "POST", url: "/graphql", headers: { host } });
      expect(response.statusCode, host).toBe(200);
    }
    expect(handled).toHaveBeenCalledTimes(6);
    expect(warnings).toEqual([]);
  });

  it("runs before the MCP gateway hook when registered first (D1)", async () => {
    const gated = fastify();
    registerRemoteAccessHostGate(gated);
    const accessGate = { validateRequest: vi.fn(() => ({ ok: true as const })) };
    await registerMcpGatewayRoutes(gated, { accessGate: accessGate as never, dispatcher: {} as never });
    await gated.ready();
    try {
      const response = await gated.inject({
        method: "OPTIONS",
        url: "/mcp/gateway",
        headers: { host: "evil.example", origin: "http://evil.example" },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ code: "REMOTE_ACCESS_HOST_REFUSED" });
      expect(accessGate.validateRequest).not.toHaveBeenCalled();
    } finally {
      await gated.close();
    }
  });
});
