import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrgMigrationFixture, writeNestedRoot, putOrgFixture, nestedTree } from "../../helpers/org-family-migration-fixtures.js";
import { buildCurrentTokenUsagePayload } from "../../helpers/token-usage-run-record-fixtures.js";
import { AtomicRunPackageFileCommitWriter } from "../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { testExecutionTree, testAgentNode } from "../../fixtures/current-team-run-fixtures.js";

const fixtures: Awaited<ReturnType<typeof createOrgMigrationFixture>>[] = [];
const fixture = async () => { const e = await createOrgMigrationFixture(); fixtures.push(e); return e; };
afterEach(async () => { vi.restoreAllMocks(); for (const e of fixtures.splice(0)) await e.close(); });
const teamRow = (id: string) => ({ teamRunId: id, teamDefinitionId: "definition", teamDefinitionName: "Retained name", workspaceRootPath: null,
  summary: `Summary ${id}`, createdAt: "2026-09-01T00:00:00.000Z", archivedAt: null, terminatedAt: "2026-09-01T00:00:01.000Z" });
const old = (root: string, id: string) => `/rest/team-runs/${root}-team/members/%2Fteam%2Flead/context-files/${id}.txt`;
const trace = (uri: string) => ({ trace_type: "user", media: { images: [uri] }, content: "Retained content" });

describe("family candidate scope and durable interruption boundaries", () => {
  it("adds large excluded histories without any history-content I/O or index writes; flat task Teams do not change classification", async () => {
    const e = await fixture(), flat = path.join(e.memory, "agent_teams", "flat"), standalone = path.join(e.memory, "agents");
    const tree = testExecutionTree({ rootTeamRunId: "flat", children: [testAgentNode("/lead", { agentRunId: "flat-lead" })], coordinatorAddress: "/lead" });
    await putOrgFixture(path.join(flat, "team_run_execution_tree.json"), { ...tree, rootTeam: { ...tree.rootTeam, taskExecutions: [{
      address: "/lead", teamRunId: "task-team", members: [{ address: "/lead/child", agentRunId: "task-child", platformAgentRunId: null }], taskExecutions: [],
      startedAt: "2026-09-01T00:00:00.000Z", settledAt: "2026-09-01T00:00:01.000Z",
    }] } });
    // Even invalid unrelated Org authority content is not globally validated.
    await putOrgFixture(path.join(e.memory, "agent_orgs", "unrelated", "agent_org_run_execution_tree.json"), "not json", true);
    const measure = async () => {
      let bytes = 0;
      const readOriginal = fs.readFile.bind(fs);
      const read = vi.spyOn(fs, "readFile").mockImplementation(async (...args: any[]) => {
        const result = await (readOriginal as any)(...args); bytes += Buffer.byteLength(result); return result;
      });
      const enumerate = vi.spyOn(fs, "readdir"), write = vi.spyOn(fs, "writeFile");
      const started = performance.now(); const result = await e.migrate(); const elapsedMs = performance.now() - started;
      expect(result.status).toBe("SUCCEEDED");
      const reads = read.mock.calls.map(([file]) => String(file)), enumerated = enumerate.mock.calls.map(([file]) => String(file));
      expect(reads.filter((file) => file.startsWith(flat))).toEqual([path.join(flat, "team_run_execution_tree.json")]);
      expect(reads.some((file) => file.startsWith(standalone))).toBe(false);
      expect(reads.every((file) => /(?:execution_tree|history_index)\.json$/.test(file))).toBe(true);
      expect(enumerated).toEqual([path.join(e.memory, "agent_teams"), path.join(e.memory, "agent_orgs")]);
      expect(write).not.toHaveBeenCalled();
      vi.restoreAllMocks(); return { readFiles: reads.length, bytes, enumerations: enumerated.length, historyContentReads: 0, historyWrites: 0, elapsedMs };
    };
    const small = await measure();
    const big = "x".repeat(1024 * 1024);
    for (let i = 0; i < 10; i++) {
      await putOrgFixture(path.join(standalone, `agent-${i}`, "raw_traces_active.jsonl"), big, true);
      await putOrgFixture(path.join(flat, `agent-${i}`, "raw_traces_archive", "part.jsonl"), big, true);
    }
    await putOrgFixture(path.join(flat, "task_delegation_records.json"), big, true);
    const large = await measure();
    expect({ ...large, elapsedMs: 0 }).toEqual({ ...small, elapsedMs: 0 });
    console.log("FAMILY_MIGRATION_IO_ONLY", JSON.stringify({ addedExcludedBytes: 21 * 1024 * 1024, small, large }));
  });

  it("reconciles only a retained Team index row without reopening current Org history", async () => {
    const e = await fixture(); await writeNestedRoot(e.memory); expect((await e.migrate()).status).toBe("SUCCEEDED");
    await new TeamRunHistoryIndexStore(e.memory).writeIndex([teamRow("org"), teamRow("unrelated")]);
    const read = vi.spyOn(fs, "readFile"), enumerate = vi.spyOn(fs, "readdir");
    expect((await e.migrate()).status).toBe("SUCCEEDED");
    expect(read.mock.calls.every(([file]) => /(?:execution_tree|history_index)\.json$/.test(String(file)))).toBe(true);
    expect(enumerate.mock.calls).toHaveLength(2);
    expect(await new TeamRunHistoryIndexStore(e.memory).readIndex()).toEqual([teamRow("unrelated")]);
    const write = vi.spyOn(fs, "writeFile"), rename = vi.spyOn(fs, "rename");
    expect((await e.migrate()).status).toBe("SUCCEEDED"); expect(write).not.toHaveBeenCalled(); expect(rename).not.toHaveBeenCalled();
  });

  it.each(["authority", "rename-before", "rename-after", "org-index-after", "team-index-before", "team-index-after", "retirement"])("retains source evidence and exact usage through %s interruption, then retries", async (phase) => {
    const e = await fixture(), { source, target } = await writeNestedRoot(e.memory);
    await new TeamRunHistoryIndexStore(e.memory).writeIndex([teamRow("org"), teamRow("unrelated")]);
    await new AgentOrgRunHistoryIndexStore(e.memory).writeIndex([{ orgRunId: "unrelated-org", orgDefinitionId: "retained", orgDefinitionName: "Unrelated", workspaceRootPath: null,
      summary: "Preserved despite no directory", createdAt: "2026-08-01T00:00:00.000Z", archivedAt: null, terminatedAt: null }]);
    await e.store.recordObservation(buildCurrentTokenUsagePayload({ runId: "org-direct", rootTeamRunId: "org" }));
    const before = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "org-direct" } });
    const writer = new AtomicRunPackageFileCommitWriter(); let injected = false;
    if (phase === "authority") {
      const actual = writer.write.bind(writer);
      vi.spyOn(writer, "write").mockImplementation(async (input) => { const result = await actual(input); if (!injected && input.file === "org_task_records") { injected = true; throw new Error("INJECTED_AUTHORITY"); } return result; });
    } else if (phase.startsWith("rename")) {
      const actual = fs.rename.bind(fs);
      vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
        if (String(from) === source && !injected) { injected = true; if (phase === "rename-after") await actual(from, to); throw new Error("INJECTED_RENAME"); }
        return actual(from, to);
      });
    } else if (phase === "org-index-after") {
      const actual = AgentOrgRunHistoryIndexStore.prototype.writeIndex;
      vi.spyOn(AgentOrgRunHistoryIndexStore.prototype, "writeIndex").mockImplementation(async function (rows) { await actual.call(this, rows); injected = true; throw new Error("INJECTED_ORG_INDEX"); });
    } else if (phase.startsWith("team-index")) {
      const actual = TeamRunHistoryIndexStore.prototype.writeIndex;
      vi.spyOn(TeamRunHistoryIndexStore.prototype, "writeIndex").mockImplementation(async function (rows) { if (phase === "team-index-after") await actual.call(this, rows); injected = true; throw new Error("INJECTED_TEAM_INDEX"); });
    } else {
      const actual = fs.rm.bind(fs);
      vi.spyOn(fs, "rm").mockImplementation(async (file, options) => { if (String(file) === path.join(target, "team_run_execution_tree.json")) { injected = true; throw new Error("INJECTED_RETIREMENT"); } return actual(file, options); });
    }
    expect((await e.migrate(writer)).status).toBe("FAILED"); expect(injected).toBe(true);
    const remaining = await fs.access(path.join(source, "team_run_execution_tree.json")).then(() => source).catch(() => target);
    await fs.access(path.join(remaining, "team_run_execution_tree.json"));
    vi.restoreAllMocks(); expect((await e.migrate()).status).toBe("SUCCEEDED");
    const after = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "org-direct" } });
    expect(after).toEqual({ ...before, rootTeamRunId: null, rootAttributionStatus: "unknown", identitySummaryJson: JSON.stringify({ ...JSON.parse(before.identitySummaryJson), rootTeamRunIds: { status: "unknown" } }) });
    expect(await new TeamRunHistoryIndexStore(e.memory).readIndex()).toEqual([teamRow("unrelated")]);
    const orgs = await new AgentOrgRunHistoryIndexStore(e.memory).readIndex();
    expect(orgs.find((r) => r.orgRunId === "unrelated-org")?.summary).toBe("Preserved despite no directory");
    expect(orgs.find((r) => r.orgRunId === "org")?.summary).toBe("Summary org");
    await expect(fs.access(path.join(target, "team_run_execution_tree.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["token", "sidecar"])("retains referrer markers when a cross-candidate %s dependency fails, including cycles", async (failure) => {
    const e = await fixture();
    const a = await writeNestedRoot(e.memory, "a"), b = await writeNestedRoot(e.memory, "b");
    for (const [root, source, other] of [["a", a.source, "b"], ["b", b.source, "a"]]) {
      await putOrgFixture(path.join(source!, `${root}-team`, `${root}-lead`, "context_files", "kept.txt"), "attachment bytes", true);
      await putOrgFixture(path.join(source!, `${root}-direct`, "raw_traces_active.jsonl"), JSON.stringify(trace(old(other!, "kept"))), true);
    }
    const tasks = path.join(b.source, "task_delegation_records.json");
    if (failure === "sidecar") await putOrgFixture(tasks, { schemaVersion: 1, rootTeamRunId: "wrong", records: [] });
    else {
      await e.store.recordObservation(buildCurrentTokenUsagePayload({ runId: "b-direct", rootTeamRunId: "b" }));
      await e.client.tokenUsageRunRecord.update({ where: { runId: "b-direct" }, data: { rootAttributionStatus: "mixed" } });
    }
    expect((await e.migrate()).status).toBe("FAILED");
    for (const root of [a, b]) {
      const dir = await fs.access(root.target).then(() => root.target).catch(() => root.source);
      await fs.access(path.join(dir, "team_run_execution_tree.json"));
    }
    if (failure === "sidecar") await putOrgFixture(tasks, { schemaVersion: 1, rootTeamRunId: "b", records: [] });
    else await e.client.tokenUsageRunRecord.update({ where: { runId: "b-direct" }, data: { rootAttributionStatus: "single" } });
    const retry = await e.migrate(); expect(retry.status, JSON.stringify(retry)).toBe("SUCCEEDED");
    for (const root of [a, b]) await expect(fs.access(path.join(root.target, "team_run_execution_tree.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
