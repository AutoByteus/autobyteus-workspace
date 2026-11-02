/**
 * Live check (autobyteus-337, AC-003, AC-007, AC-008): GitHub through the Integrations page's flow, against real GitHub,
 * with the GitHub test token (Issues read/write on `ryan-zheng-teki/autobyteus-mcp-test` only).
 *
 * 1. On a real built server with its own application vault: import `https://github.com/AutoByteus/autobyteus-integrations`
 *    by its link through `importIntegrations` (a real download), connect GitHub through `connectIntegration` (the token is
 *    sent once; the server checks it with GitHub's `/user` and stores it), test it, then remove the source through
 *    `removeIntegrationSource`, which removes the connection too (DEC-015). The token appears in no response, no server
 *    output and no file under the runtime root.
 * 2. The teammate's way at the shell (AC-008), in this process over a temp data dir and vault: the same repository is
 *    imported by its link through the real skill-source service, GitHub is connected, an agent definition has the
 *    `github-integration` skill, and the real access rule gives its run the proxy's variables. In a clean environment
 *    with only those variables, the integration's own scripts run: `issues.sh list` and `issues.sh comment` on the test
 *    repository, through the proxy (activity records). An agent without the skill gets nothing; removing the skill
 *    refuses the next call. Then the same integration from a local folder copy: the GitHub source is removed (its
 *    connection goes), the folder is imported and connected, and `curl` reaches issue #1 through the proxy. The token
 *    appears in no command output and no file of the data dir.
 * Writes one comment on issue #1 of the test repository per run.
 * Gate: RUN_GITHUB_PROXY_E2E=1, with AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault holding `test.github.token`
 * (read-only). Without the secret the test is skipped with its reason (AUTOBYTEUS_LIVE_STRICT=1 fails instead). The
 * token expires 2026-11-25; after that GitHub refuses it (renew the token).
 * Prerequisites: network access to api.github.com, codeload.github.com and github.com; `bash`, `curl` and `jq` on PATH;
 * a current build (`pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build`).
 * Command: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_PROXY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { afterAll, describe, expect, it } from "vitest";
import type { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { SecretValue as ServerSecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { ApplicationDatabaseLocation } from "../../../src/config/application-database-location.js";
import { SecretVaultBootstrap } from "../../../src/secret-management/bootstrap/secret-vault-bootstrap.js";
import { SecretVaultRepository } from "../../../src/secret-management/persistence/secret-vault-repository.js";
import { SecretManagementService } from "../../../src/secret-management/services/secret-management-service.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { SkillSourceService } from "../../../src/skills/services/skill-source-service.js";
import { GitHubSkillSourceStore } from "../../../src/skills/stores/github-skill-source-store.js";
import { createCredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { DeliveryDefinitions } from "../../../src/credential-proxy/delivery-definitions.js";
import { IntegrationAccessRule } from "../../../src/credential-proxy/integration-access-rule.js";
import { IntegrationCatalog } from "../../../src/credential-proxy/integration-catalog.js";
import { IntegrationConnectionService } from "../../../src/credential-proxy/integration-connection-service.js";
import { IntegrationConnectionStore } from "../../../src/credential-proxy/integration-connection-store.js";

const GATE = process.env["RUN_GITHUB_PROXY_E2E"] === "1";
const INTEGRATIONS_REPOSITORY = "https://github.com/AutoByteus/autobyteus-integrations";
const REPOSITORY = "ryan-zheng-teki/autobyteus-mcp-test";
const CARD_FIELDS = "id state login skillName source { sourceId kind label }";
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
type Card = { id: string; state: string; login: string | null; skillName: string; source: { sourceId: string; kind: string; label: string } };

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
const run = (command: string, args: string[], cwd: string, home: string, env: Readonly<Record<string, string>>, input?: string) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"], env: {
      PATH: process.env.PATH ?? "", HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", ...env,
    } });
    let stdout = "";
    let stderr = "";
    if (!child.stdout || !child.stderr) throw new Error(`${command}: stdout and stderr are piped`);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    if (input !== undefined) child.stdin!.end(input);
  });

describe.skipIf(!GATE)("GitHub through the Integrations page against real GitHub (live)", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `github-proxy-live-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/github-proxy-live-${suffix}.db`);
  const localRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "github-proxy-live-")));
  let server: RunningTestServer | null = null;

  afterAll(async () => {
    if (server && server.child.exitCode === null) await server.stop().catch(() => server?.child.kill("SIGKILL"));
    await removeOwnedTestRuntime(runtimeRoot, database);
    fs.rmSync(localRoot, { recursive: true, force: true });
  }, 60_000);

  it("imports the integrations repository by its link on a built server, connects, tests, and removes it with its connection", async (context) => {
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

    const imported = (await gql<{ importIntegrations: Card[] }>(
      `mutation($location: String!) { importIntegrations(location: $location) { ${CARD_FIELDS} } }`,
      { location: INTEGRATIONS_REPOSITORY })).importIntegrations;
    expect(imported).toEqual([expect.objectContaining({ id: "github", state: "NEEDS_TOKEN", skillName: "github-integration",
      source: expect.objectContaining({ kind: "GITHUB_REPOSITORY", label: "AutoByteus/autobyteus-integrations" }) })]);

    // The only place the token is revealed: the variable of this one request.
    const connected = (await gql<{ connectIntegration: Card }>(
      `mutation($token: String!) { connectIntegration(id: "github", token: $token) { ${CARD_FIELDS} } }`,
      { token: token.revealToTrustedConsumer() })).connectIntegration;
    expect(connected).toMatchObject({ state: "CONNECTED", login: expect.any(String) });
    expect((await gql<{ testIntegration: Card }>(`mutation { testIntegration(id: "github") { ${CARD_FIELDS} } }`))
      .testIntegration.login).toBe(connected.login);

    const removal = (await gql<{ removeIntegrationSource: { removedConnectionNames: string[] } }>(
      "mutation($id: String!) { removeIntegrationSource(sourceId: $id) { removedConnectionNames } }",
      { id: imported[0]!.source.sourceId })).removeIntegrationSource;
    expect(removal.removedConnectionNames).toEqual(["GitHub"]);
    expect((await gql<{ integrations: Card[] }>("query { integrations { id } }")).integrations).toEqual([]);

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
  }, 240_000);

  it("runs the integration's own scripts through the proxy for an agent with its skill, from a GitHub source and a local folder (AC-008)", async (context) => {
    const token = await readLiveTestSecret(context, "test.github.token");
    const secret = token.revealToTrustedConsumer();
    // The test-support reader returns the autobyteus-ts source build's SecretValue; the server takes the package's own.
    const connectToken = ServerSecretValue.fromString(secret);
    fs.chmodSync(localRoot, 0o700);
    const dataDir = path.join(localRoot, "data");
    const skillsDir = path.join(dataDir, "skills");
    const integrationsDir = path.join(dataDir, "integrations");
    const home = path.join(localRoot, "home");
    for (const dir of [skillsDir, home]) fs.mkdirSync(dir, { recursive: true });

    let localPaths: string[] = [];
    const config = {
      getSkillsDir: () => skillsDir, getAppDataDir: () => dataDir, getAdditionalSkillsDirs: () => localPaths,
      getAdditionalAgentPackageRoots: () => [], getAgentOrgsDir: () => path.join(dataDir, "agent-orgs"), get: () => localPaths.join(","),
    };
    const sourceStore = new GitHubSkillSourceStore(dataDir);
    const skills = new SkillService({ config, sourceStore, isRuntimeDefaultSkillFolder: () => false });
    const skillSources = new SkillSourceService({ config, catalog: skills, store: sourceStore, invalidateWorkspaces: async () => undefined,
      updateSetting: (_key, value) => { localPaths = value.split(",").filter(Boolean); return [true, ""]; } });

    await shutdownPrisma();
    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl("file:application.db", localRoot);
    const db = new DatabaseSync(location.databasePath);
    db.exec(VAULT_TABLES);
    db.close();
    await initializePrisma({ datasourceUrl: location.databaseUrl });
    const repository = new SecretVaultRepository();
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    const management = new SecretManagementService(repository, bootstrap.rootKey, bootstrap.metadata, bootstrap.health);

    const definitions = new DeliveryDefinitions();
    const connections = new IntegrationConnectionService({
      store: new IntegrationConnectionStore(integrationsDir), definitions, management: () => management,
    });
    const catalog = new IntegrationCatalog({ skillSources, skills, connections, definitions });
    skillSources.setSourceChangeObserver(catalog);
    const agents = new Map<string, AgentDefinition>();
    const setAgent = (id: string, skillNames: string[]) =>
      agents.set(id, { id, name: id, description: "d", instructions: "i", skillNames } as unknown as AgentDefinition);
    setAgent("agent-live", ["github-integration"]);
    setAgent("agent-without", ["something-else"]);
    const access = new IntegrationAccessRule({
      catalog, definitions, skills, agentDefinitions: { getAgentDefinitionById: async (id) => agents.get(id) ?? null },
    });
    const host = createCredentialProxyHost({ integrationsDir, definitions, management: () => management, catalog, access, skillSources: null });
    const outputs: string[] = [];
    try {
      await host.listen();
      // From the repository link, as a teammate does on the page.
      expect((await catalog.import(INTEGRATIONS_REPOSITORY)).map((entry) => entry.id)).toEqual(["github"]);
      expect((await connections.connect("github", connectToken)).connected).toBe(true);

      expect(await host.runAccess.environmentForRun({ runId: "run-without", agentDefinitionId: "agent-without" }, {})).toEqual({});
      const env = await host.runAccess.environmentForRun({ runId: "run-live", agentDefinitionId: "agent-live" }, {});
      expect(env["AUTOBYTEUS_GITHUB_API_URL"]).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/r\/rp_[\w-]+\/github\/api$/);
      const scripts = path.join(skills.getSkill("github-integration")!.rootPath, "scripts");

      const listed = await run("bash", [path.join(scripts, "issues.sh"), "list", REPOSITORY, "--state", "all", "--limit", "100"], localRoot, home, env);
      outputs.push(listed.stdout, listed.stderr);
      expect(listed.status, listed.stderr).toBe(0);
      expect(listed.stdout).toMatch(new RegExp(`^${REPOSITORY}#1 `, "m"));

      const body = `AutoByteus integrations-page live check (autobyteus-337), ${new Date().toISOString()}. Automated; safe to ignore.`;
      const commented = await run("bash", [path.join(scripts, "issues.sh"), "comment", `${REPOSITORY}#1`, "--body-file", "-"], localRoot, home, env, body);
      outputs.push(commented.stdout, commented.stderr);
      expect(commented.status, commented.stderr).toBe(0);
      expect(commented.stdout).toMatch(new RegExp(`^commented on ${REPOSITORY}#1: https://github.com/`));

      const activity = () => fs.readFileSync(path.join(integrationsDir, "activity.jsonl"), "utf8").trim().split("\n")
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      expect(activity().filter((record) => record.runId === "run-live").map((record) => `${record.route} ${record.method} ${record.status}`))
        .toEqual(expect.arrayContaining(["api GET 200", "api POST 201"]));

      // The skill taken away from the agent: the run's next call is refused.
      setAgent("agent-live", []);
      const refused = await run("curl", ["-sS", `${env["AUTOBYTEUS_GITHUB_API_URL"]}/repos/${REPOSITORY}/issues/1`], localRoot, home, env);
      expect(JSON.parse(refused.stdout)).toMatchObject({ error: "INTEGRATION_NOT_ALLOWED",
        message: "This agent has no access to GitHub. Add the github-integration skill to the agent." });
      setAgent("agent-live", ["github-integration"]);

      // The same integration from a local folder copy: the GitHub source goes first, and its connection with it.
      const githubSource = catalog.sourceListings()[0]!;
      const localCopy = path.join(localRoot, "local-integrations");
      fs.cpSync(githubSource.rootPath, localCopy, { recursive: true });
      expect(await catalog.removeSource(githubSource.sourceId)).toEqual(["GitHub"]);
      expect((await connections.status("github")).connected).toBe(false);
      expect((await catalog.import(localCopy)).map((entry) => [entry.id, entry.state, entry.source.kind])).toEqual([["github", "NEEDS_TOKEN", "LOCAL_PATH"]]);
      await connections.connect("github", connectToken);
      const localEnv = await host.runAccess.environmentForRun({ runId: "run-local", agentDefinitionId: "agent-live" }, {});
      const issue = await run("curl", ["-sS", "-H", "Accept: application/vnd.github+json", `${localEnv["AUTOBYTEUS_GITHUB_API_URL"]}/repos/${REPOSITORY}/issues/1`], localRoot, home, localEnv);
      outputs.push(issue.stdout, issue.stderr);
      expect(JSON.parse(issue.stdout)).toMatchObject({ number: 1 });

      expect({
        inCommandOutput: outputs.some((text) => text.includes(secret)),
        filesWithToken: filesContaining(dataDir, secret).concat(filesContaining(localCopy, secret)),
      }).toEqual({ inCommandOutput: false, filesWithToken: [] });
    } finally {
      await connections.disconnect("github").catch(() => undefined);
      await host.close();
      management.close();
      await shutdownPrisma();
    }
  }, 300_000);
});
