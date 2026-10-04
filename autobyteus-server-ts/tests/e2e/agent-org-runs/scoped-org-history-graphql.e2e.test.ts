import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type Json = Record<string, any>;
type Server = Awaited<ReturnType<typeof startBuiltTestServer>>;
const servers = new Set<Server>();
const targets: Array<{ runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> }> = [];
afterEach(async () => {
  try { for (const server of servers) await server.stop(); }
  finally {
    servers.clear();
    for (const target of targets.splice(0)) await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

const fields = "root_subject_kind root_run_id created_at archived_at is_active summary org";
const readRoot = async (server: Server, id: string) =>
  (await executeGraphql<Json>(server.serverUrl,
    `query($id: String!) { getAgentOrgRootHistory(orgRunId: $id) { ${fields} } }`, { id })).getAgentOrgRootHistory;
const readRoots = async (server: Server) =>
  (await executeGraphql<Json>(server.serverUrl,
    `query { listCollaborationRootHistory { ... on AgentOrgRootHistoryObject { ${fields} } } }`)).listCollaborationRootHistory;

// Real current built process, HTTP, admission, persisted packages and restart.
// The native repository model is deterministic domain-contract setup only: this is NOT
// Codex/GPT-6.1 Sol product/performance proof. No inference/message is submitted.
describe("scoped Org history real HTTP lifecycle", () => {
  it("reads one admitted root with collection parity, distinguishes null from errors, and preserves unrelated stored bytes and identities across Stop/restore/restart", async () => {
    const suffix = `scoped-org-history-${process.pid}-${Date.now()}`;
    const target = { runtimeRoot: path.join(testRuntimeRoot, suffix),
      database: resolveTestDatabaseLocation(`file:./db/${suffix}.db`) };
    targets.push(target);
    const home = path.join(target.runtimeRoot, "home");
    const workspace = path.join(target.runtimeRoot, "workspace");
    await Promise.all([home, workspace].map(dir => fs.mkdir(dir, { recursive: true, mode: 0o700 })));
    const start = async () => {
      const server = await startBuiltTestServer({ runtimeRoot: target.runtimeRoot,
        databaseUrlOverride: target.database.databaseUrl,
        environment: createSanitizedTestEnvironment({ HOME: home }) });
      servers.add(server); return server;
    };
    const first = await start();
    const gql = (query: string, variables = {}) => executeGraphql<Json>(first.serverUrl, query, variables);
    const catalog = await gql(`query { providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
      llmModels { modelIdentifier canonicalName configSchema }
    } }`);
    const model = catalog.providerModelCatalogSnapshots.flatMap((s: Json) => s.llmModels)
      .find((m: Json) => m.canonicalName === "gpt-5.6-luna" && m.configSchema?.properties?.reasoning_effort);
    expect(model, "deterministic repository model/schema prerequisite").toBeTruthy();
    const agent = (await gql(`mutation($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }`, { input: { name: suffix, role: "Owned fixture", description: "Scoped HTTP history regression",
      instructions: "Wait for explicit input.", category: "api-e2e" } })).createAgentDefinition;
    const org = (await gql(`mutation($input: CreateAgentOrgDefinitionInput!) {
      createAgentOrgDefinition(input: $input) { id }
    }`, { input: { name: suffix, description: "Owned Org", instructions: "Wait for explicit input.",
      members: ["lead", "worker"].map(memberName => ({ memberName, ref: agent.id,
        refType: "AGENT", refScope: "SHARED" })), handoffs: [] } })).createAgentOrgDefinition;
    const input = { agentOrgDefinitionId: org.id,
      rootConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: model.modelIdentifier,
        llmConfig: { reasoning_effort: "low" }, autoExecuteTools: false, workspaceRootPath: workspace },
      agentOverrides: [{ address: "/worker", configuration: { llmConfig: { reasoning_effort: "high" } } }] };
    const create = async (value = input) => (await gql(`mutation($input: CreateAgentOrgRunInput!) {
      createAgentOrgRun(input: $input) { success message agentOrgRunId }
    }`, { input: value })).createAgentOrgRun;
    const a = await create(); expect(a).toMatchObject({ success: true });
    const aId = a.agentOrgRunId;
    const activeA = await readRoot(first, aId);
    expect(activeA).toMatchObject({ root_subject_kind: "agent_org", root_run_id: aId, is_active: true });
    expect((await readRoots(first)).find((r: Json) => r.root_run_id === aId)).toEqual(activeA);
    const members = activeA.org.rootOrg.members;
    expect(members).toHaveLength(2);
    expect(new Set(members.map((m: Json) => m.agentRunId)).size).toBe(2);
    for (const member of members) {
      expect(member.agentRunId).toMatch(/_[0-9a-f]{32}$/);
      expect(member.platformAgentRunId).toBeNull(); // Launch did not activate a model.
      expect(member.launchConfiguration).toMatchObject({ runtimeKind: "autobyteus",
        llmModelIdentifier: model.modelIdentifier, autoExecuteTools: false, workspaceRootPath: workspace,
        llmConfig: { reasoning_effort: member.address === "/worker" ? "high" : "low" } });
    }
    const stop = async (id: string) => expect((await gql(`mutation($id: String!) {
      terminateAgentOrgRun(agentOrgRunId: $id) { success }
    }`, { id })).terminateAgentOrgRun.success).toBe(true);
    await stop(aId);
    const storedA = await readRoot(first, aId);
    expect(storedA).toMatchObject({ root_run_id: aId, is_active: false });
    const treeFile = path.join(target.runtimeRoot, "memory", "agent_orgs", aId, "agent_org_run_execution_tree.json");
    const bytes = await fs.readFile(treeFile);
    const b = await create(); expect(b).toMatchObject({ success: true });
    expect(b.agentOrgRunId).not.toBe(aId);
    expect(await readRoot(first, aId)).toEqual(storedA);
    expect(await fs.readFile(treeFile)).toEqual(bytes);
    expect(await readRoot(first, "unknown-owned-fixture")).toBeNull();
    const invalid = await fetch(`${first.serverUrl}/graphql`, { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `query { getAgentOrgRootHistory(orgRunId: " ") { root_run_id } }` }) });
    const invalidPayload = await invalid.json();
    expect(invalidPayload.errors?.[0].message).toContain("orgRunId is required");
    expect(await readRoot(first, aId)).toEqual(storedA);
    const badConfig = await create({ ...input, rootConfiguration: { ...input.rootConfiguration,
      llmConfig: { unsupported_setting: true } } });
    expect(badConfig).toMatchObject({ success: false, agentOrgRunId: null });
    expect(await fs.readFile(treeFile)).toEqual(bytes);
    const restored = await gql(`mutation($id: String!) {
      restoreAgentOrgRun(agentOrgRunId: $id) { success message agentOrgRunId }
    }`, { id: aId });
    expect(restored.restoreAgentOrgRun).toMatchObject({ success: true, agentOrgRunId: aId });
    expect(await readRoot(first, aId)).toMatchObject({ is_active: true });
    await stop(aId); await stop(b.agentOrgRunId);
    const beforeRestart = await readRoots(first);
    const settledBytes = await fs.readFile(treeFile);
    await first.stop(); servers.delete(first);
    const second = await start();
    expect(await readRoots(second)).toEqual(beforeRestart);
    expect(await readRoot(second, aId)).toEqual(beforeRestart.find((r: Json) => r.root_run_id === aId));
    expect(await fs.readFile(treeFile)).toEqual(settledBytes);
    expect((await readRoot(second, aId)).org.rootOrg.members.map((m: Json) => m.agentRunId))
      .toEqual(members.map((m: Json) => m.agentRunId));
  }, 180_000);
});
