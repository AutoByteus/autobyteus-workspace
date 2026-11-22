import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgUnitsOwnRunsV1AppDataMigration } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";
import { validateAgentOrgContainerPayload } from "../../../src/run-history/store/agent-org-container-file-schema.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { MessageLog } from "../../../src/run-history/store/message-log.js";
import { unitLogFiles } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/org-log-split.js";
import { RootRunPackageCurrentValidator } from "../../../src/run-history/services/root-run-package-current-validator.js";
import { CREATED, ORG, P, PDP, SET, writeDelegatedRunNamingOrg, writeReleasedOrg, writeTaskNamingOrg } from "../../fixtures/app-data-migrations/released-org-tree-v1-fixtures.js";

/**
 * `20261122_agent_org_units_own_runs_v1` (org-teams-follow-definition, design DS-005, storage contract §1–§6, §9, §11; data
 * migration guideline §6, §7, §9): hand-built released Orgs, never real data or a copy of it.
 */
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const world = async () => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "org-units-migration-"));
  roots.push(appData);
  return { appData, memory: path.join(appData, "memory") };
};
const terminal = { getRecord: async () => ({ status: "SUCCEEDED" }) } as never;
const names = { agentDefinitionName: vi.fn(async () => null), teamDefinitionName: vi.fn(async (id: string) => id === "software-engineering-team" ? "Software Engineering Team" : null) };
const migration = (w: { appData: string; memory: string }, ledger = terminal) => new AgentOrgUnitsOwnRunsV1AppDataMigration(w.appData, w.memory, names, null, { ledger });
const json = async (file: string) => JSON.parse(await fs.readFile(file, "utf8")) as Record<string, any>;
const exists = (file: string) => fs.access(file).then(() => true, () => false);
const teamDir = (w: { memory: string }, id: string) => path.join(w.memory, "agent_teams", id);
describe("20261122_agent_org_units_own_runs_v1: a released Org becomes a container of runs", () => {
  it("contract §1–§4, §9: units keep their run IDs; folders are renamed, not copied; the files are today's shapes, read back by today's readers", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    const result = await migration(w).execute();
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1, failedCount: 0 } });
    const container = validateAgentOrgContainerPayload(await json(path.join(w.memory, "agent_orgs", ORG, "agent_org_run_execution_tree.json")), ORG);
    expect(container.rootOrg.units).toEqual([
      { address: P, kind: "agent_team", runId: SET, definitionId: "software-engineering-team" },
      { address: "/product_design_prototyping_team", kind: "agent_team", runId: PDP, definitionId: "product-design-prototyping-team" },
      { address: "/concierge", kind: "agent", runId: "concierge_1", definitionId: "concierge" },
    ]);
    // Org-level rules stay with the container; a rule wholly inside a Team goes to its Team file, in team space.
    expect(container.handoffs.map((rule) => `${rule.from}>${rule.to}`)).toEqual([`${P}/solution_designer>/product_design_prototyping_team/product_prototyper`, `/concierge>${P}`]);
    expect(container.rootOrg.defaultLaunchConfiguration).not.toHaveProperty("skillAccessMode");
    const set = (await new TeamRunExecutionTreeStore().read(teamDir(w, SET), SET))!;
    expect(set).toMatchObject({ containedIn: { orgRunId: ORG, address: P }, handoffs: [{ from: "/solution_designer", to: "/code_reviewer" }],
      rootTeam: { teamDefinitionName: "Software Engineering Team", coordinatorAddress: "/solution_designer",
        members: [{ address: "/solution_designer", agentRunId: "solution_designer_1" }, { address: "/code_reviewer", agentRunId: "code_reviewer_1",
          launchConfiguration: { llmModelIdentifier: "reviewer-model" } }] } });
    expect(set.rootTeam.members[0]!.launchConfiguration).not.toHaveProperty("skillAccessMode");
    // A Team definition no longer known: its definition ID names it.
    expect((await new TeamRunExecutionTreeStore().read(teamDir(w, PDP), PDP))!.rootTeam.teamDefinitionName).toBe("product-design-prototyping-team");
    const concierge = (await new AgentRunMetadataStore(w.memory).readMetadata("concierge_1"))!;
    expect(concierge).toMatchObject({ containedIn: { orgRunId: ORG, address: "/concierge" }, address: "/concierge", agentDefinitionId: "concierge",
      memoryDir: path.join(w.memory, "agents", "concierge_1"), applicationExecutionContext: null });
    // Member folders moved with their contents.
    expect(await fs.readFile(path.join(teamDir(w, SET), "code_reviewer_1", "raw_traces_active.jsonl"), "utf8")).toBe("{\"trace\":1}\n");
    expect(await fs.readFile(path.join(w.memory, "agents", "concierge_1", "raw_traces_active.jsonl"), "utf8")).toBe("{\"trace\":1}\n");
    expect(await exists(path.join(w.memory, "agent_orgs", ORG, SET))).toBe(false);
    // The released Task-records file stays as inert residue; the Org log is gone (the container has no log).
    expect(await exists(path.join(w.memory, "agent_orgs", ORG, "agent_org_task_delegation_records.json"))).toBe(true);
    expect(await exists(path.join(w.memory, "agent_orgs", ORG, "agent_org_communication_messages_active.jsonl"))).toBe(false);
    // Today's readiness admits the container and each unit (both ends of each unit reference).
    const scan = await new RootRunPackageCurrentValidator(w.memory).scan();
    expect(scan.groups.map((group) => `${group.family}:${group.id}`)).toEqual(expect.arrayContaining([`agent_org:${ORG}`, `agent_team:${SET}`, `agent_team:${PDP}`, "agent:concierge_1"]));
  });

  it("contract §5: the log is split: intra-Team to its Team; cross-unit to both with the other side's Org address; outside and user lines to the member's unit", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    await migration(w).execute();
    const read = async (dir: string, name: "team_communication_messages" | "communication_messages") => {
      const files = (await fs.readdir(dir)).filter((file) => file.startsWith(`${name}_active`));
      return files.length ? (await fs.readFile(path.join(dir, files[0]!), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
    };
    const set = await read(teamDir(w, SET), "team_communication_messages");
    const pdp = await read(teamDir(w, PDP), "team_communication_messages");
    const concierge = await read(path.join(w.memory, "agents", "concierge_1"), "communication_messages");
    expect(set.map((line) => [line.messageId, line.counterpart ?? null])).toEqual([
      ["m_intra", null], ["m_cross", { address: "/concierge", nodeId: null }], ["m_outside", { address: null, nodeId: null }]]);
    expect(concierge.map((line) => [line.messageId, line.counterpart ?? null])).toEqual([
      ["m_cross", { address: `${P}/solution_designer`, nodeId: null }],
      ["m_cross_back", { address: "/product_design_prototyping_team/product_prototyper", nodeId: null }],
      ["m_user", null]]);
    expect(pdp.map((line) => [line.messageId, line.counterpart ?? null])).toEqual([["m_cross_back", { address: "/concierge", nodeId: null }]]);
    // Today's strict log reader reads them back (every line a valid message).
    expect((await new MessageLog(teamDir(w, SET), "team_communication_messages").read())!.map((line) => line.messageId)).toEqual(["m_intra", "m_cross", "m_outside"]);
    expect((await new MessageLog(path.join(w.memory, "agents", "concierge_1"), "communication_messages").read())!.map((line) => line.messageId))
      .toEqual(["m_cross", "m_cross_back", "m_user"]);
  });

  it("contract §5: a unit log is written in today's rotated layout (sealed files at the limit, the rest active), read back by today's reader", async () => {
    const lines = Array.from({ length: 7 }, (_, index) => `${JSON.stringify({ messageId: `m${index}`, pad: "x".repeat(90) })}\n`);
    const files = unitLogFiles("communication_messages", lines, 300);
    expect(files.map((file) => [file.name, file.content.split("\n").filter(Boolean).length])).toEqual([
      ["communication_messages_000001.jsonl", 3], ["communication_messages_000002.jsonl", 3], ["communication_messages_active.jsonl", 1]]);
    expect(unitLogFiles("communication_messages", [], 300)).toEqual([{ name: "communication_messages_active.jsonl", content: "" }]);
    const w = await world();
    const big = Array.from({ length: 24 }, (_, index) => ({ messageId: `big-${index}`, senderAgentRunId: index % 2 ? "concierge_1" : "solution_designer_1",
      receiverAgentRunId: index % 2 ? "solution_designer_1" : "concierge_1", content: "x".repeat(400 * 1024), messageType: "agent_message", referenceFiles: [],
      createdAt: `2026-11-22T10:00:${String(index).padStart(2, "0")}.000Z` }));
    await writeReleasedOrg(w.memory, { log: big });
    await migration(w).execute();
    const conciergeDir = path.join(w.memory, "agents", "concierge_1");
    expect((await fs.readdir(conciergeDir)).filter((name) => name.startsWith("communication_messages")).sort()).toEqual([
      "communication_messages_000001.jsonl", "communication_messages_000002.jsonl", "communication_messages_active.jsonl"]);
    expect((await new MessageLog(conciergeDir, "communication_messages").read())!.map((line) => line.messageId)).toEqual(big.map((line) => line.messageId));
  });

  it("contract §6: delegations by a member name its unit run; an old one without a delegator, and a peer's, stay as they were", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    const task = await writeTaskNamingOrg(w.appData);
    const delegated = await writeDelegatedRunNamingOrg(w.memory);
    const result = await migration(w).execute();
    expect(result.summary.details[0]!.message).toContain("1 old delegation(s) without a delegator stay with the Org");
    const entries = (await json(task)).entries as Record<string, any>[];
    expect(entries.map((entry) => entry.delegatedFrom.delegatingRun)).toEqual([
      { kind: "agent", runId: "concierge_1" }, { kind: "agent_team", runId: SET }, { kind: "agent_org", runId: ORG }, { kind: "agent_org", runId: ORG }]);
    expect((await json(delegated)).delegatedFrom).toEqual({ delegatingRun: { kind: "agent", runId: "concierge_1" }, delegatorAgentRunId: "concierge_1" });
  });

  it("contract §4: an agent unit is in today's activation state: started when it can be restored as it ran, otherwise prepared", async () => {
    const { agentUnitLifecycle } = await import("../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/org-unit-targets.js");
    const agent = (platformAgentRunId: string | null) => ({ agentRunId: "concierge_1", platformAgentRunId }) as never;
    // An external runtime restores its provider conversation: started only with one (never its own run ID).
    expect(agentUnitLifecycle(agent("thread-1"), "codex_app_server", true, CREATED)).toEqual({ startedAt: CREATED });
    expect(agentUnitLifecycle(agent(null), "codex_app_server", true, CREATED)).toMatchObject({ preparedAt: CREATED, startedAt: null });
    expect(agentUnitLifecycle(agent("concierge_1"), "claude_agent_sdk", true, CREATED)).toMatchObject({ preparedAt: CREATED, startedAt: null });
    // The server runtime restores from its memory: started when it has a trace of its own.
    expect(agentUnitLifecycle(agent(null), "autobyteus", true, CREATED)).toEqual({ startedAt: CREATED });
    expect(agentUnitLifecycle(agent(null), "autobyteus", false, CREATED)).toMatchObject({ preparedAt: CREATED, startedAt: null });
    // In the converted file (the fixture's concierge: codex, no conversation yet), read by today's store.
    const w = await world();
    await writeReleasedOrg(w.memory);
    await migration(w).execute();
    expect(await new AgentRunMetadataStore(w.memory).readMetadata("concierge_1")).toMatchObject({ preparedAt: CREATED, startedAt: null });
  });

  it("contract §11: an application's Org: the Team unit carries its binding; the agent unit its application context", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory, { applicationBinding: { applicationId: "brief-studio", bindingId: "binding-1" } });
    await migration(w).execute();
    expect((await new TeamRunExecutionTreeStore().read(teamDir(w, SET), SET))!.applicationBinding).toEqual({ applicationId: "brief-studio", bindingId: "binding-1" });
    expect((await new AgentRunMetadataStore(w.memory).readMetadata("concierge_1"))!.applicationExecutionContext).toEqual({
      applicationId: "brief-studio", bindingId: "binding-1", producer: { agentRunId: "concierge_1", displayName: "concierge" } });
  });

  it.each([
    ["only direct agents", { teams: false }],
    ["only Teams", { agents: false }],
    ["released collaborators residue", { collaborators: true }],
    ["no log yet (never messaged)", { log: null }],
  ] as const)("every released shape: %s", async (_label, options) => {
    const w = await world();
    await writeReleasedOrg(w.memory, options as never);
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    const container = await json(path.join(w.memory, "agent_orgs", ORG, "agent_org_run_execution_tree.json"));
    expect(validateAgentOrgContainerPayload(container, ORG).rootOrg).not.toHaveProperty("collaborators");
  });

  it("guideline §7: an interrupted conversion continues: a unit already placed is recognized; a removed Org log is not written again", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    // First attempt fails after the Team units are placed and the logs written (the container write throws once).
    const realRename = fs.rename.bind(fs);
    let failed = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (!failed && String(to).endsWith("agent_org_run_execution_tree.json")) { failed = true; throw new Error("disk full"); }
      return realRename(from, to);
    });
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "FAILED", summary: { failedCount: 1 } });
    const teamLogBefore = await fs.readFile(path.join(teamDir(w, SET), "team_communication_messages_active.jsonl"), "utf8");
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    expect(await fs.readFile(path.join(teamDir(w, SET), "team_communication_messages_active.jsonl"), "utf8")).toBe(teamLogBefore);
    // Repeat start: already a container; nothing changes.
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, skippedCount: 1 } });
  });

  it("guideline §1, §6: an Org that cannot be converted fails alone and is not loaded; a folder without a tree is a preserved skip", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    await writeReleasedOrg(w.memory, { orgRunId: "broken_org" });
    await fs.writeFile(path.join(w.memory, "agent_orgs", "broken_org", "agent_org_run_execution_tree.json"), JSON.stringify({ rootOrg: { members: [{ address: 1 }] } }));
    await fs.mkdir(path.join(w.memory, "agent_orgs", "treeless_org"), { recursive: true });
    const result = await migration(w).execute();
    expect(result.status).toBe("FAILED");
    expect(result.summary.details.map((detail) => [detail.itemId, detail.status])).toEqual([["broken_org", "FAILED"], [ORG, "MIGRATED"], ["treeless_org", "SKIPPED"]]);
    const scan = await new RootRunPackageCurrentValidator(w.memory).scan();
    expect(scan.groups.some((group) => group.id === "broken_org")).toBe(false);
    expect(scan.groups.some((group) => group.id === ORG)).toBe(true);
  });

  it("guideline §4 reader rule: while a reader predecessor is not terminal, every Org is left as it is (waiting); an unconverted JSON log waits too", async () => {
    const w = await world();
    await writeReleasedOrg(w.memory);
    const failing = { getRecord: async (id: string) => ({ status: id === "20261015_collaborators_to_delegated_runs_v1" ? "FAILED" : "SUCCEEDED" }) } as never;
    const waited = await migration(w, failing).execute();
    expect(waited).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { skippedCount: 1 } });
    expect(waited.summary.details[0]!.message).toContain("waiting_for_20261015_collaborators_to_delegated_runs_v1");
    expect(await exists(path.join(w.memory, "agent_orgs", ORG, SET))).toBe(true);
    // A JSON log (append-only-message-logs-v1 not run on it): the Org waits.
    await fs.writeFile(path.join(w.memory, "agent_orgs", ORG, "agent_org_communication_messages.json"), "{}");
    const json = await migration(w).execute();
    expect(json.summary.details[0]).toMatchObject({ status: "SKIPPED", message: expect.stringContaining("20261018_append_only_message_logs_v1") });
  });

  it("guideline §9: the cost on a synthetic large Org (10 Teams, 40 agents, 40,000 log lines) is measured", async () => {
    const w = await world();
    const members = Array.from({ length: 10 }, (_, team) => ({ address: `/team_${team}`, teamDefinitionId: `team-${team}`, role: null, description: null,
      teamRunId: `team_run_${team}`, coordinatorAddress: `/team_${team}/a0`, defaultLaunchConfiguration: { runtimeKind: "codex_app_server", llmModelIdentifier: "m",
        llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" },
      members: Array.from({ length: 4 }, (_, agent) => ({ address: `/team_${team}/a${agent}`, agentDefinitionId: "a", role: null, description: null,
        agentRunId: `agent_${team}_${agent}`, platformAgentRunId: null, launchConfiguration: { runtimeKind: "codex_app_server", llmModelIdentifier: "m",
          llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" } })) }));
    const orgDir = path.join(w.memory, "agent_orgs", "large_org");
    await fs.mkdir(orgDir, { recursive: true });
    await fs.writeFile(path.join(orgDir, "agent_org_run_execution_tree.json"), JSON.stringify({ subjectKind: "agent_org", createdAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null, applicationBinding: null, handoffs: [], rootOrg: { address: "/", orgDefinitionId: "o", orgDefinitionName: "O", orgRunId: "large_org",
        defaultLaunchConfiguration: { runtimeKind: "codex_app_server", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" }, members } }));
    const lines = Array.from({ length: 40_000 }, (_, index) => JSON.stringify({ messageId: `m${index}`, senderAgentRunId: `agent_${index % 10}_0`,
      receiverAgentRunId: `agent_${(index + 1) % 10}_${index % 4}`, content: "x".repeat(200), messageType: "handoff", referenceFiles: [], createdAt: "2026-01-01T00:00:00.000Z" }));
    await fs.writeFile(path.join(orgDir, "agent_org_communication_messages_active.jsonl"), `${lines.join("\n")}\n`);
    const started = performance.now();
    await expect(migration(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    const elapsedMs = performance.now() - started;
    // Recorded as evidence (implementation handoff): one pass over the log, renames not copies.
    process.stdout.write(`[org-units-migration-cost] 10 Teams, 40 agents, 40000 lines (~9 MB): ${Math.round(elapsedMs)} ms\n`);
    expect(elapsedMs).toBeLessThan(60_000);
  });
});

