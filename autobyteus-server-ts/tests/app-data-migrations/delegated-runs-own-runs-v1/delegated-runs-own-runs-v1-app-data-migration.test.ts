import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID,
  DelegatedRunsOwnRunsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { parseTaskExecutionResourceFile } from "../../../src/projects/stores/task-execution-resource-schema.js";
import {
  E, I, LEGACY, M, MARKETING, ORG, P, PEER_STARTED, RESEARCH, T0, T1, T2,
  exists, paths, put, readJson, releasedTeamOwnFile, writeReleasedWorld, type World,
} from "../../fixtures/app-data-migrations/released-delegation-shape-fixtures.js";

/**
 * `20261111_delegated_runs_own_runs_v1` (autobyteus-461, design DS-10, contract §5 and §13.2) over hand-built data in
 * every released shape (TESTING.md: never real data or a copy of it).
 */
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const world = async (): Promise<World> => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-runs-own-runs-"));
  roots.push(appData);
  return { appData, memory: path.join(appData, "memory") };
};
const names = { agentDefinitionName: vi.fn(async (id: string) => id === "image-maker" ? "Image Maker" : null),
  teamDefinitionName: vi.fn(async (id: string) => id === "software-engineering-team" ? "Software Engineering Team" : null) };
const catalogs = () => ({ agentRunHistoryChanged: vi.fn(), collaborationRunHistoryChanged: vi.fn() });
const migrate = (w: World, invalidation = catalogs()) => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  return new DelegatedRunsOwnRunsV1AppDataMigration(w.appData, w.memory, names, invalidation).execute();
};
const from = (kind: string, runId: string, delegatorAgentRunId?: string) =>
  ({ delegatingRun: { kind, runId }, ...(delegatorAgentRunId ? { delegatorAgentRunId } : {}) });
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file); else out[path.relative(root, file)] = await fs.readFile(file, "utf8");
    }
  };
  await walk(root);
  return out;
};

describe("20261111_delegated_runs_own_runs_v1", () => {
  it("is registered after its four predecessors and holds none of them (AR-005)", () => {
    const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);
    const at = ids.indexOf(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID);
    for (const predecessor of ["20261015_collaborators_to_delegated_runs_v1", "20261017_task_agent_own_run_v1",
      "20261018_append_only_message_logs_v1", "20261019_delegated_copy_own_file_complete_v1"]) {
      expect(ids.indexOf(predecessor)).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(predecessor)).toBeLessThan(at);
    }
    const definition = new AppDataMigrationRegistry().getDefinition(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID)!;
    expect(definition.prerequisiteMigrationIds ?? []).toEqual([]);
  });

  it("converts the main scenario to the contract's shapes (§13.2 E1 … E4, E6 … E10)", async () => {
    const w = await world();
    const at = paths(w);
    await writeReleasedWorld(w);
    const invalidation = catalogs();
    const result = await migrate(w, invalidation);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.failedCount).toBe(0);

    // E1, E2 (one hop), E4.
    expect((await readJson(at.taskRecord(T1))).agentRunResources).toEqual([
      { role: "assigned", delegatedFrom: from("agent", M, M), recipientAddress: "/software_engineering_team",
        agentRun: { kind: "team", teamRunId: E, coordinatorAgentRunId: "solution_designer_65a9" }, linkedAt: T0, start: "started", closedAt: null },
      // E5: a non-assigned entry takes its run's delegation address from `taskAgent.address`.
      { role: "subWork", delegatedFrom: from("agent_team", E, "solution_designer_65a9"), recipientAddress: "/product_team",
        agentRun: { kind: "team", teamRunId: P, coordinatorAgentRunId: "product_designer_1a2b" }, linkedAt: T0, start: "started", closedAt: null },
      { role: "subWork", delegatedFrom: from("agent_team", P, "product_designer_1a2b"), recipientAddress: "/image_maker", agentRun: { kind: "agent", agentRunId: I },
        linkedAt: T0, start: "started", closedAt: null },
    ]);
    // E3: a peer's run keeps its node, members and address in its entry.
    expect((await readJson(at.adHocRecord(T2))).agentRunResources).toEqual([
      { role: "assigned", delegatedFrom: from("agent", M, M), recipientAddress: "/research_team",
        agentRun: { kind: "team", teamRunId: RESEARCH, coordinatorAgentRunId: "lead_0c11" }, nodeId: "node-b-1f0e",
        // SR-030: the stored link's prefix (the delegation address) is dropped: team-local addresses.
        members: [{ address: "/lead", agentRunId: "lead_0c11" }, { address: "/analyst", agentRunId: "analyst_5d20" }],
        linkedAt: T0, start: "started", closedAt: null },
    ]);
    // Every converted Task record reads with the runtime's strict reader.
    expect(() => parseTaskExecutionResourceFile(JSON.parse(JSON.stringify({ taskId: T1, agentRunResources: [] })), T1)).not.toThrow();
    await expect(readJson(at.taskRecord(T1)).then((raw) => parseTaskExecutionResourceFile(raw, T1))).resolves.toBeTruthy();
    await expect(readJson(at.adHocRecord(T2)).then((raw) => parseTaskExecutionResourceFile(raw, T2))).resolves.toBeTruthy();

    // E6 agent: an ordinary run file with its address, launch source and origin.
    const image = await readJson(at.agentFile(I));
    expect(image).not.toHaveProperty("taskAgent");
    expect(image).toMatchObject({ address: "/image_maker", launchSource: { origin: "agent_default", fallbacks: [] },
      delegatedFrom: from("agent_team", P, "product_designer_1a2b") });
    const metadata = new AgentRunMetadataStore(w.memory);
    expect((await metadata.readMetadataState(I)).kind).toBe("present");
    // E6 with no recorded delegator: today's coordinating run, no delegator.
    expect((await readJson(at.agentFile(LEGACY))).delegatedFrom).toEqual(from("agent_team", MARKETING));
    // E10: a run a peer started.
    expect((await readJson(at.agentFile(PEER_STARTED))).delegatedFrom).toEqual({ delegatingRun: { kind: "agent", runId: "far_manager" },
      delegatorAgentRunId: "far_manager", nodeId: "node-a-77d2" });

    // E6t (TC-12, SR-035): the ordinary team file rooted at `/`, like every team run; the members lose the former root.
    const engineering = await readJson(at.teamFile(E));
    expect(engineering).not.toHaveProperty("taskAgent");
    expect(engineering.delegatedFrom).toEqual(from("agent", M, M));
    expect(engineering.rootTeam).toMatchObject({ address: "/", coordinatorAddress: "/solution_designer", teamDefinitionName: "Software Engineering Team" });
    expect(engineering.rootTeam.members.map((member: any) => [member.address, member.launchConfiguration.llmModelIdentifier, member.launchSource ?? null]))
      .toEqual([
        // followsTeam: the team-level edit is its own launch now.
        ["/solution_designer", "haiku", null],
        // its own edit wins and drops its source.
        ["/code_reviewer", "opus", null],
        // untouched: keeps its source.
        ["/tester", "sonnet", { origin: "agent_default", fallbacks: [] }],
      ]);
    for (const member of engineering.rootTeam.members) {
      expect(member).not.toHaveProperty("followsTeam");
      expect(member).not.toHaveProperty("userLaunchSelection");
    }
    expect(engineering.rootTeam).not.toHaveProperty("taskExecutions");
    // A handoff is rebased; a `to` outside the team is kept as written (resolved when sent).
    expect(engineering.handoffs).toEqual([{ from: "/solution_designer", to: "/Teacher", rules: ["When the plan is ready."] }]);
    // It loads through the ordinary team schema, rooted at `/`, with the handoff to an address outside it, and a member's source.
    const loaded = validateTeamRunExecutionTreePayload(engineering, E);
    expect(loaded.rootTeam.address).toBe("/");
    expect(loaded.rootTeam.members.map((member) => member.address)).toEqual(["/solution_designer", "/code_reviewer", "/tester"]);
    expect(loaded.rootTeam.members[2]!.launchSource).toEqual({ origin: "agent_default", fallbacks: [] });
    expect(loaded.delegatedFrom).toEqual(from("agent", M, M));
    // P: one hop, the team its delegator is part of; its name falls back to the definition ID.
    const product = await readJson(at.teamFile(P));
    expect(product.delegatedFrom).toEqual(from("agent_team", E, "solution_designer_65a9"));
    expect(product.rootTeam.teamDefinitionName).toBe("product-team");

    // V-16: the run's own delegatedFrom equals each of its Task entries'.
    for (const [own, entry] of [[engineering.delegatedFrom, 0], [product.delegatedFrom, 1], [image.delegatedFrom, 2]] as const) {
      expect((await readJson(at.taskRecord(T1))).agentRunResources[entry].delegatedFrom).toEqual(own);
    }

    // E8: the manager's tree is gone, its address moved. E11 (TC-13): its log is in its own folder; `collaboration/` is gone.
    expect(await exists(at.standaloneTree(M))).toBe(false);
    expect((await readJson(at.agentFile(M))).address).toBe("/project_task_manager");
    expect(await fs.readFile(at.runLog(M), "utf8")).toBe("{\"messageId\":\"m1\"}\n");
    expect(await exists(path.dirname(at.standaloneLog(M)))).toBe(false);
    // E9: the lists go; an empty collaborators list stays (not read).
    const marketing = await readJson(at.teamFile(MARKETING));
    expect(marketing.rootTeam).not.toHaveProperty("taskExecutions");
    expect(marketing.collaborators).toEqual([]);
    const org = await readJson(at.orgFile(ORG));
    expect(org.rootOrg).not.toHaveProperty("taskExecutions");
    expect(org.rootOrg.members[1]).not.toHaveProperty("taskExecutions");

    // Step 7: the busy entries of delegated runs are under their own runs' roots.
    expect((await readJson(at.busyRuns())).entries.map((entry: any) => [entry.root, entry.agentRunId, entry.place])).toEqual([
      [{ rootSubjectKind: "agent_team", rootRunId: P }, "product_designer_1a2b", "member"],
      [{ rootSubjectKind: "agent", rootRunId: I }, I, "host"],
      [{ rootSubjectKind: "agent", rootRunId: M }, M, "host"],
    ]);

    // Step 8: every delegated run has its history row (names through the port, else the definition ID).
    const agentRows = await readJson(at.agentIndex());
    expect(agentRows[0]).toMatchObject({ runId: M, summary: "Plan" });
    expect(agentRows.slice(1).map((row: any) => [row.runId, row.agentName]).sort()).toEqual([
      [I, "Image Maker"], [LEGACY, "helper"], [PEER_STARTED, "writer"]].sort());
    const teamRows = await readJson(at.teamIndex());
    expect(teamRows[0]).toMatchObject({ teamRunId: MARKETING, teamDefinitionName: "Marketing" });
    expect(teamRows.slice(1).map((row: any) => [row.teamRunId, row.teamDefinitionName]).sort()).toEqual([
      [E, "Software Engineering Team"], [P, "product-team"]].sort());
    expect(invalidation.agentRunHistoryChanged).toHaveBeenCalledWith(w.memory);
    expect(invalidation.collaborationRunHistoryChanged).toHaveBeenCalledWith(w.memory, "agent_team");
  });

  it("a second start changes nothing (QR-003)", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    await migrate(w);
    const before = await snapshot(w.appData);
    const again = await migrate(w);
    expect(again.status).toBe("SUCCEEDED");
    expect(again.summary.migratedCount).toBe(0);
    expect(await snapshot(w.appData)).toEqual(before);
  });

  it("an interrupted run continues where it stopped: half the files already converted (DS-10 item 5)", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    const full = await world();
    await writeReleasedWorld(full);
    await migrate(full);
    // The Task records and the image agent were converted before the stop; the rest is released.
    const at = paths(w), done = paths(full);
    for (const [target, source] of [[at.taskRecord(T1), done.taskRecord(T1)], [at.adHocRecord(T2), done.adHocRecord(T2)], [at.agentFile(I), done.agentFile(I)]]) {
      await put(target!, await fs.readFile(source!, "utf8"));
    }
    expect((await migrate(w)).status).toBe("SUCCEEDED");
    const converted = await snapshot(w.appData), expected = await snapshot(full.appData);
    expect(Object.keys(converted).sort()).toEqual(Object.keys(expected).sort());
    for (const file of Object.keys(expected)) {
      if (file.endsWith("_index.json")) continue; // created times of new rows may differ
      expect(JSON.parse(converted[file]!.startsWith("{") || converted[file]!.startsWith("[") ? converted[file]! : "null"))
        .toEqual(JSON.parse(expected[file]!.startsWith("{") || expected[file]!.startsWith("[") ? expected[file]! : "null"));
    }
  });

  it("an unreadable Task record is left as it is and reported; every other item is converted; the result warns", async () => {
    const w = await world();
    const at = paths(w);
    await writeReleasedWorld(w);
    await put(at.taskRecord("broken"), "{ truncated");
    const result = await migrate(w);
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(await fs.readFile(at.taskRecord("broken"), "utf8")).toBe("{ truncated");
    expect(result.summary.details).toContainEqual(expect.objectContaining({ itemId: "task_record:broken", message: expect.stringContaining("PRESERVED_UNREADABLE") }));
    expect((await readJson(at.taskRecord(T1))).agentRunResources[0]).toHaveProperty("delegatedFrom");
  });

  it("an entry whose delegator is recorded nowhere leaves its Task file whole and reported (never a mixed file)", async () => {
    const w = await world();
    const at = paths(w);
    await writeReleasedWorld(w);
    await put(at.taskRecord("orphan"), { taskId: "orphan", agentRunResources: [
      { role: "assigned", assignedBy: M, hostRoot: { kind: "agent", runId: M }, agentRun: { kind: "agent", agentRunId: "x1" }, linkedAt: T0, start: "started", closedAt: null },
      { role: "delegated", hostRoot: { kind: "agent", runId: M }, agentRun: { kind: "agent", agentRunId: "unknown_run" }, linkedAt: T0, start: "started", closedAt: null },
    ] });
    const before = await fs.readFile(at.taskRecord("orphan"), "utf8");
    const result = await migrate(w);
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(await fs.readFile(at.taskRecord("orphan"), "utf8")).toBe(before);
  });

  describe("a predecessor's unfinished item (each predecessor FAILED): preserved, reported, every Task entry still converted", () => {
    it("20261017_task_agent_own_run_v1: a kept full record in a tree, with its own file not written", async () => {
      const w = await world();
      const at = paths(w);
      await writeReleasedWorld(w);
      // A failed child under an owned parent: the manager's tree keeps E's full record, holding a nested record.
      const tree = await readJson(at.standaloneTree(M));
      tree.taskExecutions[0] = { address: "/software_engineering_team", teamRunId: E, delegatorAgentRunId: M, startedAt: T0, platformAgentRunId: null,
        members: [{ address: "/software_engineering_team/solution_designer", agentRunId: "solution_designer_65a9" }],
        taskExecutions: [{ address: "/helper_agent", agentRunId: "kept_helper", delegatorAgentRunId: "solution_designer_65a9", startedAt: T0 }] };
      await put(at.standaloneTree(M), tree);
      const own = await fs.readFile(at.teamFile(E), "utf8");
      await put(at.taskRecord("t_kept"), { taskId: "t_kept", agentRunResources: [
        { role: "delegated", hostRoot: { kind: "agent", runId: M }, agentRun: { kind: "agent", agentRunId: "kept_helper" }, linkedAt: T0, start: "started", closedAt: null }] });
      const result = await migrate(w);
      expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
      expect(result.summary.details).toContainEqual(expect.objectContaining({ itemId: `standalone_tree:${M}`,
        message: expect.stringContaining("PRESERVED_UNFINISHED_PREDECESSOR: 20261017_task_agent_own_run_v1") }));
      // The tree and the kept run's own file stay as they were.
      expect(await readJson(at.standaloneTree(M))).toEqual(tree);
      expect(await fs.readFile(at.teamFile(E), "utf8")).toBe(own);
      // Every Task entry is converted: the kept run's delegator from its kept record; its delegating run is E (stored).
      expect((await readJson(at.taskRecord("t_kept"))).agentRunResources[0]).toMatchObject({ role: "subWork",
        delegatedFrom: from("agent_team", E, "solution_designer_65a9") });
      expect((await readJson(at.taskRecord(T1))).agentRunResources[0].delegatedFrom).toEqual(from("agent", M, M));
    });

    it("20261019_delegated_copy_own_file_complete_v1: an own file not completed (taskAgent.origin) is left; its Task entries convert", async () => {
      const w = await world();
      const at = paths(w);
      await writeReleasedWorld(w);
      const image = await readJson(at.agentFile(I));
      image.taskAgent.origin = { kind: "catalog" };
      await put(at.agentFile(I), image);
      const result = await migrate(w);
      expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
      expect(await readJson(at.agentFile(I))).toEqual(image);
      expect((await readJson(at.taskRecord(T1))).agentRunResources[2].delegatedFrom).toEqual(from("agent_team", P, "product_designer_1a2b"));
    });

    it("20261015_collaborators_to_delegated_runs_v1: a tree still holding collaborators is left", async () => {
      const w = await world();
      const at = paths(w);
      await writeReleasedWorld(w);
      const marketing = await readJson(at.teamFile(MARKETING));
      marketing.collaborators = [{ address: "/old_helper" }];
      await put(at.teamFile(MARKETING), marketing);
      const result = await migrate(w);
      expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
      expect(await readJson(at.teamFile(MARKETING))).toEqual(marketing);
    });

    it("20261018_append_only_message_logs_v1: a folder with a JSON log not converted stays as it is, for that migration's retry", async () => {
      const w = await world();
      const at = paths(w);
      await writeReleasedWorld(w);
      const log = path.join(path.dirname(at.standaloneLog(M)), "communication_messages.json");
      await put(log, { messages: [] });
      const result = await migrate(w);
      expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
      expect(result.summary.details).toContainEqual(expect.objectContaining({ itemId: `agent_run_log:${M}`,
        message: expect.stringContaining("PRESERVED_UNFINISHED_PREDECESSOR: 20261018_append_only_message_logs_v1") }));
      expect(await readJson(log)).toEqual({ messages: [] });
      expect(await exists(at.standaloneLog(M))).toBe(true);
      expect(await exists(at.runLog(M))).toBe(false);
      // Everything else is converted.
      expect((await readJson(at.taskRecord(T1))).agentRunResources[0]).toHaveProperty("delegatedFrom");
    });
  });

  it("a predecessor finishing its item later writes its released shape; this migration is terminal and the Task entries stay current", async () => {
    const w = await world();
    const at = paths(w);
    await writeReleasedWorld(w);
    await migrate(w);
    const entries = await fs.readFile(at.taskRecord(T1), "utf8");
    // 20261017 writes an own file with `taskAgent` for a run later; the Task entries were already converted.
    await put(at.teamFile("late_team"), releasedTeamOwnFile("late_team", "/late_team",
      [{ address: "/late_team/lead", agentDefinitionId: "lead", role: null, description: null, agentRunId: "late_lead", platformAgentRunId: null,
        launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "sonnet", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" }, followsTeam: true }],
      { coordinatingRun: { kind: "agent", runId: M }, delegatorAgentRunId: M, address: "/late_team" }));
    expect(await fs.readFile(at.taskRecord(T1), "utf8")).toBe(entries);
    await expect(readJson(at.taskRecord(T1)).then((raw) => parseTaskExecutionResourceFile(raw, T1))).resolves.toBeTruthy();
  });
});
