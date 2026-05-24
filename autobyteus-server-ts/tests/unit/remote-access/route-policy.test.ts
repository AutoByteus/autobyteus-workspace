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
  it("classifies core route families under the trusted-network model", () => {
    expect(classifyHttpRoute("GET", "/rest/health")).toBe("PUBLIC_HEALTH");
    expect(classifyHttpRoute("GET", "/rest/remote-access/status")).toBe("PUBLIC_HEALTH_STATUS");
    expect(classifyHttpRoute("POST", "/rest/remote-access/pairing-sessions")).toBe("TRUSTED_NETWORK_OWNER");
    expect(classifyHttpRoute("POST", "/rest/remote-access/pairing-exchanges")).toBe("PUBLIC_PAIRING_EXCHANGE");
    expect(classifyHttpRoute("GET", "/rest/remote-access/devices/revoked")).toBe("TRUSTED_NETWORK_OWNER");
    expect(classifyHttpRoute("POST", "/graphql")).toBe("TRUSTED_NETWORK_PROTECTED");
    expect(classifyHttpRoute("GET", "/graphql", { upgrade: "websocket" })).toBe("TRUSTED_NETWORK_WEBSOCKET");
    expect(classifyHttpRoute("GET", "/rest/new-unclassified-route")).toBe("TRUSTED_NETWORK_PROTECTED");
  });

  it("allows trusted-network protected HTTP without bearer credentials", async () => {
    const authService = { authorizeMobileCredential: vi.fn() };
    const policy = new RemoteAccessRoutePolicy(authService as never);
    const result = await policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/files/images/a.png",
      remoteAddress: "100.64.1.2",
    }));

    expect(result).toMatchObject({ ok: true, context: { mode: "trusted_network", isAuthenticated: false } });
    expect(authService.authorizeMobileCredential).not.toHaveBeenCalled();
  });

  it("allows trusted-network Phone Access management routes without additional credentials", async () => {
    const authService = { authorizeMobileCredential: vi.fn() };
    const policy = new RemoteAccessRoutePolicy(authService as never);

    await expect(policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
    }))).resolves.toMatchObject({ ok: true, context: { mode: "trusted_network" } });
    expect(authService.authorizeMobileCredential).not.toHaveBeenCalled();
  });

  it("does not treat mobile credentials as owner-management authority", async () => {
    const authService = { authorizeMobileCredential: vi.fn() };
    const policy = new RemoteAccessRoutePolicy(authService as never);

    await expect(policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/remote-access/devices/revoked",
      remoteAddress: "100.64.1.2",
      headers: { authorization: "Bearer mra_mobile_token" },
    }))).resolves.toMatchObject({ ok: false, statusCode: 403, code: "REMOTE_ACCESS_AUTH_INVALID" });
    expect(authService.authorizeMobileCredential).not.toHaveBeenCalled();
  });

  it("keeps mobile credential validation scoped to mobile-bearing protected requests", async () => {
    const authService = {
      authorizeMobileCredential: vi.fn(async () => ({
        ok: true as const,
        context: { mode: "mobile" as const, isAuthenticated: true, deviceId: "device-1" },
      })),
    };
    const policy = new RemoteAccessRoutePolicy(authService as never);
    const result = await policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/rest/files/images/a.png",
      remoteAddress: "100.64.1.2",
      headers: { authorization: "Bearer mra_mobile_token" },
    }));

    expect(result).toMatchObject({ ok: true, context: { mode: "mobile", deviceId: "device-1" } });
    expect(authService.authorizeMobileCredential).toHaveBeenCalledWith("mra_mobile_token");
  });

  it("keeps GraphQL GET dev surface loopback-only", async () => {
    const policy = new RemoteAccessRoutePolicy({ authorizeMobileCredential: vi.fn() } as never);
    await expect(policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/graphql",
      remoteAddress: "100.64.1.2",
    }))).resolves.toMatchObject({ ok: false, code: "REMOTE_ACCESS_ROUTE_UNSUPPORTED" });

    await expect(policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/graphql",
      remoteAddress: "127.0.0.1",
    }))).resolves.toMatchObject({ ok: true, context: { mode: "loopback", isAuthenticated: true } });
  });

  it("keeps channel ingress outside mobile credential auth", () => {
    expect(classifyHttpRoute("POST", "/rest/api/channel-ingress/v1/messages")).toBe("EXTERNAL_SIGNATURE");
    expect(classifyHttpRoute("POST", "/rest/api/channel-ingress/v1/delivery-events")).toBe("EXTERNAL_SIGNATURE");
  });

  it("validates mra access_token query credential for GraphQL WebSocket upgrades", async () => {
    const authService = {
      authorizeMobileCredential: vi.fn(async () => ({
        ok: true as const,
        context: { mode: "mobile" as const, isAuthenticated: true },
      })),
    };
    const policy = new RemoteAccessRoutePolicy(authService as never);
    const result = await policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/graphql?access_token=mra_secret",
      remoteAddress: "100.64.1.2",
      headers: { upgrade: "websocket" },
    }));

    expect(result.ok).toBe(true);
    expect(authService.authorizeMobileCredential).toHaveBeenCalledWith("mra_secret");
  });

  it("allows trusted-network WebSocket upgrades without access_token", async () => {
    const authService = { authorizeMobileCredential: vi.fn() };
    const policy = new RemoteAccessRoutePolicy(authService as never);
    const result = await policy.authorizeHttpRequest(request({
      method: "GET",
      url: "/graphql",
      remoteAddress: "100.64.1.2",
      headers: { upgrade: "websocket" },
    }));

    expect(result).toMatchObject({ ok: true, context: { mode: "trusted_network" } });
    expect(authService.authorizeMobileCredential).not.toHaveBeenCalled();
  });
});
