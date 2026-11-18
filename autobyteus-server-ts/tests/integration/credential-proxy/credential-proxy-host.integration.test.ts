/**
 * The credential proxy end to end inside one process: the real loopback listener and routes, a run pass from the
 * real run access, and a fake upstream on `127.0.0.1` standing in for `api.github.com` and `github.com` (the
 * delivery definition's origins point at it). The access rule and catalog are stubs here (their own tests use the real
 * skill services). Covers every refusal before an upstream call with its text, the caller's credentials dropped, each
 * route's auth format, redaction, redirects, the git-only `401` → `403`, the activity records, revocation, and no log
 * line holding the pass. Dummy values only.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { createCredentialProxyHost, type CredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { createGitHubDeliveryDefinition, DeliveryDefinitions } from "../../../src/credential-proxy/delivery-definitions.js";

const TOKEN = "test-dummy-proxy-token-4471";
type Seen = { method: string; url: string; authorization: string | null; cookie: string | null; body: string };

describe("credential proxy host", () => {
  let upstream: http.Server;
  let upstreamOrigin = "";
  const seen: Seen[] = [];
  let dir = "";
  let host: CredentialProxyHost;
  let allowed: Set<string>;
  const grant = { integrationId: "github", skillName: "github-integration", sourceId: "local:/tmp/integrations" };
  let tokenStored = true;
  let consoleLines: string[] = [];

  beforeAll(async () => {
    upstream = http.createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        const url = request.url ?? "/";
        seen.push({ method: request.method ?? "", url, authorization: request.headers.authorization ?? null,
          cookie: request.headers.cookie ?? null, body: Buffer.concat(chunks).toString("utf8") });
        if (url.startsWith("/echo")) {
          response.writeHead(200, { "content-type": "application/json", "x-echo": `${request.headers.authorization}` });
          return response.end(JSON.stringify({ youSent: request.headers.authorization, body: Buffer.concat(chunks).toString("utf8") }));
        }
        if (url.startsWith("/renamed")) {
          response.writeHead(301, { location: `${upstreamOrigin}/repos/new-owner/new-name?page=2` });
          return response.end();
        }
        if (url.startsWith("/token-redirect")) {
          response.writeHead(302, { location: `${upstreamOrigin}/next?echo=${request.headers.authorization}` });
          return response.end();
        }
        if (url.startsWith("/download")) {
          response.writeHead(302, { location: "https://objects.example.invalid/signed?x=1" });
          return response.end();
        }
        if (url.startsWith("/unauthorized") || url.endsWith("/git-receive-pack")) {
          response.writeHead(401, { "content-type": "application/json", "www-authenticate": 'Basic realm="GitHub"' });
          return response.end(JSON.stringify({ message: "Bad credentials" }));
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, url }));
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    upstreamOrigin = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  beforeEach(async () => {
    seen.length = 0;
    tokenStored = true;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "credential-proxy-host-"));
    allowed = new Set(["agent-a"]);
    host = createCredentialProxyHost({
      integrationsDir: dir,
      definitions: new DeliveryDefinitions([createGitHubDeliveryDefinition({ apiOrigin: upstreamOrigin, gitOrigin: upstreamOrigin })]),
      access: {
        grantsForAgent: async (agentDefinitionId: string) => (allowed.has(agentDefinitionId) ? [grant] : []),
        allowsCall: async (agentDefinitionId: string) => allowed.has(agentDefinitionId),
      },
      catalog: {
        entries: () => [], isSourceRegistered: () => true,
        describe: (id: string) => (id === "github" ? { name: "GitHub", skillName: "github-integration" } : null),
        sourceRemoving: async () => undefined, sourceChanging: async () => undefined,
      },
      skillSources: null,
      management: () => ({
        resolveForUse: async () => {
          if (!tokenStored) throw new SecretVaultError("NOT_FOUND", false, "SECRET_NOT_FOUND");
          return SecretValue.fromString(TOKEN);
        },
      }) as never,
    });
    await host.listen();
    consoleLines = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { consoleLines.push(args.map(String).join(" ")); });
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await host.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const apiUrlFor = async (runId: string, agentDefinitionId = "agent-a"): Promise<string> =>
    (await host.runAccess.environmentForRun({ runId, agentDefinitionId }, {})).AUTOBYTEUS_GITHUB_API_URL!;
  const gitBaseFor = async (runId: string): Promise<string> => (await apiUrlFor(runId)).replace(/\/api$/, "/git");
  const passOf = (url: string): string => /\/r\/(rp_[^/]+)\//.exec(url)![1]!;
  const activity = (): Array<Record<string, unknown>> => {
    const file = path.join(dir, "activity.jsonl");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
  };
  const refused = async (response: Response, code: string) => {
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: code, message: expect.any(String) });
  };

  it("forwards an API call with the stored token as Bearer, dropping the caller's own credentials", async () => {
    const api = (await apiUrlFor("run-1"));
    const response = await fetch(`${api}/repos/o/r/issues?state=open`, {
      headers: { authorization: "Bearer forged-by-the-caller", cookie: "session=forged" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, url: "/repos/o/r/issues?state=open" });
    expect(seen).toEqual([expect.objectContaining({ authorization: `Bearer ${TOKEN}`, cookie: null })]);
    expect(activity()).toEqual([expect.objectContaining({
      runId: "run-1", agentDefinitionId: "agent-a", integrationId: "github", route: "api", method: "GET",
      path: "/repos/o/r/issues", status: 200,
    })]);
  });

  it("uses Basic x-access-token on the git route, and maps git's 401 to 403 so git never prompts", async () => {
    const gitBase = (await gitBaseFor("run-1"));
    const refs = await fetch(`${gitBase}/o/r.git/info/refs?service=git-upload-pack`);
    expect(refs.status).toBe(200);
    expect(seen[0]?.authorization).toBe(`Basic ${Buffer.from(`x-access-token:${TOKEN}`).toString("base64")}`);

    const push = await fetch(`${gitBase}/o/r.git/git-receive-pack`, { method: "POST", body: "pack-bytes" });
    expect(push.status).toBe(403);
    expect(await push.json()).toEqual({ error: "UPSTREAM_REJECTED_TOKEN",
      message: "GitHub rejected the stored token. Check it on the Integrations page." });
    expect(seen[1]).toMatchObject({ method: "POST", body: "pack-bytes" });
  });

  it("passes the API's own 401 through unchanged", async () => {
    const response = await fetch(`${(await apiUrlFor("run-1"))}/unauthorized`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Bad credentials" });
  });

  it("redacts an echo of the token in the body and the headers", async () => {
    const response = await fetch(`${(await apiUrlFor("run-1"))}/echo`, { method: "POST", body: JSON.stringify({ x: 1 }),
      headers: { "content-type": "application/json" } });
    const text = await response.text();
    expect(text).not.toContain(TOKEN);
    expect(JSON.parse(text)).toEqual({ youSent: "Bearer [REDACTED]", body: '{"x":1}' });
    expect(response.headers.get("x-echo")).toBe("Bearer [REDACTED]");
  });

  it("rewrites a same-origin redirect through the proxy, and passes another host's redirect unchanged", async () => {
    const api = (await apiUrlFor("run-1"));
    const renamed = await fetch(`${api}/renamed`, { redirect: "manual" });
    expect(renamed.status).toBe(301);
    expect(renamed.headers.get("location")).toBe(`${api}/repos/new-owner/new-name?page=2`);
    const download = await fetch(`${api}/download`, { redirect: "manual" });
    expect(download.headers.get("location")).toBe("https://objects.example.invalid/signed?x=1");
    const echoed = await fetch(`${api}/token-redirect`, { redirect: "manual" });
    expect(echoed.headers.get("location")).toBe(`${api}/next?echo=Bearer%20[REDACTED]`);
  });

  it.each([
    ["an unknown pass", (api: string) => api.replace(/rp_[^/]+/, "rp_unknown"), "RUN_PASS_INVALID"],
    ["a host-changing path", (api: string) => `${api}//evil.example/x`, "PATH_NOT_ALLOWED"],
    ["a path off the git route", (api: string) => `${api.replace(/\/api$/, "/git")}/o/r/settings`, "PATH_NOT_ALLOWED"],
    ["an unknown route", (api: string) => `${api.replace(/\/api$/, "/uploads")}/x`, "PATH_NOT_ALLOWED"],
  ])("refuses %s before any upstream call", async (_label, urlOf, code) => {
    await refused(await fetch(urlOf((await apiUrlFor("run-1")))), code);
    expect(seen).toEqual([]);
  });

  it.each([["/repos/%2e%2e/x"], ["/repos/../x"], ["/a\\b"]])("refuses the raw path %s (sent unnormalized)", async (rawPath) => {
    const api = new URL((await apiUrlFor("run-1")));
    const reply = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      http.get({ host: "127.0.0.1", port: api.port, path: `${api.pathname}${rawPath}` }, (response) => {
        let body = "";
        response.on("data", (chunk) => { body += chunk; });
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
      }).on("error", reject);
    });
    expect(reply.status).toBe(403);
    expect(JSON.parse(reply.body)).toMatchObject({ error: "PATH_NOT_ALLOWED" });
    expect(seen).toEqual([]);
  });

  it("refuses a run whose agent is not allowed, or was unticked after the run started", async () => {
    const api = (await apiUrlFor("run-1"));
    allowed.delete("agent-a");
    const response = await fetch(`${api}/user`);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "INTEGRATION_NOT_ALLOWED",
      message: "This agent has no access to GitHub. Add the github-integration skill to the agent." });
    expect(await host.runAccess.environmentForRun({ runId: "run-2", agentDefinitionId: "agent-a" }, {})).toEqual({});
    expect(seen).toEqual([]);
  });

  it("refuses when GitHub is not connected", async () => {
    tokenStored = false;
    const response = await fetch(`${(await apiUrlFor("run-1"))}/user`);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "INTEGRATION_NOT_CONNECTED",
      message: "GitHub is not connected on this node. Connect it on the Integrations page." });
    expect(seen).toEqual([]);
  });

  it("refuses a non-loopback Host header", async () => {
    const api = new URL((await apiUrlFor("run-1")));
    const status = await new Promise<number>((resolve, reject) => {
      http.get({ host: "127.0.0.1", port: api.port, path: `${api.pathname}/user`, headers: { host: "example.com" } },
        (response) => { response.resume(); resolve(response.statusCode ?? 0); }).on("error", reject);
    });
    expect(status).toBe(403);
    expect(seen).toEqual([]);
  });

  it("refuses a revoked pass", async () => {
    const api = (await apiUrlFor("run-1"));
    host.runPasses.revokeForRun("run-1");
    await refused(await fetch(`${api}/user`), "RUN_PASS_INVALID");
  });

  it("records every call without the token, the pass or the query, and logs no line with the pass", async () => {
    const api = (await apiUrlFor("run-1"));
    await fetch(`${api}/repos/o/r?secret=query`);
    await fetch(`${api}//evil.example`);
    await fetch(api.replace(/rp_[^/]+/, "rp_unknown") + "/user");
    const file = fs.readFileSync(path.join(dir, "activity.jsonl"), "utf8");
    expect(activity().map((entry) => [entry.status, entry.error ?? null])).toEqual([
      [200, null], [403, "PATH_NOT_ALLOWED"], [403, "RUN_PASS_INVALID"],
    ]);
    for (const forbidden of [TOKEN, passOf(api), "secret=query", "rp_unknown"]) expect(file).not.toContain(forbidden);
    expect(consoleLines.filter((line) => line.includes(passOf(api)) || line.includes(TOKEN))).toEqual([]);
  });
});
