import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getNodeBrowserAccess,
  parseConfiguredHosts,
  parseConfiguredOrigins,
  resetNodeBrowserAccessForTests,
} from "../../../src/api/security/node-browser-access.js";

const SETTINGS = ["AUTOBYTEUS_ALLOWED_ORIGINS", "AUTOBYTEUS_ALLOWED_HOSTS", "AUTOBYTEUS_SERVER_HOST"];

afterEach(() => {
  for (const key of SETTINGS) delete process.env[key];
  resetNodeBrowserAccessForTests();
  vi.restoreAllMocks();
});

describe("parseConfiguredOrigins", () => {
  it("normalizes comma-separated web origins and reports invalid entries", () => {
    expect(parseConfiguredOrigins(" https://Gateway.Example/base , http://10.0.0.5:8080,,file://,null, ftp://x ")).toEqual({
      origins: ["https://gateway.example", "http://10.0.0.5:8080"],
      invalidEntries: ["file://", "null", "ftp://x"],
    });
    expect(parseConfiguredOrigins("")).toEqual({ origins: [], invalidEntries: [] });
  });
});

describe("parseConfiguredHosts (416 REQ-003)", () => {
  it("reads names and .suffix entries, normalized, and reports invalid entries", () => {
    expect(parseConfiguredHosts(" Node.Example.com , .corp.example,,node2., 10.0.0.5, http://x.example, x.example:8080, *.wild.example, ., .10.0.0.5, a..b ")).toEqual({
      names: ["node.example.com", "node2", "10.0.0.5"],
      suffixes: ["corp.example"],
      invalidEntries: ["http://x.example", "x.example:8080", "*.wild.example", ".", ".10.0.0.5", "a..b"],
    });
    expect(parseConfiguredHosts("")).toEqual({ names: [], suffixes: [], invalidEntries: [] });
  });
});

describe("getNodeBrowserAccess", () => {
  it("collects the hosts of the server URL, the allowed origins and the allowed hosts, once per process", () => {
    process.env.AUTOBYTEUS_SERVER_HOST = "https://Node.Company.Example:8443";
    process.env.AUTOBYTEUS_ALLOWED_ORIGINS = "https://gateway.example, http://127.0.0.1:3000";
    process.env.AUTOBYTEUS_ALLOWED_HOSTS = "proxy.example.com, .corp.example";
    const access = getNodeBrowserAccess();
    expect(access.allowedOrigins).toEqual(["https://gateway.example", "http://127.0.0.1:3000"]);
    expect([...access.allowedHostNames].sort()).toEqual(["127.0.0.1", "gateway.example", "node.company.example", "proxy.example.com"]);
    expect(access.allowedHostSuffixes).toEqual(["corp.example"]);

    process.env.AUTOBYTEUS_ALLOWED_HOSTS = "changed.example";
    expect(getNodeBrowserAccess()).toBe(access);
  });

  it("warns once per setting with invalid entries", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.AUTOBYTEUS_SERVER_HOST = "http://localhost:8000";
    process.env.AUTOBYTEUS_ALLOWED_ORIGINS = "null, file://";
    process.env.AUTOBYTEUS_ALLOWED_HOSTS = "http://x.example, *.y.example, ok.example";
    getNodeBrowserAccess();
    getNodeBrowserAccess();
    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
      "AUTOBYTEUS_ALLOWED_ORIGINS: ignoring entries that are not http(s) origins: null, file://",
      "AUTOBYTEUS_ALLOWED_HOSTS: ignoring entries that are not host names or .suffix entries: http://x.example, *.y.example",
    ]);
  });
});
