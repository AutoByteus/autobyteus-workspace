/**
 * The credential proxy's pure parts: the GitHub definition (routes, path rules, shell variables), the caller-path
 * checks and upstream URL (AR-003), the run passes, and the run access decision. Dummy values only.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildUpstreamUrl, parseCallerPath } from "../../../src/credential-proxy/credential-proxy-forwarder.js";
import { createGitHubDefinition, IntegrationDefinitions } from "../../../src/credential-proxy/integration-definitions.js";
import { IntegrationConnectionStore } from "../../../src/credential-proxy/integration-connection-store.js";
import { DefaultIntegrationRunAccess } from "../../../src/credential-proxy/integration-run-access.js";
import { RunPassRegistry } from "../../../src/credential-proxy/run-pass-registry.js";

const github = createGitHubDefinition();
const api = github.routes.api!;
const git = github.routes.git!;

describe("GitHub definition", () => {
  it("allows the API's methods on any path, and only git's smart-HTTP endpoints on the git route", () => {
    expect(api.allows("GET", "/repos/o/r/issues")).toBe(true);
    expect(api.allows("DELETE", "/repos/o/r/labels/x")).toBe(true);
    expect(api.allows("OPTIONS", "/")).toBe(false);
    expect(git.allows("GET", "/o/r.git/info/refs")).toBe(true);
    expect(git.allows("GET", "/o/r/info/refs")).toBe(true);
    expect(git.allows("POST", "/o/r.git/git-upload-pack")).toBe(true);
    expect(git.allows("POST", "/o/r.git/git-receive-pack")).toBe(true);
    expect(git.allows("POST", "/o/r.git/info/refs")).toBe(false);
    expect(git.allows("GET", "/o/r.git/info/lfs/objects")).toBe(false);
    expect(git.allows("GET", "/o/r/archive/main.zip")).toBe(false);
  });

  it("gives the shell the API address and git's redirection after any existing git config", () => {
    expect(github.shellVariables("http://127.0.0.1:5000", "rp_X", {})).toEqual({
      AUTOBYTEUS_GITHUB_API_URL: "http://127.0.0.1:5000/r/rp_X/github/api",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "url.http://127.0.0.1:5000/r/rp_X/github/git/.insteadOf",
      GIT_CONFIG_VALUE_0: "https://github.com/",
      GIT_TERMINAL_PROMPT: "0",
    });
    expect(github.shellVariables("http://127.0.0.1:5000", "rp_X", { GIT_CONFIG_COUNT: "2" })).toMatchObject({
      GIT_CONFIG_COUNT: "3",
      GIT_CONFIG_KEY_2: "url.http://127.0.0.1:5000/r/rp_X/github/git/.insteadOf",
    });
  });
});

describe("caller path checks (AR-003)", () => {
  it.each([
    ["//evil.example/x"],
    ["/repos//issues"],
    ["/../x"],
    ["/repos/%2e%2e/x"],
    ["/repos/%2E%2E/x"],
    ["/repos/./x"],
    ["/repos\\x"],
    ["/repos/%5cx"],
    ["/repos/a%2fb"],
    ["/repos/%zz"],
  ])("refuses %s", (rawPath) => {
    expect(() => buildUpstreamUrl(api, "GET", rawPath)).toThrow(expect.objectContaining({ code: "PATH_NOT_ALLOWED" }));
  });

  it("keeps the path and query on the route's own origin", () => {
    expect(buildUpstreamUrl(api, "GET", "/repos/o/r/issues?state=open&per_page=5").toString())
      .toBe("https://api.github.com/repos/o/r/issues?state=open&per_page=5");
    expect(buildUpstreamUrl(api, "POST", "/graphql").toString()).toBe("https://api.github.com/graphql");
    expect(buildUpstreamUrl(git, "GET", "/o/r.git/info/refs?service=git-upload-pack").origin).toBe("https://github.com");
    expect(parseCallerPath("/repos/o/r/")).toEqual({ path: "/repos/o/r/", search: "" });
  });

  it("refuses a path off the route's rules", () => {
    expect(() => buildUpstreamUrl(git, "GET", "/o/r/settings")).toThrow(expect.objectContaining({ code: "PATH_NOT_ALLOWED" }));
  });
});

describe("run passes and run access", () => {
  let dir = "";
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "credential-proxy-core-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("issues one unguessable pass per run, reuses it while active, and revokes it idempotently", () => {
    const passes = new RunPassRegistry();
    const first = passes.issue({ runId: "run-1", agentDefinitionId: "agent-a" });
    expect(first).toMatch(/^rp_[A-Za-z0-9_-]{43}$/);
    expect(passes.issue({ runId: "run-1", agentDefinitionId: "agent-a" })).toBe(first);
    expect(passes.issue({ runId: "run-2", agentDefinitionId: "agent-a" })).not.toBe(first);
    expect(passes.lookup(first)).toEqual({ runId: "run-1", agentDefinitionId: "agent-a" });
    passes.revoke("run-1");
    passes.revoke("run-1");
    expect(passes.lookup(first)).toBeNull();
    expect(passes.issue({ runId: "run-1", agentDefinitionId: "agent-a" })).not.toBe(first);
  });

  it("gives variables and a pass only to runs of allowed agents", async () => {
    const store = new IntegrationConnectionStore(dir);
    await store.update("github", (record) => ({ ...record, agentDefinitionIds: ["agent-a"] }));
    const passes = new RunPassRegistry();
    const access = new DefaultIntegrationRunAccess({
      store, definitions: new IntegrationDefinitions(), passes, proxyBaseUrl: () => "http://127.0.0.1:5000",
    });

    expect(access.environmentForRun({ runId: "run-b", agentDefinitionId: "agent-b" }, {})).toEqual({});
    const env = access.environmentForRun({ runId: "run-a", agentDefinitionId: "agent-a" }, {});
    const pass = /\/r\/(rp_[^/]+)\//.exec(env.AUTOBYTEUS_GITHUB_API_URL ?? "")?.[1];
    expect(pass && passes.lookup(pass)).toEqual({ runId: "run-a", agentDefinitionId: "agent-a" });
    access.revokeForRun("run-a");
    expect(passes.lookup(pass!)).toBeNull();
  });

  it("reads a missing or malformed connections file as not connected, and keeps it until a save", async () => {
    const store = new IntegrationConnectionStore(dir);
    expect(store.read("github")).toEqual({ login: null, connectedAt: null, agentDefinitionIds: [] });
    fs.writeFileSync(path.join(dir, "connections.json"), "{not json");
    expect(store.allowedIntegrations("agent-a")).toEqual([]);
    expect(fs.readFileSync(path.join(dir, "connections.json"), "utf8")).toBe("{not json");
    await store.update("github", (record) => ({ ...record, agentDefinitionIds: ["agent-a"] }));
    expect(store.isAllowed("agent-a", "github")).toBe(true);
  });
});
