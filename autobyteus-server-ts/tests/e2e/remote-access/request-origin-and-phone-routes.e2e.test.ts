// The node's allowed-origin gate and phone WebSocket routes on the real studio server
// (autobyteus-403, AC-001…AC-006). It starts the studio composition on a loopback port and
// sends real WebSocket upgrades (`ws` client with an Origin header) and HTTP requests:
// - every WS route family (/ws/*, /graphql, /rest/remote/run-observations) and HTTP refuse a
//   foreign Origin with 403 REMOTE_ACCESS_ORIGIN_REFUSED before the route runs;
// - each allowed-origin class (REQ-002) passes; CORS is granted only to allowed origins;
// - a paired phone's credential opens the phone WebSocket routes and is refused elsewhere;
// - every refusal logs one line with its code and the redacted URL, never a credential.
// Run: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { PHONE_WEBSOCKET_ROUTES } from "../../../src/api/security/remote-access-route-policy.js";
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
const LOOPBACK_DEV_ORIGIN = "http://localhost:3000";
const TRUSTED_NETWORK_CLIENT = "100.64.1.2";
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
  }) => started.fastify.inject({ remoteAddress: TRUSTED_NETWORK_CLIENT, ...options } as never);

  const corsHeaders = (headers: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(headers).filter(([name]) => name.startsWith("access-control-") || name === "vary"));

  const refusalLines = (): string[] => warnings.filter((line) => line.startsWith("Remote Access"));

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "request-origin-and-phone-routes-"));
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\nAUTOBYTEUS_ALLOWED_ORIGINS=${CONFIGURED_ORIGIN}, not-an-origin\n`,
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
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

  it("refuses a foreign or null Origin on every WebSocket route family before the route runs (AC-001)", async () => {
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
      `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/origin-probe origin ${FOREIGN_ORIGIN}`,
    );
  });

  it("accepts each allowed-origin class and refuses near misses (AC-002)", async () => {
    const accepted: Array<[string, Record<string, string>]> = [
      ["no Origin", {}],
      ["desktop app file://", { Origin: "file://" }],
      ["same origin as Host", { Origin: `http://${wsBase.host}` }],
      ["Tailscale Serve shape", { Origin: "https://desktop.tail.ts.net", Host: "desktop.tail.ts.net" }],
      ["X-Forwarded-Host", { Origin: "https://node.gateway.example", "X-Forwarded-Host": "node.gateway.example" }],
      ["loopback development", { Origin: LOOPBACK_DEV_ORIGIN }],
      ["configured origin", { Origin: CONFIGURED_ORIGIN }],
    ];
    for (const [label, headers] of accepted) {
      expect({ label, outcome: await upgrade("/ws/projects", headers) })
        .toEqual({ label, outcome: { kind: "opened", close: null } });
    }
    for (const origin of ["https://desktop.tail.ts.net.evil.example", "file:///x", "https://desktop.tail.ts.net:8443"]) {
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
      headers: { origin: LOOPBACK_DEV_ORIGIN, "access-control-request-method": "POST" },
    });
    expect(allowedPreflight.statusCode).toBe(204);
    expect(allowedPreflight.headers["access-control-allow-origin"]).toBe(LOOPBACK_DEV_ORIGIN);
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
      `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /graphql origin ${FOREIGN_ORIGIN}`,
      `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /graphql origin ${FOREIGN_ORIGIN}`,
    ]);
  });

  it("refuses a phone credential on WebSocket routes the phone does not offer (AC-004)", async () => {
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

  it("accepts a phone credential on every phone WebSocket route (AC-005)", async () => {
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

  it("logs every refusal once with its code and redacted URL and never a credential (AC-006)", async () => {
    const query = `access_token=${encodeURIComponent(phone.credential)}`;
    await upgrade(`/ws/projects?${query}`, { Origin: FOREIGN_ORIGIN, Authorization: `Bearer ${phone.credential}` });
    await upgrade(`/ws/terminal/log-probe?${query}`);
    await upgrade(`/graphql?${query}`);
    await upgrade(`/rest/remote/run-observations?${query}`);

    expect(refusalLines()).toEqual([
      `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/projects?access_token=%5BREDACTED%5D origin ${FOREIGN_ORIGIN}`,
      "Remote Access WebSocket rejected /ws/terminal/log-probe?access_token=%5BREDACTED%5D: PHONE_ACCESS_ROUTE_REFUSED",
      "Remote Access request refused PHONE_ACCESS_ROUTE_REFUSED /graphql?access_token=%5BREDACTED%5D",
      "Remote Access request refused PHONE_ACCESS_ROUTE_REFUSED /rest/remote/run-observations?access_token=%5BREDACTED%5D",
    ]);
    for (const line of warnings) {
      expect(line).not.toContain(phone.credential);
      expect(line).not.toContain("mra_");
    }
  });

  it("keeps today's refusal of a phone credential when Phone Access is disabled", async () => {
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

  async function pairPhone(): Promise<PairingExchangeResult> {
    const enabled = await inject({ method: "PUT", url: "/rest/remote-access/settings", payload: { phoneAccessEnabled: true } });
    expect(enabled.statusCode).toBe(200);
    const session = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      payload: { serverBaseUrl: "https://desktop.tailnet.ts.net/mobile", serverName: "AutoByteus Desktop" },
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
