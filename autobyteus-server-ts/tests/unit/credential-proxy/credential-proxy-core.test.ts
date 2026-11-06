/**
 * The credential proxy's pure parts: the GitHub delivery definition (routes, path rules, shell variables, token check),
 * the caller-path checks and upstream URL, the run passes with their grants, the run access (grants from the access
 * rule), and the connections store. Dummy values only.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { buildUpstreamUrl, parseCallerPath } from "../../../src/credential-proxy/credential-proxy-forwarder.js";
import { createGitHubDeliveryDefinition, DeliveryDefinitions } from "../../../src/credential-proxy/delivery-definitions.js";
import { IntegrationConnectionStore } from "../../../src/credential-proxy/integration-connection-store.js";
import { DefaultIntegrationRunAccess } from "../../../src/credential-proxy/integration-run-access.js";
import { RunPassRegistry } from "../../../src/credential-proxy/run-pass-registry.js";
import { RegistryRunPassRevocation } from "../../../src/credential-proxy/run-pass-revocation.js";

const github = createGitHubDeliveryDefinition();
const api = github.routes.api!;
const git = github.routes.git!;

describe("GitHub delivery definition", () => {
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

describe("GitHub token check", () => {
  const TOKEN = SecretValue.fromString("test-dummy-check-token");
  it("answers the login, a rejection on 401, and unchecked when GitHub can't answer", async () => {
    const fetchWith = (response: Response | Error) => vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }) as unknown as typeof fetch;
    const accepted = fetchWith(Response.json({ login: "octo" }));
    expect(await github.verifyToken(TOKEN, accepted)).toEqual({ status: "accepted", login: "octo" });
    expect(vi.mocked(accepted).mock.calls[0]![1]).toMatchObject({ redirect: "manual" });
    expect(await github.verifyToken(TOKEN, fetchWith(new Response("{}", { status: 401 })))).toEqual({ status: "rejected" });
    expect(await github.verifyToken(TOKEN, fetchWith(new Response("{}", { status: 502 })))).toEqual({ status: "unchecked" });
    expect(await github.verifyToken(TOKEN, fetchWith(new TypeError("fetch failed")))).toEqual({ status: "unchecked" });
  });
});

describe("run passes and run access", () => {
  let dir = "";
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "credential-proxy-core-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });
  const grant = { integrationId: "github", skillName: "github-integration", sourceId: "local:/tmp/integrations" };

  it("issues one unguessable pass per run, reuses it with the latest grants, and revokes it idempotently", () => {
    const passes = new RunPassRegistry();
    const first = passes.issue({ runId: "run-1", agentDefinitionId: "agent-a" }, [grant]);
    expect(first).toMatch(/^rp_[A-Za-z0-9_-]{43}$/);
    expect(passes.lookup(first)?.grants.get("github")).toEqual(grant);
    expect(passes.issue({ runId: "run-1", agentDefinitionId: "agent-a" }, [])).toBe(first);
    expect(passes.lookup(first)?.grants.size).toBe(0);
    expect(passes.issue({ runId: "run-2", agentDefinitionId: "agent-a" }, [grant])).not.toBe(first);
    passes.revoke("run-1");
    passes.revoke("run-1");
    expect(passes.lookup(first)).toBeNull();
    expect(passes.issue({ runId: "run-1", agentDefinitionId: "agent-a" }, [grant])).not.toBe(first);
  });

  it("gives variables and a pass only to runs the access rule grants, and clears an active pass's grants otherwise", async () => {
    const passes = new RunPassRegistry();
    const grantsForAgent = vi.fn(async (agentDefinitionId: string) => (agentDefinitionId === "agent-a" ? [grant] : []));
    const access = new DefaultIntegrationRunAccess({
      access: { grantsForAgent }, definitions: new DeliveryDefinitions(), passes, proxyBaseUrl: () => "http://127.0.0.1:5000",
    });

    expect(await access.environmentForRun({ runId: "run-b", agentDefinitionId: "agent-b" }, {})).toEqual({});
    const env = await access.environmentForRun({ runId: "run-a", agentDefinitionId: "agent-a" }, {});
    const pass = /\/r\/(rp_[^/]+)\//.exec(env.AUTOBYTEUS_GITHUB_API_URL ?? "")?.[1];
    expect(pass && passes.lookup(pass)?.grants.get("github")).toEqual(grant);

    // The same run prepared again after the skill was removed: its pass stays but grants nothing.
    grantsForAgent.mockResolvedValueOnce([]);
    expect(await access.environmentForRun({ runId: "run-a", agentDefinitionId: "agent-a" }, {})).toEqual({});
    expect(passes.lookup(pass!)?.grants.size).toBe(0);
    new RegistryRunPassRevocation(passes).revokeForRun("run-a");
    expect(passes.lookup(pass!)).toBeNull();
  });

  it("reads a missing or malformed connections file as not connected, and keeps it until a save", async () => {
    const store = new IntegrationConnectionStore(dir);
    expect(store.read("github")).toEqual({ login: null, connectedAt: null });
    fs.writeFileSync(path.join(dir, "connections.json"), "{not json");
    expect(store.read("github")).toEqual({ login: null, connectedAt: null });
    expect(fs.readFileSync(path.join(dir, "connections.json"), "utf8")).toBe("{not json");
    await store.update("github", () => ({ login: "octo", connectedAt: "2026-11-01T00:00:00.000Z" }));
    expect(store.read("github")).toEqual({ login: "octo", connectedAt: "2026-11-01T00:00:00.000Z" });
  });

  it("reads a beta.4 entry (with agent ticks) as its login, and drops the ticks at the next write", async () => {
    fs.writeFileSync(path.join(dir, "connections.json"), JSON.stringify({ integrations: { github: {
      login: "octo", connectedAt: "2026-10-30T00:00:00.000Z", agentDefinitionIds: ["agent-a"] } } }));
    const store = new IntegrationConnectionStore(dir);
    expect(store.read("github")).toEqual({ login: "octo", connectedAt: "2026-10-30T00:00:00.000Z" });
    await store.update("github", (record) => ({ ...record, login: "octo-renamed" }));
    expect(JSON.parse(fs.readFileSync(path.join(dir, "connections.json"), "utf8"))).toEqual({ integrations: { github: {
      login: "octo-renamed", connectedAt: "2026-10-30T00:00:00.000Z" } } });
  });
});
