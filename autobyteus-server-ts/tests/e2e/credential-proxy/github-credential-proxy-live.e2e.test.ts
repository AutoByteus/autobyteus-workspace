/**
 * Live check (autobyteus-311): the GitHub credential proxy against real GitHub, with the GitHub test token.
 *
 * 1. Connect on a real built server with its own application vault (DS-001, the 244 pattern): the test token is sent
 *    once through `connectGitHubIntegration`, the server checks it with GitHub's `/user` and stores it. Then test,
 *    agent ticks and disconnect. The token appears in no response, no server output and no file under the runtime root.
 * 2. The proxy path (DS-002/DS-003/DS-005) in this process, over a temp vault holding the token after a real connect:
 *    a run's shell variables from the real run access, then, in a clean environment with only those variables,
 *    `curl` of issue #1 and `/user`, `gh api` with a full URL, and `git ls-remote` and `git clone` of
 *    `ryan-zheng-teki/autobyteus-mcp-test` through git's redirection. A run of an agent without access gets nothing.
 *    The token appears in no command output, the activity log or the connections file.
 * Gate: RUN_GITHUB_PROXY_E2E=1, with AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault holding `test.github.token`
 * (read-only). Without the secret the test is skipped with its reason (AUTOBYTEUS_LIVE_STRICT=1 fails instead). The
 * token expires 2026-11-25; after that GitHub refuses it (renew the token).
 * Prerequisites: network access to api.github.com and github.com; `curl`, `git` and `gh` on PATH; a current build
 * (`pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build`).
 * Command: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_PROXY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { afterAll, describe, expect, it } from "vitest";
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { ApplicationDatabaseLocation } from "../../../src/config/application-database-location.js";
import { SecretVaultBootstrap } from "../../../src/secret-management/bootstrap/secret-vault-bootstrap.js";
import { SecretVaultRepository } from "../../../src/secret-management/persistence/secret-vault-repository.js";
import { SecretManagementService } from "../../../src/secret-management/services/secret-management-service.js";
import { createCredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { IntegrationConnectionService } from "../../../src/credential-proxy/integration-connection-service.js";
import { IntegrationConnectionStore } from "../../../src/credential-proxy/integration-connection-store.js";
import { IntegrationDefinitions } from "../../../src/credential-proxy/integration-definitions.js";

const GATE = process.env["RUN_GITHUB_PROXY_E2E"] === "1";
const REPOSITORY = "ryan-zheng-teki/autobyteus-mcp-test";
const STATUS_FIELDS = "connected login connectedAt agentDefinitionIds";
const VAULT_TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY, nonce BLOB NOT NULL CHECK (length(nonce) = 12), ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL CHECK (length(authentication_tag) = 16));
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
    encryption_domain_id BLOB NOT NULL UNIQUE CHECK (length(encryption_domain_id) = 16),
    encryption_format_version INTEGER NOT NULL, verifier_nonce BLOB NOT NULL CHECK (length(verifier_nonce) = 12),
    verifier_ciphertext BLOB NOT NULL, verifier_authentication_tag BLOB NOT NULL CHECK (length(verifier_authentication_tag) = 16));
`;

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type Status = { connected: boolean; login: string | null; connectedAt: string | null; agentDefinitionIds: string[] };

/** Every file under `dir` whose bytes contain `secret` (paths only; the secret is never printed). */
const filesContaining = (dir: string, secret: string): string[] => {
  const found: string[] = [];
  const scan = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.isFile() && fs.readFileSync(full).includes(secret)) found.push(full);
    }
  };
  if (fs.existsSync(dir)) scan(dir);
  return found;
};

/** A command in a clean environment: PATH, a temp HOME without any git or gh config, and the given variables. */
const run = (command: string, args: string[], cwd: string, home: string, env: Readonly<Record<string, string>>) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: {
      PATH: process.env.PATH ?? "", HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", ...env,
    } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });

describe.skipIf(!GATE)("GitHub credential proxy against real GitHub (live)", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `github-proxy-live-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/github-proxy-live-${suffix}.db`);
  const localRoot = fs.mkdtempSync(path.join(os.tmpdir(), "github-proxy-live-"));
  let server: RunningTestServer | null = null;

  afterAll(async () => {
    if (server && server.child.exitCode === null) await server.stop().catch(() => server?.child.kill("SIGKILL"));
    await removeOwnedTestRuntime(runtimeRoot, database);
    fs.rmSync(localRoot, { recursive: true, force: true });
  }, 60_000);

  it("connects through GraphQL on a built server with its own vault, and never shows the token", async (context) => {
    const token = await readLiveTestSecret(context, "test.github.token");
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl });
    const responses: string[] = [];
    const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
      const response = await fetch(`${server!.serverUrl}/graphql`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
      });
      const text = await response.text();
      responses.push(text);
      const body = JSON.parse(text) as { data?: T; errors?: Array<{ message: string }> };
      if (!body.data || body.errors?.length) throw new Error(`GraphQL failed: ${(body.errors ?? []).map((error) => error.message).join("; ")}`);
      return body.data;
    };

    // The only place the token is revealed: the variable of this one request.
    const connected = (await gql<{ connectGitHubIntegration: Status }>(
      `mutation($token: String!) { connectGitHubIntegration(token: $token) { ${STATUS_FIELDS} } }`,
      { token: token.revealToTrustedConsumer() })).connectGitHubIntegration;
    expect(connected).toMatchObject({ connected: true, login: expect.any(String), connectedAt: expect.any(String) });
    expect((await gql<{ testGitHubIntegration: Status }>(`mutation { testGitHubIntegration { ${STATUS_FIELDS} } }`))
      .testGitHubIntegration.login).toBe(connected.login);
    expect((await gql<{ setGitHubIntegrationAgentAccess: Status }>(
      `mutation { setGitHubIntegrationAgentAccess(agentDefinitionIds: ["agent-live"]) { ${STATUS_FIELDS} } }`))
      .setGitHubIntegrationAgentAccess).toMatchObject({ connected: true, agentDefinitionIds: ["agent-live"] });
    expect((await gql<{ githubIntegration: Status }>(`query { githubIntegration { ${STATUS_FIELDS} } }`)).githubIntegration)
      .toMatchObject({ connected: true, login: connected.login });
    expect((await gql<{ disconnectGitHubIntegration: Status }>(`mutation { disconnectGitHubIntegration { ${STATUS_FIELDS} } }`))
      .disconnectGitHubIntegration).toEqual({ connected: false, login: null, connectedAt: null, agentDefinitionIds: ["agent-live"] });

    await server.stop();
    const output = server.output();
    server = null;
    const secret = token.revealToTrustedConsumer();
    // Only booleans and paths are reported, never the token.
    expect({
      inResponses: responses.some((text) => text.includes(secret)),
      inServerOutput: output.includes(secret),
      filesWithToken: filesContaining(runtimeRoot, secret),
    }).toEqual({ inResponses: false, inServerOutput: false, filesWithToken: [] });
  }, 180_000);

  it("gives a run's shell GitHub through the proxy: curl, gh api, git ls-remote and git clone", async (context) => {
    const token = await readLiveTestSecret(context, "test.github.token");
    const secret = token.revealToTrustedConsumer();
    const integrationsDir = path.join(localRoot, "integrations");
    const home = path.join(localRoot, "home");
    fs.mkdirSync(home, { recursive: true });
    fs.chmodSync(localRoot, 0o700);

    await shutdownPrisma();
    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl("file:application.db", localRoot);
    const db = new DatabaseSync(location.databasePath);
    db.exec(VAULT_TABLES);
    db.close();
    await initializePrisma({ datasourceUrl: location.databaseUrl });
    const repository = new SecretVaultRepository();
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    const management = new SecretManagementService(repository, bootstrap.rootKey, bootstrap.metadata, bootstrap.health);
    const host = createCredentialProxyHost({ integrationsDir, management: () => management });
    try {
      const connection = new IntegrationConnectionService({
        store: new IntegrationConnectionStore(integrationsDir), definitions: new IntegrationDefinitions(), management: () => management,
      });
      const connected = await connection.connect(token);
      await connection.setAgentAccess(["agent-live"]);
      await host.listen();

      expect(host.runAccess.environmentForRun({ runId: "run-other", agentDefinitionId: "agent-other" }, {})).toEqual({});
      const variables = host.runAccess.environmentForRun({ runId: "run-live", agentDefinitionId: "agent-live" }, {});
      const api = variables["AUTOBYTEUS_GITHUB_API_URL"]!;
      expect(api).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/r\/rp_[\w-]+\/github\/api$/);

      const issue = await run("curl", ["-sS", "-H", "Accept: application/vnd.github+json", `${api}/repos/${REPOSITORY}/issues/1`], localRoot, home, variables);
      expect(issue.status, issue.stderr).toBe(0);
      expect(JSON.parse(issue.stdout)).toMatchObject({ number: 1 });
      const user = await run("curl", ["-sS", `${api}/user`], localRoot, home, variables);
      expect(JSON.parse(user.stdout)).toMatchObject({ login: connected.login });
      // gh needs some token of its own before it sends anything; the proxy drops it and adds the stored one.
      const ghUser = await run("gh", ["api", `${api}/user`, "--jq", ".login"], localRoot, home, { ...variables, GH_TOKEN: "unused" });
      expect(ghUser.status, ghUser.stderr).toBe(0);
      expect(ghUser.stdout.trim()).toBe(connected.login);

      const remote = await run("git", ["ls-remote", `https://github.com/${REPOSITORY}.git`, "HEAD"], localRoot, home, variables);
      expect(remote.status, remote.stderr).toBe(0);
      expect(remote.stdout).toMatch(/^[0-9a-f]{40}\tHEAD/);
      const clone = await run("git", ["clone", "-q", "--depth", "1", `https://github.com/${REPOSITORY}.git`, "clone"], localRoot, home, variables);
      expect(clone.status, clone.stderr).toBe(0);
      expect(fs.existsSync(path.join(localRoot, "clone", ".git"))).toBe(true);

      const activity = fs.readFileSync(path.join(integrationsDir, "activity.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
      expect(activity.map((entry) => `${entry.route} ${entry.method} ${entry.status}`)).toEqual(expect.arrayContaining([
        "api GET 200", "git GET 200", "git POST 200",
      ]));
      expect({
        inCommandOutput: [issue, user, ghUser, remote, clone].some((result) => `${result.stdout}${result.stderr}`.includes(secret)),
        filesWithToken: filesContaining(integrationsDir, secret),
      }).toEqual({ inCommandOutput: false, filesWithToken: [] });
    } finally {
      await host.close();
      management.close();
      await shutdownPrisma();
    }
  }, 180_000);
});
