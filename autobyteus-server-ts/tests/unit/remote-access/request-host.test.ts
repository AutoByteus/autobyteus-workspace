import { describe, expect, it, vi } from "vitest";
import { createRequestHostPolicy } from "../../../src/api/security/remote-access-request-host.js";
import { hostNameOfUrl, parseRequestHostName } from "../../../src/api/security/request-host-name.js";

// autobyteus-416 REQ-001…003, DEC-001 = A: the allowed-host rule.

describe("parseRequestHostName", () => {
  it.each([
    ["localhost", "localhost"],
    ["LocalHost:29695", "localhost"],
    ["node.local.:8000", "node.local"],
    ["192.168.1.25:29695", "192.168.1.25"],
    ["[::1]:29695", "::1"],
    ["[FD7A:115C:A1E0::1]", "fd7a:115c:a1e0::1"],
    ["::1", "::1"],
    ["  desktop.tail.ts.net  ", "desktop.tail.ts.net"],
  ])("parses %s as %s", (header, name) => {
    expect(parseRequestHostName(header)).toBe(name);
  });

  it.each([
    "",
    "http://localhost",
    "evil.example/path",
    "user@localhost",
    "a b",
    "localhost:0",
    "localhost:70000",
    "localhost:abc",
    "a:1:2",
    "[::1",
    "[nothost]:80",
    "localhost\\x",
  ])("refuses malformed %j", (header) => {
    expect(parseRequestHostName(header)).toBeNull();
  });

  it("reads the normalized host of a stored URL", () => {
    expect(hostNameOfUrl("https://Node.Corp.Example.:8443/base")).toBe("node.corp.example");
    expect(hostNameOfUrl("http://[::1]:29695")).toBe("::1");
    expect(hostNameOfUrl("not a url")).toBeNull();
  });
});

describe("RequestHostPolicy", () => {
  const build = (input: { names?: string[]; suffixes?: string[]; paired?: string[] } = {}) => {
    const isPairedPhoneHost = vi.fn(async (name: string) => (input.paired ?? []).includes(name));
    const policy = createRequestHostPolicy({
      allowedHostNames: new Set(input.names ?? []),
      allowedHostSuffixes: input.suffixes ?? [],
      isPairedPhoneHost,
    });
    return { policy, isPairedPhoneHost };
  };

  it("lets a request without Host behave as before", async () => {
    await expect(build().policy.isAllowed(undefined)).resolves.toBe(true);
  });

  it.each([
    "127.0.0.1:29695",
    "192.168.1.25:29695",
    "100.101.102.103",
    "8.8.8.8",
    "[::1]:29695",
    "[fd7a:115c:a1e0::1]:29695",
    "localhost:29695",
    "LOCALHOST",
    "x.localhost:3000",
    "mymac:29695",
    "mymac.local:29695",
    "router.lan",
    "nas.home.arpa",
    "host.docker.internal:8001",
    "svc.internal",
    "desktop.tail1234.ts.net",
    "mymac.local.:29695",
  ])("allows the class name %s with no setting and no lookup", async (host) => {
    const { policy, isPairedPhoneHost } = build();
    await expect(policy.isAllowed(host)).resolves.toBe(true);
    expect(isPairedPhoneHost).not.toHaveBeenCalled();
  });

  it.each([
    "evil.example:29695",
    "evil.example",
    "localhost.evil.example",
    "x.local.evil.example",
    "ts.net.evil.example",
    "evilts.net",
    "127.0.0.1.evil.example",
  ])("refuses the public name %s", async (host) => {
    await expect(build().policy.isAllowed(host)).resolves.toBe(false);
  });

  it("refuses a malformed Host without a lookup", async () => {
    const { policy, isPairedPhoneHost } = build({ paired: ["evil.example"] });
    await expect(policy.isAllowed("http://evil.example")).resolves.toBe(false);
    await expect(policy.isAllowed("")).resolves.toBe(false);
    expect(isPairedPhoneHost).not.toHaveBeenCalled();
  });

  it("allows configured names and .suffix entries on a label boundary (AC-003)", async () => {
    const { policy, isPairedPhoneHost } = build({ names: ["node.example.com"], suffixes: ["corp.example"] });
    for (const host of ["node.example.com", "NODE.example.com.:443", "corp.example", "a.corp.example", "a.b.corp.example:8443"]) {
      await expect(policy.isAllowed(host), host).resolves.toBe(true);
    }
    expect(isPairedPhoneHost).not.toHaveBeenCalled();
    for (const host of ["other.example.com", "evilcorp.example", "corp.example.evil"]) {
      await expect(policy.isAllowed(host), host).resolves.toBe(false);
    }
  });

  it("asks the pairing service only on a miss, with the normalized name", async () => {
    const { policy, isPairedPhoneHost } = build({ paired: ["phone.corp.example"] });
    await expect(policy.isAllowed("Phone.Corp.Example.:443")).resolves.toBe(true);
    expect(isPairedPhoneHost).toHaveBeenCalledWith("phone.corp.example");
    await expect(policy.isAllowed("other.corp.example")).resolves.toBe(false);
    expect(isPairedPhoneHost).toHaveBeenCalledTimes(2);
  });
});
