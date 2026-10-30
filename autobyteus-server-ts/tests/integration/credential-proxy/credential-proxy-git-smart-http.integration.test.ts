/**
 * Real `git clone` and `git push` through the credential proxy (DS-003/DS-005), using only the run's shell variables:
 * git's `insteadOf` sends the git origin's remote to the proxy, and the proxy forwards git's smart-HTTP calls to a
 * local `git http-backend` that is the definition's git origin here (`https://github.com` in production). That upstream accepts only
 * `Basic x-access-token:<token>` (GitHub's git format), so a pass proves the format. A rejected token reaches git as a
 * 403, and git fails at once instead of prompting. Git runs with no system or global config, so no credential helper
 * of this machine is involved. Dummy values only.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { createCredentialProxyHost, type CredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { createGitHubDefinition, IntegrationDefinitions } from "../../../src/credential-proxy/integration-definitions.js";
import { IntegrationConnectionStore } from "../../../src/credential-proxy/integration-connection-store.js";

const TOKEN = "test-dummy-git-token-8812";
const EXPECTED_AUTH = `Basic ${Buffer.from(`x-access-token:${TOKEN}`).toString("base64")}`;
const HTTP_BACKEND = path.join(execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim(), "git-http-backend");

/** A `git http-backend` CGI server over `projectRoot` that answers 401 to anything but the expected Basic header. */
const startGitUpstream = (projectRoot: string, seenAuth: string[]) => http.createServer((request, response) => {
  seenAuth.push(request.headers.authorization ?? "");
  if (request.headers.authorization !== EXPECTED_AUTH) {
    response.writeHead(401, { "www-authenticate": 'Basic realm="GitHub"' });
    return response.end();
  }
  const url = new URL(request.url ?? "/", "http://upstream");
  const cgi = spawn(HTTP_BACKEND, [], { env: {
    GIT_PROJECT_ROOT: projectRoot, GIT_HTTP_EXPORT_ALL: "1", REMOTE_USER: "x-access-token",
    REQUEST_METHOD: request.method ?? "GET", PATH_INFO: decodeURIComponent(url.pathname), QUERY_STRING: url.search.slice(1),
    CONTENT_TYPE: request.headers["content-type"] ?? "", GIT_CONFIG_NOSYSTEM: "1", HOME: projectRoot,
  } });
  request.pipe(cgi.stdin);
  const chunks: Buffer[] = [];
  cgi.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
  cgi.on("close", () => {
    const output = Buffer.concat(chunks);
    const split = output.indexOf("\r\n\r\n");
    const head = output.subarray(0, split).toString("latin1").split("\r\n");
    const headers: Record<string, string> = {};
    let status = 200;
    for (const line of head) {
      const [name, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (name!.toLowerCase() === "status") status = Number.parseInt(value, 10);
      else headers[name!] = value;
    }
    response.writeHead(status, headers);
    response.end(output.subarray(split + 4));
  });
});

describe("git smart HTTP through the credential proxy", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "credential-proxy-git-"));
  const projectRoot = path.join(root, "upstream");
  const home = path.join(root, "home");
  const integrationsDir = path.join(root, "integrations");
  const seenAuth: string[] = [];
  let upstream: http.Server;
  let host: CredentialProxyHost;
  let token = TOKEN;
  let gitOrigin = "";

  /** Async, so the proxy and the upstream in this process keep serving while git runs. */
  const git = (args: string[], cwd: string, env: Readonly<Record<string, string>>) =>
    new Promise<{ status: number | null; stderr: string }>((resolve, reject) => {
      const child = spawn("git", args, {
        cwd,
        // A clean environment: no system or global git config, no terminal prompt, only the run's variables.
        env: { PATH: process.env.PATH ?? "", HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test",
          GIT_COMMITTER_EMAIL: "test@example.invalid", ...env },
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (status) => resolve({ status, stderr }));
    });

  beforeAll(async () => {
    fs.mkdirSync(home);
    fs.mkdirSync(path.join(projectRoot, "o"), { recursive: true });
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", path.join(projectRoot, "o", "r.git")]);
    execFileSync("git", ["-C", path.join(projectRoot, "o", "r.git"), "config", "http.receivepack", "true"]);
    const seed = path.join(root, "seed");
    for (const args of [["init", "-q", "-b", "main", seed], ["-C", seed, "commit", "-q", "--allow-empty", "-m", "seed"],
      ["-C", seed, "push", "-q", path.join(projectRoot, "o", "r.git"), "main"]]) {
      expect((await git(args, root, {})).status).toBe(0);
    }

    upstream = startGitUpstream(projectRoot, seenAuth);
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
    gitOrigin = origin;
    await new IntegrationConnectionStore(integrationsDir).update("github", (record) => ({
      ...record, login: "octo", connectedAt: "2026-10-30T00:00:00.000Z", agentDefinitionIds: ["agent-git"],
    }));
    host = createCredentialProxyHost({
      integrationsDir,
      definitions: new IntegrationDefinitions([createGitHubDefinition({ apiOrigin: origin, gitOrigin: origin })]),
      management: () => ({ resolveForUse: async () => SecretValue.fromString(token) }) as never,
    });
    await host.listen();
  }, 60_000);

  afterAll(async () => {
    await host?.close();
    await new Promise<void>((resolve) => upstream?.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("clones and pushes through the proxy, with GitHub's Basic format on every upstream call", async () => {
    const variables = host.runAccess.environmentForRun({ runId: "run-git", agentDefinitionId: "agent-git" }, {});
    const clone = path.join(root, "clone");

    // Git's redirection sends the git origin to this run's proxy route. Without it, git would reach the upstream
    // directly with no credentials and get 401.
    expect(variables["GIT_CONFIG_VALUE_0"]).toBe(`${gitOrigin}/`);
    expect(variables["GIT_CONFIG_KEY_0"]).toMatch(/^url\.http:\/\/127\.0\.0\.1:\d+\/r\/rp_[\w-]+\/github\/git\/\.insteadOf$/);

    const cloned = await git(["clone", "-q", `${gitOrigin}/o/r.git`, clone], root, variables);
    expect(cloned.status, cloned.stderr).toBe(0);
    expect((await git(["commit", "-q", "--allow-empty", "-m", "from the run"], clone, variables)).status).toBe(0);
    const pushed = await git(["push", "-q", "origin", "main"], clone, variables);
    expect(pushed.status, pushed.stderr).toBe(0);

    const upstreamLog = execFileSync("git", ["-C", path.join(projectRoot, "o", "r.git"), "log", "--format=%s", "main"], { encoding: "utf8" });
    expect(upstreamLog.trim().split("\n")).toEqual(["from the run", "seed"]);
    expect(seenAuth.length).toBeGreaterThanOrEqual(4);
    expect(new Set(seenAuth)).toEqual(new Set([EXPECTED_AUTH]));

    const activity = fs.readFileSync(path.join(integrationsDir, "activity.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(activity.map((entry) => `${entry.route} ${entry.method} ${entry.path} ${entry.status}`)).toEqual(expect.arrayContaining([
      "git GET /o/r.git/info/refs 200", "git POST /o/r.git/git-upload-pack 200", "git POST /o/r.git/git-receive-pack 200",
    ]));
    expect(JSON.stringify(activity)).not.toContain(TOKEN);
  });

  it("fails at once with 403 when GitHub rejects the stored token, without prompting", async () => {
    const variables = host.runAccess.environmentForRun({ runId: "run-git", agentDefinitionId: "agent-git" }, {});
    token = "test-dummy-revoked-token";
    try {
      const clone = path.join(root, "clone-rejected");
      const cloned = await git(["clone", "-q", `${gitOrigin}/o/r.git`, clone], root, variables);
      expect(cloned.status).not.toBe(0);
      expect(cloned.stderr).toContain("403");
      expect(cloned.stderr).not.toMatch(/Username for|Password for/);
    } finally {
      token = TOKEN;
    }
  });
});
