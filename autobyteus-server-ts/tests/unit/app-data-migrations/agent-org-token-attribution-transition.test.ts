import { AgentRunPresentationAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrgMigrationFixture, writeNestedRoot, putOrgFixture } from "../../helpers/org-family-migration-fixtures.js";
import { buildCurrentTokenUsagePayload } from "../../helpers/token-usage-run-record-fixtures.js";
import { AgentOrgRunManager } from "../../../src/agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgExecutionScopeBuilder } from "../../../src/agent-org-execution/services/agent-org-execution-scope-builder.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";

const fixtures: Awaited<ReturnType<typeof createOrgMigrationFixture>>[] = [];
const fixture = async () => { const e = await createOrgMigrationFixture(); fixtures.push(e); return e; };
afterEach(async () => { vi.restoreAllMocks(); configureTokenUsageMigrationReadiness({ kind: "READY" }); for (const e of fixtures.splice(0)) await e.close(); });
const observation = (runId: string, rootTeamRunId: string | null = "org", ordinal = 1) => buildCurrentTokenUsagePayload({
  runId, rootTeamRunId, eventId: `${runId}-${ordinal}`, idempotencyKey: `${runId}-${ordinal}`,
  observedAt: `2026-09-01T00:00:0${ordinal}.000Z`, usageScope: "cumulative_snapshot", snapshotSeriesKey: `${runId}-thread`,
  sourceInputTokens: ordinal * 100, sourceOutputTokens: ordinal * 20, inputTokens: ordinal * 100, outputTokens: ordinal * 20,
  inputCost: 0.0123, outputCost: 0.0234, totalCost: 0.0357, teamName: "Historical label",
});
const rows = async (e: Awaited<ReturnType<typeof fixture>>) => e.client.tokenUsageRunRecord.findMany({ orderBy: { runId: "asc" } });

describe("Org attribution: isolated actual SQL and current token store", () => {
  it("changes exactly three fields, preserves accounting/checkpoint bytes and negative controls, and keeps replay/advancement neutral", async () => {
    const e = await fixture(); await writeNestedRoot(e.memory);
    for (const [id, root] of [["org-direct", "org"], ["org-lead", "org"], ["flat-agent", "flat"], ["standalone", null], ["native-org", null]] as const) await e.store.recordObservation(observation(id, root));
    // Deliberate exact 64-bit accounting sentinel; migration must not round through Number.
    await e.client.tokenUsageRunRecord.update({ where: { runId: "org-lead" }, data: { accountingTotalTokens: 9007199254740993n } });
    const before = await rows(e), facets = await e.client.tokenUsageAnalyticsDailyFacet.findMany();
    expect((await e.migrate()).status).toBe("SUCCEEDED");
    for (const row of await rows(e)) {
      const old = before.find((prior) => prior.runId === row.runId)!;
      expect(row).toEqual(row.runId.startsWith("org-") ? { ...old, rootTeamRunId: null, rootAttributionStatus: "unknown",
        identitySummaryJson: JSON.stringify({ ...JSON.parse(old.identitySummaryJson), rootTeamRunIds: { status: "unknown" } }) } : old);
    }
    expect(await e.client.tokenUsageAnalyticsDailyFacet.findMany()).toEqual(facets);
    await expect(e.store.assertAgentOrgRecordsReady({ orgRunId: "org", agentRunIds: ["org-direct", "org-lead", "absent"] })).resolves.toBeUndefined();
    const corrected = await rows(e);
    const duplicate = await e.store.recordObservation(observation("org-direct", null));
    expect(duplicate.run_summary_after_event?.root_team_run_id).toBeNull();
    expect(await rows(e)).toEqual(corrected);
    const advanced = await e.store.recordObservation(observation("org-direct", null, 2));
    expect(advanced.run_summary_after_event?.root_team_run_id).toBeNull();
    const adapter = new AgentRunPresentationAdapter((agentRunId) => createCollaborationMemberExecutionIdentity({
      root: createAgentOrgRootExecutionIdentity("org"), memberAddress: "/direct", agentRunId,
    }));
    for (const payload of [duplicate, advanced]) {
      expect(adapter.adapt({ eventType: AgentRunEventType.TOKEN_USAGE_UPDATED, runId: "org-direct", payload: { ...payload }, statusHint: null }).kind).toBe("publish");
    }
    const record = await e.repository.getByRunId("org-direct");
    expect(record?.rootTeamRunId).toBeNull(); expect(record?.identitySummary.rootTeamRunIds).toEqual({ status: "unknown" });
    expect(record?.tokenTotals.accounting_total_tokens).toBe(240n);
    expect(await e.client.tokenUsageRunRecord.findUnique({ where: { runId: "absent" } })).toBeNull();
  });

  it("finds stale SQL after all history sources are gone and performs zero history-content or index writes", async () => {
    const e = await fixture(); await writeNestedRoot(e.memory); expect((await e.migrate()).status).toBe("SUCCEEDED");
    await e.store.recordObservation(observation("org-direct"));
    const read = vi.spyOn(fs, "readFile"), enumerate = vi.spyOn(fs, "readdir"), write = vi.spyOn(fs, "writeFile"), rename = vi.spyOn(fs, "rename");
    expect((await e.migrate()).status).toBe("SUCCEEDED");
    const reads = read.mock.calls.map(([file]) => String(file));
    expect(reads.every((file) => /(?:execution_tree|history_index)\.json$/.test(file))).toBe(true);
    expect(enumerate.mock.calls.map(([file]) => String(file))).toEqual([path.join(e.memory, "agent_teams"), path.join(e.memory, "agent_orgs")]);
    expect(write).not.toHaveBeenCalled(); expect(rename).not.toHaveBeenCalled();
    expect((await e.repository.getByRunId("org-direct"))?.rootTeamRunId).toBeNull();
  });

  it.each(["wrong-root", "mixed-summary", "scalar-only", "extra-claimant", "malformed"])("rolls back the whole exact root for %s and safely retries", async (failure) => {
    const e = await fixture(); const { target } = await writeNestedRoot(e.memory);
    await e.store.recordObservation(observation("org-direct")); await e.store.recordObservation(observation("org-lead"));
    const valid = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "org-lead" } });
    if (failure === "extra-claimant") await e.store.recordObservation(observation("not-in-tree"));
    else await e.client.tokenUsageRunRecord.update({ where: { runId: "org-lead" }, data: failure === "wrong-root" ? { rootTeamRunId: "another" }
      : failure === "scalar-only" ? { rootTeamRunId: null }
      : { identitySummaryJson: failure === "malformed" ? "not json" : JSON.stringify({ ...JSON.parse(valid.identitySummaryJson), rootTeamRunIds: { status: "mixed" } }) } });
    const before = await rows(e);
    expect((await e.migrate()).status).toBe("FAILED"); expect(await rows(e)).toEqual(before);
    await fs.access(path.join(target, "team_run_execution_tree.json"));
    if (failure === "extra-claimant") await e.client.tokenUsageRunRecord.delete({ where: { runId: "not-in-tree" } });
    else await e.client.tokenUsageRunRecord.update({ where: { runId: "org-lead" }, data: { rootTeamRunId: valid.rootTeamRunId, identitySummaryJson: valid.identitySummaryJson } });
    expect((await e.migrate()).status).toBe("SUCCEEDED");
    expect(await e.attributionRepository.convertRoot("org", ["org-direct", "org-lead"])).toBe(0);
  });

  it("includes settled direct-task and task-Team members without materializing runtimes", async () => {
    const e = await fixture(); const { source } = await writeNestedRoot(e.memory);
    const treeFile = path.join(source, "team_run_execution_tree.json");
    const tree = JSON.parse(await fs.readFile(treeFile, "utf8"));
    tree.rootTeam.taskExecutions = [
      { address: "/direct", agentRunId: "settled-direct", platformAgentRunId: "retained-thread", startedAt: "2026-09-01T00:00:00.000Z", settledAt: "2026-09-01T00:00:01.000Z" },
      { address: "/team", teamRunId: "settled-team", members: [{ address: "/team/lead", agentRunId: "settled-team-lead", platformAgentRunId: null }], taskExecutions: [],
        startedAt: "2026-09-01T00:00:00.000Z", settledAt: "2026-09-01T00:00:01.000Z" },
    ];
    await putOrgFixture(treeFile, tree);
    await putOrgFixture(path.join(source, "task_delegation_records.json"), { schemaVersion: 1, rootTeamRunId: "org", records: [
      { taskId: "direct-task", recipientAddress: "/direct", taskExecution: { agentRunId: "settled-direct" } },
      { taskId: "team-task", recipientAddress: "/team", taskExecution: { teamRunId: "settled-team" } },
    ].map((task) => ({ ...task, delegatorAgentRunId: "org-lead", description: "Retained settled task", referenceFiles: [], status: "interrupted", updates: [{ interruptionId: `${task.taskId}-interruption`, reason: "stopped", createdAt: "2026-09-01T00:00:01.000Z" }], createdAt: "2026-09-01T00:00:00.000Z" })) });
    for (const id of ["settled-direct", "settled-team-lead"]) await e.store.recordObservation(observation(id));
    const before = await rows(e), result = await e.migrate(); expect(result.status, JSON.stringify(result)).toBe("SUCCEEDED");
    for (const row of await rows(e)) {
      const old = before.find((prior) => prior.runId === row.runId)!;
      expect(row).toEqual({ ...old, rootTeamRunId: null, rootAttributionStatus: "unknown", identitySummaryJson: JSON.stringify({ ...JSON.parse(old.identitySummaryJson), rootTeamRunIds: { status: "unknown" } }) });
    }
  });

  it("rolls back an actual SQLite UPDATE failure after an earlier member update", async () => {
    const e = await fixture(); await writeNestedRoot(e.memory);
    await e.store.recordObservation(observation("org-direct")); await e.store.recordObservation(observation("org-lead"));
    const before = await rows(e);
    await e.client.$executeRawUnsafe(`CREATE TRIGGER injected_write_failure BEFORE UPDATE ON token_usage_run_records WHEN OLD.run_id = 'org-lead' BEGIN SELECT RAISE(ABORT, 'INJECTED_SQL_INTERRUPTION'); END`);
    expect((await e.migrate()).status).toBe("FAILED"); expect(await rows(e)).toEqual(before);
    await e.client.$executeRawUnsafe("DROP TRIGGER injected_write_failure");
    expect((await e.migrate()).status).toBe("SUCCEEDED");
  });

  it("uses the current token boundary after real package loading and rejects before scope build; inspection stays available", async () => {
    const e = await fixture(); await writeNestedRoot(e.memory); expect((await e.migrate()).status).toBe("SUCCEEDED");
    await e.store.recordObservation(observation("org-direct"));
    const build = vi.fn(async () => { throw new Error("REACHED_SCOPE_BUILD"); });
    const manager = new AgentOrgRunManager({ memoryDir: e.memory, tokenUsageRunStore: e.store, scopeBuilder: { build } as unknown as AgentOrgExecutionScopeBuilder });
    await expect(manager.restore("org")).rejects.toThrow("AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY"); expect(build).not.toHaveBeenCalled();
    expect((await manager.getInspection("org")).isActive).toBe(false);
    expect((await e.migrate()).status).toBe("SUCCEEDED");
    await expect(manager.restore("org")).rejects.toThrow("REACHED_SCOPE_BUILD"); expect(build).toHaveBeenCalledTimes(1);
    configureTokenUsageMigrationReadiness({ kind: "CURRENT_SCHEMA_DEGRADED", migrationStatus: "FAILED", logPath: null });
    await expect(manager.restore("org")).rejects.toThrow("AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY"); expect(build).toHaveBeenCalledTimes(1);
  });

  it("does not normalize a malformed current attribution into a ready result", async () => {
    const e = await fixture(); await e.store.recordObservation(observation("neutral", null));
    await e.client.tokenUsageRunRecord.update({ where: { runId: "neutral" }, data: { rootAttributionStatus: "invalid" } });
    await expect(e.store.assertAgentOrgRecordsReady({ orgRunId: "org", agentRunIds: ["neutral"] })).rejects.toThrow("AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY");
  });
});
