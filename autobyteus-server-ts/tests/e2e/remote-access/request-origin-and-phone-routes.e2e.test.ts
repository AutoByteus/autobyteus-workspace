// The node's request gate (Host gate, allowed-origin rule) and phone WebSocket routes on the real
// studio server (autobyteus-403 AC-001…AC-006; autobyteus-416 AC-001…AC-005). It starts the studio
// composition on a loopback port and sends real WebSocket upgrades (`ws` client with Host and Origin
// headers) and HTTP requests:
// - a request addressed to a name that is not the node's (DNS rebinding) is refused with 403
//   REMOTE_ACCESS_HOST_REFUSED before any hook or route, on HTTP, preflights, /mcp/gateway and every WS
//   family, whatever its Origin or X-Forwarded-Host; each allowed-host class and setting passes;
// - a localhost page's Origin passes only when listed in AUTOBYTEUS_ALLOWED_ORIGINS;
// - every WS route family (/ws/*, /graphql, /rest/remote/run-observations) and HTTP refuse a
//   foreign Origin with 403 REMOTE_ACCESS_ORIGIN_REFUSED before the route runs;
// - each allowed-origin class (REQ-002) passes; CORS is granted only to allowed origins;
// - a paired phone's credential opens the phone WebSocket routes and is refused elsewhere;
// - every refusal logs one line with its code, the redacted URL and the client address, never a credential.
// The test is the owner desktop of this node: its requests carry the node's launch owner credential (node access
// model NA-1) unless they carry a phone's credential.
// Run: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { PHONE_WEBSOCKET_ROUTES } from "../../../src/api/security/node-route-permissions.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { PairingExchangeResult } from "../../../src/remote-access/domain/models.js";
import { configureNodeIdentityCapability } from "../../../src/remote-access/services/node-identity-service.js";
import { TerminalHandler } from "../../../src/services/terminal-streaming/index.js";
import {
  startStudioE2eRuntimeServer,
  type StartedStudioE2eRuntimeServer,
} from "../helpers/studio-runtime-test-server.js";

const FOREIGN_ORIGIN = "https://evil.example";
const CONFIGURED_ORIGIN = "https://gateway.example";
/** A development frontend's origin, listed as the launchers list theirs (416 REQ-005). */
const LISTED_LOOPBACK_ORIGIN = "http://127.0.0.1:3000";
const UNLISTED_LOOPBACK_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:8080", "http://[::1]:3000"];
const REBINDING_HOST = "evil.example";
const HOST_HINT = "(add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)";
/** This computer: the node admits it (NA-3); a credential is still required (NA-1). */
const THIS_COMPUTER = "127.0.0.1";
const SETTLE_MS = 400;

type UpgradeOutcome =
  | { kind: "refused"; status: number }
  | { kind: "opened"; close: { code: number; reason: string } | null };

const typenameQuery = JSON.stringify({ query: "{ __typename }" });

describe("Node allowed-origin gate and phone WebSocket routes", () => {
  let appDataDir: string;
  let started: StartedStudioE2eRuntimeServer;
  let wsBase: URL;
  let phone: PairingExchangeResult;
  let warnings: string[];
  let startWarnings: string[];

  const upgrade = (pathname: string, headers: Record<string, string> = {}): Promise<UpgradeOutcome> =>
    new Promise((resolve) => {
      const socket = new WebSocket(new URL(pathname, wsBase), { headers });
      let settleTimer: NodeJS.Timeout | undefined;
      socket.on("error", () => undefined);
      socket.once("unexpected-response", (request, response) => {
        resolve({ kind: "refused", status: response.statusCode ?? 0 });
        response.resume();
        request.destroy();
      });
      socket.once("open", () => {
        settleTimer = setTimeout(() => {
          resolve({ kind: "opened", close: null });
          socket.close();
        }, SETTLE_MS);
      });
      socket.once("close", (code, reason) => {
        clearTimeout(settleTimer);
        resolve({ kind: "opened", close: { code, reason: reason.toString() } });
      });
    });

  const inject = (options: {
    method: "GET" | "POST" | "PUT" | "OPTIONS";
    url: string;
    headers?: Record<string, string>;
    payload?: unknown;
  }) => started.fastify.inject({
    remoteAddress: THIS_COMPUTER,
    ...options,
    headers: { authorization: `Bearer ${started.ownerCredential}`, ...options.headers },
  } as never);

  const corsHeaders = (headers: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(headers).filter(([name]) => name.startsWith("access-control-") || name === "vary"));

  const openServerConnectionsAfterSettling = async (): Promise<number> => {
    const count = () => new Promise<number>((resolve, reject) =>
      started.fastify.server.getConnections((error, connections) => (error ? reject(error) : resolve(connections))));
    for (let attempt = 0; attempt < 20 && await count() > 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return count();
  };

  const refusalLines = (): string[] => warnings.filter((line) => line.startsWith("Node request refused"));

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "request-origin-and-phone-routes-"));
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      [
        "AUTOBYTEUS_SERVER_HOST=http://studio-node.company.example:8000",
        "APP_ENV=test",
        `AUTOBYTEUS_ALLOWED_ORIGINS=${CONFIGURED_ORIGIN}, ${LISTED_LOOPBACK_ORIGIN}, not-an-origin`,
        "AUTOBYTEUS_ALLOWED_HOSTS=node.example.com, .corp.example, http://not-a-name",
        "",
      ].join("\n"),
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    startWarnings = [];
    const startWarn = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      startWarnings.push(args.map(String).join(" "));
    });
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    startWarn.mockRestore();
    wsBase = new URL(started.mainUrl);
    wsBase.protocol = "ws:";
    configureNodeIdentityCapability(true);
    phone = await pairPhone();
  }, 60_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await started?.fastify.close();
    await fs.rm(appDataDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    warnings = [];
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    });
  });

  it("NAS-15 NAS-17 refuses a foreign or null (opaque HTML preview) Origin on every WebSocket route family before the route runs (AC-001)", async () => {
    const terminalConnect = vi.spyOn(TerminalHandler.prototype, "connect");
    for (const origin of [FOREIGN_ORIGIN, "null"]) {
      for (const pathname of [
        "/ws/terminal/origin-probe",
        "/ws/projects",
        "/ws/node-desktop?mode=view",
        "/graphql",
        "/rest/remote/run-observations",
      ]) {
        expect({ origin, pathname, outcome: await upgrade(pathname, { Origin: origin }) })
          .toEqual({ origin, pathname, outcome: { kind: "refused", status: 403 } });
      }
    }
    expect(terminalConnect).not.toHaveBeenCalled();
    expect(refusalLines()).toHaveLength(10);
    expect(refusalLines()[0]).toBe(
      `Node request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/origin-probe from 127.0.0.1 origin ${FOREIGN_ORIGIN}`,
    );
  });

  it("accepts each allowed-origin class and refuses near misses (AC-002)", async () => {
    const accepted: Array<[string, Record<string, string>]> = [
      ["no Origin", {}],
      ["desktop app file://", { Origin: "file://" }],
      ["same origin as Host", { Origin: `http://${wsBase.host}` }],
      ["Tailscale Serve shape", { Origin: "https://desktop.tail.ts.net", Host: "desktop.tail.ts.net" }],
      ["X-Forwarded-Host", { Origin: "https://node.gateway.example", "X-Forwarded-Host": "node.gateway.example" }],
      ["listed loopback development origin", { Origin: LISTED_LOOPBACK_ORIGIN }],
      ["configured origin", { Origin: CONFIGURED_ORIGIN }],
    ];
    for (const [label, headers] of accepted) {
      expect({ label, outcome: await upgrade("/ws/projects", headers) })
        .toEqual({ label, outcome: { kind: "opened", close: null } });
    }
    for (const origin of ["https://desktop.tail.ts.net.evil.example", "file:///x", "https://desktop.tail.ts.net:8443", ...UNLISTED_LOOPBACK_ORIGINS]) {
      expect({ origin, outcome: await upgrade("/ws/projects", { Origin: origin, Host: "desktop.tail.ts.net" }) })
        .toEqual({ origin, outcome: { kind: "refused", status: 403 } });
    }
  });

  it("refuses foreign-origin HTTP and preflights and grants CORS only to allowed origins (AC-003)", async () => {
    const foreignPreflight = await inject({
      method: "OPTIONS",
      url: "/graphql",
      headers: { origin: FOREIGN_ORIGIN, "access-control-request-method": "POST" },
    });
    expect(foreignPreflight.statusCode).toBe(403);
    expect(foreignPreflight.json()).toMatchObject({ code: "REMOTE_ACCESS_ORIGIN_REFUSED" });
    expect(corsHeaders(foreignPreflight.headers)).toEqual({ vary: "Origin" });

    const foreignPost = await inject({
      method: "POST",
      url: "/graphql",
      headers: { origin: FOREIGN_ORIGIN, "content-type": "application/json" },
      payload: typenameQuery,
    });
    expect(foreignPost.statusCode).toBe(403);
    expect(foreignPost.json()).toMatchObject({ code: "REMOTE_ACCESS_ORIGIN_REFUSED" });
    expect(corsHeaders(foreignPost.headers)).toEqual({ vary: "Origin" });

    const allowedPreflight = await inject({
      method: "OPTIONS",
      url: "/graphql",
      headers: { origin: LISTED_LOOPBACK_ORIGIN, "access-control-request-method": "POST" },
    });
    expect(allowedPreflight.statusCode).toBe(204);
    expect(allowedPreflight.headers["access-control-allow-origin"]).toBe(LISTED_LOOPBACK_ORIGIN);
    expect(allowedPreflight.headers["access-control-allow-methods"]).toBe("GET, POST, PUT, PATCH, DELETE, OPTIONS");

    const allowedPost = await inject({
      method: "POST",
      url: "/graphql",
      headers: { origin: CONFIGURED_ORIGIN, "content-type": "application/json" },
      payload: typenameQuery,
    });
    expect(allowedPost.statusCode).toBe(200);
    expect(allowedPost.json()).toEqual({ data: { __typename: "Query" } });
    expect(corsHeaders(allowedPost.headers)).toEqual({ "access-control-allow-origin": CONFIGURED_ORIGIN, vary: "Origin" });

    const noOriginPost = await inject({
      method: "POST",
      url: "/graphql",
      headers: { "content-type": "application/json" },
      payload: typenameQuery,
    });
    expect(noOriginPost.statusCode).toBe(200);
    expect(corsHeaders(noOriginPost.headers)).toEqual({ vary: "Origin" });

    // A preflight without Origin keeps the CORS plugin's strict-preflight answer it had before.
    const noOriginPreflight = await inject({ method: "OPTIONS", url: "/graphql" });
    expect(noOriginPreflight.statusCode).toBe(400);

    expect(refusalLines()).toEqual([
      `Node request refused REMOTE_ACCESS_ORIGIN_REFUSED /graphql from 127.0.0.1 origin ${FOREIGN_ORIGIN}`,
      `Node request refused REMOTE_ACCESS_ORIGIN_REFUSED /graphql from 127.0.0.1 origin ${FOREIGN_ORIGIN}`,
    ]);
  });

  it("NAS-09 refuses a phone credential on WebSocket routes the phone does not offer (AC-004)", async () => {
    const terminalConnect = vi.spyOn(TerminalHandler.prototype, "connect");
    const query = `access_token=${encodeURIComponent(phone.credential)}`;
    for (const pathname of [
      "/ws/terminal/phone-probe",
      "/ws/update-notifications",
      "/ws/applications/app-1/backend/notifications",
      "/ws/applications/app-1/backend/routes/x",
      "/ws/applications/app-1/agent-communication/x",
    ]) {
      expect({ pathname, outcome: await upgrade(`${pathname}?${query}`) }).toEqual({
        pathname,
        outcome: { kind: "opened", close: { code: 4403, reason: "PHONE_ACCESS_ROUTE_REFUSED" } },
      });
    }
    expect(await upgrade(`/graphql?${query}`)).toEqual({ kind: "refused", status: 403 });
    expect(await upgrade(`/rest/remote/run-observations?${query}`)).toEqual({ kind: "refused", status: 403 });
    expect(terminalConnect).not.toHaveBeenCalled();
  });

  it("NAS-05 accepts a phone credential on every phone WebSocket route (AC-005)", async () => {
    const query = `access_token=${encodeURIComponent(phone.credential)}`;
    for (const routePattern of PHONE_WEBSOCKET_ROUTES) {
      expect({ routePattern, registered: started.fastify.hasRoute({ method: "GET", url: routePattern }) })
        .toEqual({ routePattern, registered: true });
      const pathname = routePattern.replace(/:[A-Za-z]+/g, "phone-probe");
      const outcome = await upgrade(`${pathname}?${query}`);
      expect(outcome.kind, routePattern).toBe("opened");
      const reason = outcome.kind === "opened" ? outcome.close?.reason ?? "" : "";
      expect(reason, routePattern).not.toMatch(/^(REMOTE_ACCESS_|PHONE_ACCESS_)/);
    }
    expect(refusalLines()).toEqual([]);
  });

  it("NAS-29 logs every refusal once with its code, redacted URL and client address, and never a credential (AC-006)", async () => {
    const query = `access_token=${encodeURIComponent(phone.credential)}`;
    await upgrade(`/ws/projects?${query}`, { Origin: FOREIGN_ORIGIN, Authorization: `Bearer ${phone.credential}` });
    await upgrade(`/ws/terminal/log-probe?${query}`);
    await upgrade(`/graphql?${query}`);
    await upgrade(`/rest/remote/run-observations?${query}`);

    expect(refusalLines()).toEqual([
      `Node request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/projects?access_token=%5BREDACTED%5D from 127.0.0.1 origin ${FOREIGN_ORIGIN}`,
      "Node request refused PHONE_ACCESS_ROUTE_REFUSED /ws/terminal/log-probe?access_token=%5BREDACTED%5D from 127.0.0.1",
      "Node request refused PHONE_ACCESS_ROUTE_REFUSED /graphql?access_token=%5BREDACTED%5D from 127.0.0.1",
      "Node request refused PHONE_ACCESS_ROUTE_REFUSED /rest/remote/run-observations?access_token=%5BREDACTED%5D from 127.0.0.1",
    ]);
    for (const line of warnings) {
      expect(line).not.toContain(phone.credential);
      expect(line).not.toContain(started.ownerCredential);
      expect(line).not.toContain("mra_");
      expect(line).not.toContain("own_");
    }
  });

  it("NAS-10 keeps today's refusal of a phone credential when Phone Access is disabled", async () => {
    const disabled = await inject({ method: "PUT", url: "/rest/remote-access/settings", payload: { phoneAccessEnabled: false } });
    expect(disabled.statusCode).toBe(200);
    try {
      expect(await upgrade(`/ws/projects?access_token=${encodeURIComponent(phone.credential)}`)).toEqual({
        kind: "opened",
        close: { code: 4403, reason: "PHONE_ACCESS_DISABLED" },
      });
    } finally {
      await inject({ method: "PUT", url: "/rest/remote-access/settings", payload: { phoneAccessEnabled: true } });
    }
  });

  it("refuses a request addressed to a name that is not the node's on every entry form, before any route (416 AC-001)", async () => {
    const terminalConnect = vi.spyOn(TerminalHandler.prototype, "connect");
    const rebound = `${REBINDING_HOST}:${wsBase.port}`;
    const reboundOrigin = `http://${rebound}`;
    const httpCases: Array<Parameters<typeof inject>[0]> = [
      { method: "POST", url: "/graphql", headers: { host: rebound, origin: reboundOrigin, "content-type": "application/json" }, payload: typenameQuery },
      { method: "POST", url: "/graphql", headers: { host: rebound, "content-type": "application/json" }, payload: typenameQuery },
      { method: "POST", url: "/graphql", headers: { host: rebound, "x-forwarded-host": wsBase.host, origin: reboundOrigin, "content-type": "application/json" }, payload: typenameQuery },
      { method: "GET", url: "/rest/workspaces/any/content?path=page.html", headers: { host: rebound } },
      { method: "OPTIONS", url: "/graphql", headers: { host: rebound, origin: reboundOrigin, "access-control-request-method": "POST" } },
      { method: "POST", url: "/mcp/gateway", headers: { host: rebound, origin: reboundOrigin, "content-type": "application/json" }, payload: { jsonrpc: "2.0", id: 1, method: "tools/list" } },
    ];
    for (const options of httpCases) {
      const response = await inject(options);
      expect({ url: options.url, status: response.statusCode, body: response.json() }).toEqual({
        url: options.url,
        status: 403,
        body: expect.objectContaining({ code: "REMOTE_ACCESS_HOST_REFUSED" }),
      });
      expect(corsHeaders(response.headers)).toEqual({});
    }
    for (const pathname of ["/ws/terminal/rebinding-probe", "/ws/projects", "/graphql", "/rest/remote/run-observations"]) {
      for (const headers of [{ Host: rebound, Origin: reboundOrigin }, { Host: rebound }] as Array<Record<string, string>>) {
        expect({ pathname, headers, outcome: await upgrade(pathname, headers) })
          .toEqual({ pathname, headers, outcome: { kind: "refused", status: 403 } });
      }
    }
    expect(terminalConnect).not.toHaveBeenCalled();
    // The server closes each refused upgrade's socket (the WebSocket plugin marks upgrades before the Host gate).
    expect(await openServerConnectionsAfterSettling()).toBe(0);
    expect(refusalLines()).toHaveLength(httpCases.length + 8);
    expect(refusalLines()[0]).toBe(
      `Node request refused REMOTE_ACCESS_HOST_REFUSED /graphql from 127.0.0.1 host ${REBINDING_HOST} ${HOST_HINT}`,
    );
    expect(refusalLines().every((line) => line.includes(`host ${REBINDING_HOST} ${HOST_HINT}`))).toBe(true);
  });

  it("accepts every allowed-host class, configured name and paired-phone host, and refuses other public names (416 AC-002, AC-003)", async () => {
    const pairingOnly = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      payload: { connectionWay: "company_address", serverBaseUrl: "https://pairing-only.example.org", serverName: "AutoByteus Desktop" },
    });
    expect(pairingOnly.statusCode).toBe(201);
    const companyPhone = await pairPhone("https://phone-entry.example.org", "company_address");

    const allowedHosts = [
      `127.0.0.1:${wsBase.port}`,
      `[::1]:${wsBase.port}`,
      "localhost",
      "x.localhost:3000",
      "mymac",
      "mymac.local:29695",
      "router.lan",
      "nas.home.arpa",
      "host.docker.internal:8001",
      "svc.internal",
      "desktop.tail1234.ts.net",
      "studio-node.company.example:8000",
      "gateway.example",
      "node.example.com",
      "corp.example",
      "a.corp.example",
      "pairing-only.example.org",
      "phone-entry.example.org",
    ];
    for (const host of allowedHosts) {
      const response = await inject({ method: "POST", url: "/graphql", headers: { host, "content-type": "application/json" }, payload: typenameQuery });
      expect({ host, status: response.statusCode }).toEqual({ host, status: 200 });
    }
    expect(await upgrade("/ws/projects", { Host: "mymac.local" })).toEqual({ kind: "opened", close: null });
    expect(await upgrade(`/ws/projects?access_token=${encodeURIComponent(companyPhone.credential)}`, {
      Host: "phone-entry.example.org",
      Origin: "https://phone-entry.example.org",
    })).toEqual({ kind: "opened", close: null });

    for (const host of ["other.example.com", "evilcorp.example", "node.example.com.evil.example", "localhost.evil.example"]) {
      const response = await inject({ method: "POST", url: "/graphql", headers: { host, "content-type": "application/json" }, payload: typenameQuery });
      expect({ host, status: response.statusCode, code: response.json().code })
        .toEqual({ host, status: 403, code: "REMOTE_ACCESS_HOST_REFUSED" });
    }
  });

  it("warns once at start about invalid entries of the two settings (416 AC-003)", () => {
    expect(startWarnings.filter((line) => line.startsWith("AUTOBYTEUS_ALLOWED_"))).toEqual([
      "AUTOBYTEUS_ALLOWED_ORIGINS: ignoring entries that are not http(s) origins: not-an-origin",
      "AUTOBYTEUS_ALLOWED_HOSTS: ignoring entries that are not host names or .suffix entries: http://not-a-name",
    ]);
  });

  it("refuses unlisted localhost pages on HTTP, WebSockets and /mcp/gateway, and accepts the listed one (416 AC-005)", async () => {
    const terminalConnect = vi.spyOn(TerminalHandler.prototype, "connect");
    for (const origin of UNLISTED_LOOPBACK_ORIGINS) {
      const post = await inject({ method: "POST", url: "/graphql", headers: { origin, "content-type": "application/json" }, payload: typenameQuery });
      expect({ origin, status: post.statusCode, code: post.json().code }).toEqual({ origin, status: 403, code: "REMOTE_ACCESS_ORIGIN_REFUSED" });
      expect(await upgrade("/ws/terminal/localhost-page", { Origin: origin })).toEqual({ kind: "refused", status: 403 });
      const mcp = await inject({
        method: "POST",
        url: "/mcp/gateway",
        headers: { origin, "content-type": "application/json", accept: "application/json" },
        payload: { jsonrpc: "2.0", id: 1, method: "tools/list" },
      });
      expect({ origin, status: mcp.statusCode }).toEqual({ origin, status: 403 });
    }
    expect(terminalConnect).not.toHaveBeenCalled();
    const listed = await inject({ method: "POST", url: "/graphql", headers: { origin: LISTED_LOOPBACK_ORIGIN, "content-type": "application/json" }, payload: typenameQuery });
    expect(listed.statusCode).toBe(200);
  });

  async function pairPhone(
    serverBaseUrl = "https://desktop.tailnet.ts.net/mobile",
    connectionWay = "tailscale",
  ): Promise<PairingExchangeResult> {
    const enabled = await inject({ method: "PUT", url: "/rest/remote-access/settings", payload: { phoneAccessEnabled: true } });
    expect(enabled.statusCode).toBe(200);
    const session = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      payload: { connectionWay, serverBaseUrl, serverName: "AutoByteus Desktop" },
    });
    expect(session.statusCode).toBe(201);
    const { payload, mobileUrl } = session.json() as { payload: { pairingCode: string }; mobileUrl: string };
    const exchange = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-exchanges",
      payload: { pairingCode: payload.pairingCode, serverBaseUrl: mobileUrl.split("?", 1)[0], deviceName: "Origin Probe Phone" },
    });
    expect(exchange.statusCode).toBe(201);
    const result = exchange.json() as PairingExchangeResult;
    expect(result.credential).toMatch(/^mra_/);
    return result;
  }
});
