import { afterEach, describe, expect, it } from "vitest";
import {
  AgentToolsMcpLocalAccessGate,
  isLoopbackHostHeader,
} from "../../../../src/agent-tools/mcp/agent-tools-mcp-local-access.js";
import { resetNodeBrowserAccessForTests } from "../../../../src/api/security/node-browser-access.js";

const request = (remoteAddress: string | undefined, host?: string, origin?: string) => ({
  raw: { socket: { remoteAddress } },
  headers: { host, origin },
}) as never;

describe("AgentToolsMcpLocalAccessGate", () => {
  afterEach(() => {
    delete process.env.AUTOBYTEUS_ALLOWED_ORIGINS;
    resetNodeBrowserAccessForTests();
  });

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
    "localhost.evil.example:43124",
    "http://localhost:43124",
    "[::1]:0",
    "[::1]:70000",
    "",
  ])("rejects non-loopback or malformed Host %s", (host) => {
    expect(isLoopbackHostHeader(host)).toBe(false);
  });

  it("refuses localhost pages: a loopback Origin on any port is not a program (416 REQ-004)", () => {
    const gate = new AgentToolsMcpLocalAccessGate();
    for (const origin of ["http://localhost:3000", "https://127.0.0.1", "http://[::1]:3000", "http://127.0.0.2:3000", "null", "file://"]) {
      expect(gate.validateRequest(request("127.0.0.1", "127.0.0.1:43124", origin)).ok, origin).toBe(false);
    }
  });

  it("accepts an Origin listed in AUTOBYTEUS_ALLOWED_ORIGINS", () => {
    process.env.AUTOBYTEUS_ALLOWED_ORIGINS = "http://127.0.0.1:3000";
    resetNodeBrowserAccessForTests();
    const gate = new AgentToolsMcpLocalAccessGate();
    expect(gate.validateRequest(request("127.0.0.1", "127.0.0.1:43124", "http://127.0.0.1:3000")).ok).toBe(true);
    expect(gate.validateRequest(request("127.0.0.1", "127.0.0.1:43124", "http://127.0.0.1:3001")).ok).toBe(false);
  });

  it("requires raw loopback peer, Host, and Origin together", () => {
    const gate = new AgentToolsMcpLocalAccessGate();
    expect(gate.validateRequest(request("127.0.0.1", "localhost:43124")).ok).toBe(true);
    expect(gate.validateRequest(request("::ffff:127.0.0.1", "[::1]:43124")).ok).toBe(true);
    expect(gate.validateRequest(request("192.168.1.50", "localhost:43124")).ok).toBe(false);
    expect(gate.validateRequest(request("127.0.0.1", "192.168.1.20:43124")).ok).toBe(false);
    expect(gate.validateRequest(request("127.0.0.1", undefined)).ok).toBe(false);
    expect(gate.validateRequest(request("127.0.0.1", "localhost", "https://evil.example")).ok)
      .toBe(false);
  });
});
