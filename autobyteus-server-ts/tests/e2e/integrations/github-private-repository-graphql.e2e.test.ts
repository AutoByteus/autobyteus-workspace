/**
 * Private GitHub repositories through GraphQL, in process, with this node's own vault and a faked GitHub
 * (autobyteus-627; AC-001…AC-005, AC-007). The production composition is used: the agent package service builds its
 * GitHub client with `readNodeGitHubToken`, its real installer and the real `tar` extraction.
 *
 * 1. A fresh node: `githubConnection` is not connected; a private repository's import gives the "connect GitHub"
 *    text.
 * 2. `connectGitHub` refuses an empty and a rejected token (nothing is saved), then saves a good one, checked with
 *    GitHub's `/user`, without any imported GitHub integration.
 * 3. The import completes: every GitHub request goes without a token first (REST 404, codeload 404), then with the
 *    header of its host. The update check reads the head through ls-refs (401, then Basic).
 * 4. `disconnectGitHub` removes the token; the next check fails with the "connect GitHub" text and the installed
 *    content stays.
 * 5. Custody: neither token appears in any GraphQL response, in the captured output, in any file of the app data dir
 *    or in the vault's database file; no request URL carries a credential.
 */
import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { create } from "tar";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../../../src/agent-org-definition/services/agent-org-definition-service.js";
import { resetProcessAgentPackageDefinitionsForTests } from "../../../src/agent-package-definitions/services/agent-package-definitions.js";
import { DefinitionSourceRegistry } from "../../../src/collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../../../src/collaboration-definition-admission/services/definition-admission-service.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import { getSecretVaultRuntime, resetSecretVaultRuntimeForTests } from "../../../src/secret-management/secret-vault-runtime.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../src/integrations/github/github-rate-limit-gate.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";
import { archiveReadRevision, headReadRepository, headReadResponse } from "../helpers/github-head-read-stub.js";

const ACCEPTED_TOKEN_TEXT = "github_pat_E2E_ACCEPTED_TOKEN_TEXT_627";
const REJECTED_TOKEN_TEXT = "github_pat_E2E_REJECTED_TOKEN_627";
const OWNER = "acme";
const REPO = "private-pack-627";
const REPOSITORY_URL = `https://github.com/${OWNER}/${REPO}`;
const SHA = "f".repeat(40);
const NOT_VISIBLE = `GitHub repository not found, or it is private: ${REPOSITORY_URL}. To use a private repository, connect GitHub on this node.`;

type GraphqlResult = { data?: Record<string, unknown> | null; errors?: ReadonlyArray<{ message: string; extensions?: Record<string, unknown> }> };
type GitHubCall = { url: string; authorization: string | null };

const bearer = (token: string) => `Bearer ${token}`;
const basic = (token: string) => `Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;

describe("Private GitHub repositories through GraphQL (in process, faked GitHub)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let closeStudioServices: (() => void) | null = null;
  let suiteRoot: string;
  let archiveBytes: Buffer;
  const requests: GitHubCall[] = [];
  const responses: string[] = [];
  const output: string[] = [];

  /** GitHub for one private repository: invisible without a credential, readable with the good token. */
  const fakeGitHub = async (resource: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = resource instanceof URL ? resource.toString() : typeof resource === "string" ? resource : resource.url;
    const headers = new Headers(init?.headers);
    const authorization = headers.get("authorization");
    requests.push({ url, authorization });
    if (url === "https://api.github.com/user") {
      return authorization === bearer(ACCEPTED_TOKEN_TEXT) ? Response.json({ login: "octo-dev" }) : new Response(null, { status: 401 });
    }
    const good = authorization === bearer(ACCEPTED_TOKEN_TEXT) || authorization === basic(ACCEPTED_TOKEN_TEXT);
    if (headReadRepository(url, init) === `${OWNER}/${REPO}`) {
      return good ? headReadResponse(SHA) : new Response(null, { status: 401 });
    }
    if (!good) return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
    if (url === `https://api.github.com/repos/${OWNER}/${REPO}`) {
      return Response.json({ owner: { login: OWNER }, name: REPO, default_branch: "main", html_url: REPOSITORY_URL, private: true });
    }
    if (url === `https://api.github.com/repos/${OWNER}/${REPO}/branches/main`) return Response.json({ commit: { sha: SHA } });
    if (archiveReadRevision(url) === SHA) return new Response(new Uint8Array(archiveBytes));
    throw new Error(`unexpected request in the fake GitHub: ${url}`);
  };

  const run = async (source: string, variables?: Record<string, unknown>): Promise<GraphqlResult> => {
    const result = await graphql({ schema, source, variableValues: variables }) as GraphqlResult;
    responses.push(JSON.stringify(result));
    return result;
  };

  beforeAll(async () => {
    suiteRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "github-private-graphql-")));
    vi.stubEnv("AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "");
    fs.writeFileSync(path.join(suiteRoot, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: suiteRoot });
    // Loads the settings and the test database location (DATABASE_URL, set by the test setup) the vault opens.
    appConfigProvider.config.initialize();
    resetProcessAgentPackageDefinitionsForTests();
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(suiteRoot, "github", "rate-limit.json")));
    const agents = AgentDefinitionService.getInstance();
    const teams = AgentTeamDefinitionService.getInstance({ agentDefinitionService: agents });
    const orgs = new AgentOrgDefinitionService(undefined, agents, teams);
    closeStudioServices = configureE2eStudioApplicationApiServices({
      agentDefinitionService: agents, agentTeamDefinitionService: teams, agentOrgDefinitionService: orgs,
      definitionAdmissionService: new DefinitionAdmissionService({
        registry: new DefinitionSourceRegistry({ listImplementationOwnedTeamSources: async () => [] }), agents, teams, orgs,
      }),
    }).close;
    // As at server startup: this node's own vault, where connectGitHub stores the token.
    await resetSecretVaultRuntimeForTests();
    await getSecretVaultRuntime().initialize({ kind: "application", location: appConfigProvider.config.getOperationalDatabaseLocation() });

    // The package service as production composes it, over stores in this suite's data dir.
    AgentPackageService.resetInstance();
    AgentPackageService.getInstance({
      rootSettingsStore: new AgentPackageRootSettingsStore(
        { getAppDataDir: () => suiteRoot, getRegisteredAgentPackageRoots: () => (process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS ?? "")
          .split(",").map((entry) => entry.trim()).filter(Boolean), get: (key: string, fallback?: string) => process.env[key] ?? fallback },
        { updateSetting: (key: string, value: string) => { process.env[key] = value; return [true, "updated"]; } },
      ),
      registryStore: new AgentPackageRegistryStore({ getAppDataDir: () => suiteRoot }),
    });

    // The repository's archive: GitHub's layout (one top folder) with one shared agent.
    const archiveRoot = fs.mkdtempSync(path.join(os.tmpdir(), "github-private-archive-"));
    const agentDir = path.join(archiveRoot, `${REPO}-${SHA}`, "agents", "private-helper");
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, "agent.md"), "---\nname: Private Helper\ndescription: From a private repository\n---\n\nHelp.\n");
    fs.writeFileSync(path.join(agentDir, "agent-config.json"), "{}");
    const archiveFile = path.join(archiveRoot, "archive.tar.gz");
    await create({ gzip: true, file: archiveFile, cwd: archiveRoot, portable: true }, [`${REPO}-${SHA}`]);
    archiveBytes = fs.readFileSync(archiveFile);
    fs.rmSync(archiveRoot, { recursive: true, force: true });

    vi.stubGlobal("fetch", vi.fn(fakeGitHub));
    for (const stream of [process.stdout, process.stderr]) {
      const write = stream.write.bind(stream);
      vi.spyOn(stream, "write").mockImplementation(((chunk: unknown, ...rest: unknown[]) => {
        output.push(String(chunk));
        return (write as (...args: unknown[]) => boolean)(chunk, ...rest);
      }) as typeof stream.write);
    }

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const graphqlPath = require.resolve("graphql", { paths: [path.dirname(require.resolve("type-graphql"))] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  }, 120_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    closeStudioServices?.();
    AgentPackageService.resetInstance();
    setGitHubRateLimitGateForTests(null);
    await resetSecretVaultRuntimeForTests();
    appConfigProvider.resetForTests();
    await fsp.rm(suiteRoot, { recursive: true, force: true });
  });

  const IMPORT = `mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId path sourceKind sharedAgentCount
    updateInfo { status installedRevision latestRevision lastError } } }`;
  const CHECK = `mutation { checkAgentPackageUpdates { sourceKind path updateInfo { status installedRevision latestRevision lastError } } }`;
  const CONNECTION = "query { githubConnection { connected login } }";
  const CONNECT = "mutation($token: String!) { connectGitHub(token: $token) { connected login } }";

  it("connects GitHub from the import area, imports and checks a private repository, disconnects, and keeps every token out", async () => {
    // 1. A fresh node.
    expect(await run(CONNECTION)).toEqual({ data: { githubConnection: { connected: false, login: null } } });
    const refused = await run(IMPORT, { input: { sourceKind: "GITHUB_REPOSITORY", source: REPOSITORY_URL } });
    expect(refused.errors?.[0]?.message).toBe(NOT_VISIBLE);
    expect(requests.map((request) => [request.url, request.authorization])).toEqual([
      [`https://api.github.com/repos/${OWNER}/${REPO}`, null],
    ]);

    // 2. Connect: empty and rejected tokens save nothing; a good one is checked and saved (no imported integration).
    expect((await run(CONNECT, { token: "   " })).errors?.[0]?.extensions).toMatchObject({ code: "TOKEN_REQUIRED" });
    expect((await run(CONNECT, { token: REJECTED_TOKEN_TEXT })).errors?.[0]?.extensions).toMatchObject({ code: "TOKEN_REJECTED" });
    expect(await run(CONNECTION)).toEqual({ data: { githubConnection: { connected: false, login: null } } });
    expect(await run(CONNECT, { token: ` ${ACCEPTED_TOKEN_TEXT} ` })).toEqual({ data: { connectGitHub: { connected: true, login: "octo-dev" } } });
    expect(await run(CONNECTION)).toEqual({ data: { githubConnection: { connected: true, login: "octo-dev" } } });
    expect((await run("query { integrations { id } }")).data).toEqual({ integrations: [] });

    // 3. The import completes; each request goes without a token first, then with its host's header.
    requests.length = 0;
    const imported = await run(IMPORT, { input: { sourceKind: "GITHUB_REPOSITORY", source: REPOSITORY_URL } });
    expect(imported.errors).toBeUndefined();
    const githubPackage = (imported.data!.importAgentPackage as Array<Record<string, unknown>>)
      .find((entry) => entry.sourceKind === "GITHUB_REPOSITORY")!;
    expect(githubPackage).toMatchObject({ sharedAgentCount: 1, updateInfo: { installedRevision: SHA, lastError: null } });
    const installed = path.join(String(githubPackage.path), "agents", "private-helper", "agent.md");
    expect(fs.readFileSync(installed, "utf-8")).toContain("Private Helper");
    expect(requests.map((request) => [request.url, request.authorization])).toEqual([
      [`https://api.github.com/repos/${OWNER}/${REPO}`, null],
      [`https://api.github.com/repos/${OWNER}/${REPO}`, bearer(ACCEPTED_TOKEN_TEXT)],
      [`https://api.github.com/repos/${OWNER}/${REPO}/branches/main`, null],
      [`https://api.github.com/repos/${OWNER}/${REPO}/branches/main`, bearer(ACCEPTED_TOKEN_TEXT)],
      [`https://codeload.github.com/${OWNER}/${REPO}/tar.gz/${SHA}`, null],
      [`https://codeload.github.com/${OWNER}/${REPO}/tar.gz/${SHA}`, bearer(ACCEPTED_TOKEN_TEXT)],
    ]);

    requests.length = 0;
    const checked = await run(CHECK);
    expect(checked.errors).toBeUndefined();
    expect((checked.data!.checkAgentPackageUpdates as Array<Record<string, unknown>>).find((entry) => entry.sourceKind === "GITHUB_REPOSITORY"))
      .toMatchObject({ updateInfo: { status: "UP_TO_DATE", installedRevision: SHA, latestRevision: SHA, lastError: null } });
    expect(requests.map((request) => [request.url, request.authorization])).toEqual([
      [`https://github.com/${OWNER}/${REPO}.git/git-upload-pack`, null],
      [`https://github.com/${OWNER}/${REPO}.git/git-upload-pack`, basic(ACCEPTED_TOKEN_TEXT)],
    ]);

    // 4. Disconnect: the next check names the missing connection; the installed content stays.
    expect(await run("mutation { disconnectGitHub { connected login } }")).toEqual({ data: { disconnectGitHub: { connected: false, login: null } } });
    const failedCheck = await run(CHECK);
    expect((failedCheck.data!.checkAgentPackageUpdates as Array<Record<string, unknown>>).find((entry) => entry.sourceKind === "GITHUB_REPOSITORY"))
      .toMatchObject({ updateInfo: { status: "CHECK_FAILED", installedRevision: SHA, lastError: NOT_VISIBLE } });
    expect(fs.existsSync(installed)).toBe(true);

    // 5. Custody.
    const secrets = [ACCEPTED_TOKEN_TEXT, REJECTED_TOKEN_TEXT, basic(ACCEPTED_TOKEN_TEXT).slice(6), basic(REJECTED_TOKEN_TEXT).slice(6)];
    const leaks = (text: string) => secrets.some((secret) => text.includes(secret));
    expect(responses.filter(leaks)).toEqual([]);
    expect(output.filter(leaks)).toEqual([]);
    const filesWithSecret: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && leaks(fs.readFileSync(full).toString("latin1"))) filesWithSecret.push(full);
      }
    };
    walk(suiteRoot);
    // The vault's database holds the token only encrypted.
    const database = appConfigProvider.config.getOperationalDatabaseLocation().databasePath;
    for (const file of [database, `${database}-wal`]) {
      if (fs.existsSync(file) && leaks(fs.readFileSync(file).toString("latin1"))) filesWithSecret.push(file);
    }
    expect(filesWithSecret).toEqual([]);
    expect(requests.some((request) => request.url.includes("token=") || leaks(request.url))).toBe(false);
  }, 120_000);
});
