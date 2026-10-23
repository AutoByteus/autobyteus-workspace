/**
 * Settings → Agent Runtimes: Update is refused while that runtime's agents run, counting standalone agents and the
 * members of an Application's team (AC-004, DEC-003, SR-011/AR-008); and Application launch readiness for Codex and
 * Claude keeps its rules and reason texts now that it reads sign-in through `AgentRuntimeSignInReader`
 * (ticket runtime-lifecycle-review).
 *
 * Real studio server over HTTP. The Brief Studio sample application (its importable package, built by
 * `pnpm -C autobyteus-server-ts test:integration:prepare`) is imported through GraphQL, its launch settings are
 * read through REST, and its drafting team is launched through its own backend GraphQL, as its UI does. The runtime
 * CLIs are the scripted `tests/fixtures/agent-runtimes-fake-cli.mjs` (Codex app-server keeps each turn running, so
 * the agents stay live); no model, no account, no network.
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { createGraphqlClient, fakeRuntimeState, installVendorSourceStub, type AgentRuntimeRow } from "../helpers/agent-runtimes-e2e-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

const fake = await vi.hoisted(async () => {
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  return prepareFakeRuntimes({ label: "agent-runtimes-agents-e2e", grokInstalled: true });
});

const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");
const packageBuilt = fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"));
const CODEX = "codex_app_server";
const CLAUDE = "claude_agent_sdk";
const MODEL = "gpt-5.6-luna";

describe.skipIf(!packageBuilt)("Agent Runtimes running-agent count and Application launch readiness (real studio server, Brief Studio, scripted CLIs)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  let fastify: FastifyInstance;
  let url: URL;
  let sources: ReturnType<typeof installVendorSourceStub>;
  let client: ReturnType<typeof createGraphqlClient>;
  let applicationId = "";
  const workspace = path.join(fake.dataDir, "workspace");

  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const result = await client.post(query, variables);
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
    return result.data;
  };
  const rest = async (method: "GET" | "PUT" | "POST" | "DELETE", route: string, body?: unknown) => {
    const response = await sources.realFetch(new URL(`/rest${route}`, url), {
      method, headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  /** Brief Studio's own GraphQL, through the host's application backend route (as its UI calls it). */
  const appGraphql = (query: string, variables: Record<string, unknown>) =>
    rest("POST", `/applications/${encodeURIComponent(applicationId)}/backend/graphql`, { requestContext: { applicationId }, request: { query, variables } });
  const row = async (kind: string): Promise<AgentRuntimeRow> => (await client.rows())[kind]!;

  beforeAll(async () => {
    fs.mkdirSync(workspace, { recursive: true });
    states.set("codex-account", "signedIn");
    states.set("codex-models", MODEL);
    fs.writeFileSync(path.join(fake.dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\nAUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=${BRIEF_STUDIO_PACKAGE}\n`);
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    sources = installVendorSourceStub();
    const started = await startStudioE2eRuntimeServer();
    fastify = started.fastify;
    url = started.mainUrl;
    client = createGraphqlClient(url, sources.realFetch);
  }, 120_000);

  afterAll(async () => {
    // The Application's drafting run is still live: closing the server stops it.
    await fastify?.close();
    sources?.restore();
    // Let clients that were still starting finish before their commands are removed.
    await new Promise((resolve) => setTimeout(resolve, 500));
    fake.dispose();
  }, 120_000);

  const view = async () => {
    const response = await rest("GET", `/applications/${encodeURIComponent(applicationId)}/execution-resource-configurations`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body as { readiness: { status: string; issues: Array<{ code: string; message: string }> }; slots: any[] };
  };

  const threadStarts = () => (states.read("app-server-requests.log") ?? "").split("\n").filter((method) => method === "thread/start").length;
  const encodedId = () => encodeURIComponent(applicationId);
  let agentDefinitionId = "";
  const startStandaloneCodexAgent = async () => {
    const before = threadStarts();
    const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, {
      input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: CODEX },
    })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    await until(() => threadStarts() === before + 1, "the standalone agent's Codex thread started");
    return created.runId as string;
  };
  const terminateAgent = async (runId: string) => {
    const result = (await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
  };

  it("RA-01 Application launch readiness for Codex keeps its rule and reason text through the sign-in reader (SCN-A3)", async () => {
    const apps = await gql(`{ listApplications { id localApplicationId } }`);
    applicationId = apps.listApplications.find((app: any) => app.localApplicationId === "brief-studio").id;
    const ensured = await rest("POST", `/applications/${encodedId()}/backend/ensure-ready`);
    expect(ensured.status, JSON.stringify(ensured.body)).toBe(200);
    expect(ensured.body.state).toBe("ready");

    // Brief Studio's drafting team defaults to Codex: signed in → runnable.
    const signedIn = await view();
    expect(signedIn.slots[0].effectiveConfiguration.teamScopes[0]).toMatchObject({ runtimeKind: CODEX, llmModelIdentifier: MODEL });
    expect(signedIn.readiness).toEqual({ status: "RUNNABLE", issues: [] });

    states.set("codex-account", "signedOut");
    const signedOut = await view();
    expect(signedOut.readiness.status).toBe("HOST_REQUIREMENT_MISSING");
    expect(signedOut.readiness.issues.map((entry: any) => [entry.code, entry.memberAddress, entry.message])).toEqual(["/", "/researcher", "/writer"].map((address) =>
      ["RUNTIME_AUTHENTICATION_UNAVAILABLE", address, "Codex authentication is unavailable: no logged-in account."]));

    // DEC-008's state (no OpenAI sign-in required) stays launchable, as before.
    states.set("codex-account", "notRequired");
    expect((await view()).readiness).toEqual({ status: "RUNNABLE", issues: [] });
    states.set("codex-account", "signedIn");
  }, 120_000);

  it("RA-02 Application launch readiness for Claude: signed out (JSON + exit 1) keeps today's reason, signed in is runnable", async () => {
    const current = await view();
    const leaves = current.slots[0].effectiveConfiguration.leaves as Array<{ memberAddress: string; displayName: string; agentDefinitionId: string }>;
    const put = await rest("PUT", `/applications/${encodedId()}/execution-resource-configurations/draftingTeam`, {
      executionResourceRef: current.slots[0].slot.defaultExecutionResourceRef,
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: { runtimeKind: CLAUDE, llmModelIdentifier: "claude-fake-sonnet" },
        memberProfiles: leaves.map((leaf) => ({ memberAddress: leaf.memberAddress, displayName: leaf.displayName, agentDefinitionId: leaf.agentDefinitionId, runtimeKind: CLAUDE, llmModelIdentifier: "claude-fake-sonnet" })),
      },
    });
    expect(put.status, JSON.stringify(put.body).slice(0, 2000)).toBe(200);

    states.set("claude-account", "signedOut");
    const signedOut = await view();
    expect(signedOut.slots[0].effectiveConfiguration.teamScopes[0].runtimeKind).toBe(CLAUDE);
    expect(signedOut.readiness.status).toBe("HOST_REQUIREMENT_MISSING");
    // Today's text for a signed-out Claude: the empty stderr after the prefix (base adapter `describeFailure`).
    expect(new Set(signedOut.readiness.issues.map((entry: any) => `${entry.code}|${entry.message}`)))
      .toEqual(new Set(["RUNTIME_AUTHENTICATION_UNAVAILABLE|Claude authentication is unavailable: "]));

    states.set("claude-account", "signedIn");
    expect((await view()).readiness).toEqual({ status: "RUNNABLE", issues: [] });

    const removed = await rest("DELETE", `/applications/${encodedId()}/execution-resource-configurations/draftingTeam`);
    expect(removed.status).toBe(200);
    expect((await view()).slots[0].effectiveConfiguration.teamScopes[0].runtimeKind).toBe(CODEX);
  }, 120_000);

  it("RA-03 Update is refused while a standalone Codex agent runs and allowed once it has ended (AC-004)", async () => {
    agentDefinitionId = (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: "Runtime count agent", role: "assistant", description: "AC-004 standalone agent", instructions: "Help.", toolNames: [] } })).createAgentDefinition.id;
    await client.mutate("checkAgentRuntimes");
    await until(async () => (await row(CODEX)).updates.state === "UPDATE_AVAILABLE", "Codex has an update");

    const runId = await startStandaloneCodexAgent();
    const blocked = await row(CODEX);
    expect(blocked.runningAgentCount).toBe(1);
    expect((await row(CLAUDE)).runningAgentCount, "counts are per runtime").toBe(0);
    const refused = await client.mutate("updateAgentRuntime", CODEX);
    expect(refused.errors?.[0]).toMatchObject({ message: "Update unavailable while 1 agent(s) are running.", extensions: { code: "AGENT_RUNTIME_AGENTS_RUNNING" } });
    expect(states.pid("codex", "update"), "no updater was started").toBeNull();
    expect((await row(CODEX)).operation).toBeNull();

    await terminateAgent(runId);
    await until(async () => (await row(CODEX)).runningAgentCount === 0, "the ended agent is no longer counted");
    expect(await client.mutate("updateAgentRuntime", CODEX)).toEqual({ data: { updateAgentRuntime: true } });
    await until(async () => (await row(CODEX)).operation?.state === "SUCCEEDED", "Codex updated", 30_000);
    expect((await row(CODEX)).installedVersion).toBe("0.163.0");
  }, 120_000);

  it("RA-04 a live Application team member counts too: Brief Studio's drafting run blocks Codex's Update, alone and with a standalone agent (AC-004, SR-011/AR-008)", async () => {
    // A newer Codex is out again, so Update is offered.
    sources.answers.codex = { status: 302, body: "rust-v0.170.0" };
    states.set("codex-update-to", "0.170.0");
    // RA-03's update starts its own re-check (AR-006), which stays checking until Codex's sign-in is read; a check
    // started meanwhile skips the row and the re-check ends with the release it read. Press Check again until the
    // newer release shows, as a user would.
    await until(async () => {
      if ((await row(CODEX)).updates.state === "UPDATE_AVAILABLE") return true;
      await client.mutate("checkAgentRuntimes");
      return false;
    }, "Codex has an update again");
    expect((await row(CODEX)).runningAgentCount).toBe(0);

    const brief = await appGraphql(`mutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId } }`, { input: { title: "Runtime count brief" } });
    expect(brief.status, JSON.stringify(brief.body)).toBe(200);
    const before = threadStarts();
    const launched = await appGraphql(`mutation($input: LaunchDraftRunInput!) { launchDraftRun(input: $input) { briefId bindingId runId status } }`,
      { input: { briefId: brief.body.result.data.createBrief.briefId } });
    expect(launched.status, JSON.stringify(launched.body)).toBe(200);
    expect(launched.body.result.errors).toBeUndefined();
    expect(launched.body.result.data.launchDraftRun.status).toBe("ATTACHED");
    // The team's coordinator starts with the launch (its Codex thread); the writer starts when it is first needed.
    await until(() => threadStarts() === before + 1, "the coordinator's Codex thread started");
    await until(async () => (await row(CODEX)).runningAgentCount === 1, "the Application agent is counted");
    // The studio's own run manager does not hold it: only the application platform's count can see it.
    const studioTerminate = (await gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`,
      { id: launched.body.result.data.launchDraftRun.runId })).terminateAgentTeamRun;
    expect(studioTerminate).toEqual({ success: false, message: "Agent team run not found." });

    const refused = await client.mutate("updateAgentRuntime", CODEX);
    expect(refused.errors?.[0]).toMatchObject({ message: "Update unavailable while 1 agent(s) are running.", extensions: { code: "AGENT_RUNTIME_AGENTS_RUNNING" } });

    const runId = await startStandaloneCodexAgent();
    expect((await row(CODEX)).runningAgentCount).toBe(2);
    const refusedBoth = await client.mutate("updateAgentRuntime", CODEX);
    expect(refusedBoth.errors?.[0]).toMatchObject({ message: "Update unavailable while 2 agent(s) are running.", extensions: { code: "AGENT_RUNTIME_AGENTS_RUNNING" } });
    expect((await row(CODEX)).operation).toBeNull();
    // Another runtime is not blocked by Codex agents.
    expect((await row("antigravity_cli")).runningAgentCount).toBe(0);
    expect(await client.mutate("updateAgentRuntime", "antigravity_cli")).toEqual({ data: { updateAgentRuntime: true } });
    await until(async () => (await row("antigravity_cli")).operation?.state === "FAILED", "the Antigravity fake's update ended");

    await terminateAgent(runId);
    await until(async () => (await row(CODEX)).runningAgentCount === 1, "only the Application agent is left");
  }, 120_000);
});
