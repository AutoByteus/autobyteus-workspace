import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  RemoteAccessRoutePolicy,
  classifyHttpRoute,
} from "../../../src/api/security/remote-access-route-policy.js";

const request = (input: {
  method: string;
  url: string;
  remoteAddress?: string;
  headers?: Record<string, string>;
}): FastifyRequest => ({
  method: input.method,
  url: input.url,
  headers: input.headers ?? {},
  raw: { socket: { remoteAddress: input.remoteAddress } },
} as unknown as FastifyRequest);

describe("RemoteAccessRoutePolicy", () => {
  it("classifies core route families", () => {
    expect(classifyHttpRoute("GET", "/rest/health")).toBe("PUBLIC_HEALTH");
    expect(classifyHttpRoute("GET", "/rest/remote-access/status")).toBe("PUBLIC_HEALTH_STATUS");
    expect(classifyHttpRoute("POST", "/rest/remote-access/pairing-sessions")).toBe("LOCAL_ONLY");
    expect(classifyHttpRoute("POST", "/rest/remote-access/pairing-exchanges")).toBe("PUBLIC_PAIRING_EXCHANGE");
    expect(classifyHttpRoute("POST", "/graphql")).toBe("LOCAL_OR_MOBILE");
    expect(classifyHttpRoute("GET", "/graphql", { upgrade: "websocket" })).toBe("LOCAL_OR_MOBILE_WS");
    expect(classifyHttpRoute("GET", "/rest/new-unclassified-route")).toBe("DEFAULT_PROTECTED");
  });

  it("rejects non-loopback protected HTTP without bearer token", async () => {
    const authService = {
      authorizeLoopbackOrBearer: vi.fn(async () => ({
        ok: false as const,
        statusCode: 401,
        code: "REMOTE_ACCESS_AUTH_REQUIRED" as const,
        message: "missing",
      })),
    };
    const policy = new RemoteAccessRoutePolicy(authService as never);
    const result = await policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/files/images/a.png",
      remoteAddress: "100.64.1.2",
      headers: { host: "127.0.0.1:29695", "x-forwarded-for": "127.0.0.1" },
    }));

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "REMOTE_ACCESS_AUTH_REQUIRED" });
    expect(authService.authorizeLoopbackOrBearer).toHaveBeenCalledWith({
      peerAddress: "100.64.1.2",
      authorizationHeader: undefined,
    });
  });

  it("allows loopback local-only management routes using peer socket address", async () => {
    const policy = new RemoteAccessRoutePolicy({ authorizeLoopbackOrBearer: vi.fn() } as never);
    await expect(policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/remote-access/devices",
      remoteAddress: "::ffff:127.0.0.1",
    }))).resolves.toMatchObject({ ok: true, context: { mode: "loopback" } });
  });

  it("does not trust Host or forwarded headers for local-only management routes", async () => {
    const policy = new RemoteAccessRoutePolicy({ authorizeLoopbackOrBearer: vi.fn() } as never);
    await expect(policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/remote-access/address-candidates",
      remoteAddress: "100.64.1.2",
      headers: { host: "127.0.0.1:29695", origin: "http://127.0.0.1:29695", "x-forwarded-for": "127.0.0.1" },
    }))).resolves.toMatchObject({ ok: false, code: "REMOTE_ACCESS_LOCAL_ONLY" });
  });

  it("keeps channel ingress outside mobile credential auth", () => {
    expect(classifyHttpRoute("POST", "/rest/api/channel-ingress/v1/messages")).toBe("EXTERNAL_SIGNATURE");
    expect(classifyHttpRoute("POST", "/rest/api/channel-ingress/v1/delivery-events")).toBe("EXTERNAL_SIGNATURE");
  });

  it("uses the access_token query credential for GraphQL WebSocket upgrades", async () => {
    const authService = {
      authorizeMobileCredential: vi.fn(async () => ({
        ok: true as const,
        context: { mode: "mobile" as const, isAuthenticated: true, deviceId: "device_1" },
      })),
      authorizeLoopbackOrBearer: vi.fn(),
    };
    const policy = new RemoteAccessRoutePolicy(authService as never);
    const result = await policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/graphql?access_token=secret",
      remoteAddress: "100.64.1.2",
      headers: { upgrade: "websocket" },
    }));

    expect(result.ok).toBe(true);
    expect(authService.authorizeMobileCredential).toHaveBeenCalledWith("secret");
    expect(authService.authorizeLoopbackOrBearer).not.toHaveBeenCalled();
  });
});
