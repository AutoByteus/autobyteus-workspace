import { describe, expect, it } from "vitest";
import {
  AgentToolsMcpLocalAccessGate,
  isAllowedOrigin,
  isLoopbackHostHeader,
} from "../../../../src/agent-tools/mcp/agent-tools-mcp-local-access.js";

describe("AgentToolsMcpLocalAccessGate", () => {
  it.each([
    "localhost",
    "localhost:43124",
    "127.0.0.1",
    "127.200.10.8:43124",
    "[::1]",
    "[::1]:43124",
    "::1",
  ])("accepts loopback Host %s", (host) => {
    expect(isLoopbackHostHeader(host)).toBe(true);
  });

  it.each([
    "example.test",
    "192.168.1.20:43124",
    "localhost.example",
    "http://localhost:43124",
    "[::1]:0",
    "[::1]:70000",
    "",
  ])("rejects non-loopback or malformed Host %s", (host) => {
    expect(isLoopbackHostHeader(host)).toBe(false);
  });

  it("preserves absent/current loopback Origin admission", () => {
    expect(isAllowedOrigin(null)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("https://127.0.0.1")).toBe(true);
    expect(isAllowedOrigin("http://[::1]:3000")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.2:3000")).toBe(false);
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("requires raw loopback peer, Host, and Origin together", () => {
    const gate = new AgentToolsMcpLocalAccessGate();
    const request = (remoteAddress: string | undefined, host?: string, origin?: string) => ({
      raw: { socket: { remoteAddress } },
      headers: { host, origin },
    }) as never;

    expect(gate.validateRequest(request("127.0.0.1", "localhost:43124")).ok).toBe(true);
    expect(gate.validateRequest(request("::ffff:127.0.0.1", "[::1]:43124")).ok).toBe(true);
    expect(gate.validateRequest(request("192.168.1.50", "localhost:43124")).ok).toBe(false);
    expect(gate.validateRequest(request("127.0.0.1", "192.168.1.20:43124")).ok).toBe(false);
    expect(gate.validateRequest(request("127.0.0.1", undefined)).ok).toBe(false);
    expect(gate.validateRequest(request("127.0.0.1", "localhost", "https://evil.example")).ok)
      .toBe(false);
  });
});
