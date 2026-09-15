import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrgMigrationFixture, putOrgFixture, writeNestedRoot } from "../../helpers/org-family-migration-fixtures.js";
import { createMigrationContinuationRuntime, migrationUsage, retainedThread } from "../../helpers/org-migration-continuation-fixtures.js";
import { LegacyTokenUsageConsolidationRepository } from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-consolidation-repository.js";
import { TokenUsageRunRecordsV1AppDataMigration } from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import { TokenUsageRunStore } from "../../../src/token-usage/providers/token-usage-run-store.js";
import { TokenCostCalculator } from "../../../src/token-usage/pricing/token-cost-calculator.js";
import { resetDefaultAgentRunEventPipelineForTests } from "../../../src/agent-execution/events/default-agent-run-event-pipeline.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";

const fixtures: Awaited<ReturnType<typeof createOrgMigrationFixture>>[] = [];
const runtimes: ReturnType<typeof createMigrationContinuationRuntime>[] = [];
afterEach(async () => {
  for (const runtime of runtimes.splice(0)) {
    await runtime.manager.terminate("org");
    await runtime.recorder.waitForIdle();
    expect(runtime.agentManager.listActiveRuns()).toEqual([]);
  }
  await resetDefaultAgentRunEventPipelineForTests();
  vi.restoreAllMocks();
  for (const e of fixtures.splice(0)) await e.close();
});

const materializeLegacyUsage = async (e: Awaited<ReturnType<typeof createOrgMigrationFixture>>) => {
  const db = new DatabaseSync(path.join(e.root, "tokens.sqlite"));
  try {
    for (const migration of ["20260624090000_add_token_usage_ledger_events", "20260625193000_token_usage_component_pricing_explainability",
      "20260629120000_add_token_usage_display_fields", "20260702093000_token_usage_execution_address",
      "20260730090000_add_token_usage_provider_name", "20260801090000_token_usage_member_display_name"]) {
      db.exec(await fs.readFile(path.resolve("prisma/migrations", migration, "migration.sql"), "utf8"));
    }
    const columns = new Set((db.prepare("PRAGMA table_info(token_usage_ledger_events)").all() as { name: string }[]).map((row) => row.name));
    const entries = Object.entries(migrationUsage(1)).filter(([key]) => columns.has(key));
    db.prepare(`INSERT INTO token_usage_ledger_events (${entries.map(([key]) => `"${key}"`).join(",")}) VALUES (${entries.map(() => "?").join(",")})`)
      .run(...entries.map(([, value]) => value === null || typeof value !== "object" ? value as string | number | null : JSON.stringify(value)));
  } finally { db.close(); }
  const result = await new TokenUsageRunRecordsV1AppDataMigration(new LegacyTokenUsageConsolidationRepository(e.client)).execute();
  expect(result.status, JSON.stringify(result)).toBe("SUCCEEDED");
  expect(await e.client.$queryRawUnsafe("SELECT COUNT(*) AS count FROM token_usage_ledger_events")).toEqual([{ count: 0n }]);
};

describe("isolated migrated Org continuation through current server lifecycle", () => {
  it.each(["first-upgrade", "token-only-rerun"] as const)("%s: preserves usage and conversation through full restore, replay and advancing response", async (mode) => {
    const e = await createOrgMigrationFixture(); fixtures.push(e);
    const { source, target } = await writeNestedRoot(e.memory);
    const treePath = path.join(source, "team_run_execution_tree.json");
    const sourceTree = JSON.parse(await fs.readFile(treePath, "utf8"));
    const lead = sourceTree.rootTeam.members[1].members[0];
    lead.platformAgentRunId = retainedThread;
    lead.launchConfiguration.runtimeKind = "codex_app_server";
    lead.launchConfiguration.workspaceRootPath = null;
    await putOrgFixture(treePath, sourceTree);
    const historicalTrace = JSON.stringify({ id: "historical-user", trace_type: "user", turn_id: "historical-turn", seq: 1, ts: 123,
      content: "Continue this retained conversation" }) + "\n";
    await putOrgFixture(path.join(source, "org-team", "org-lead", "raw_traces_active.jsonl"), historicalTrace, true);
    if (mode === "token-only-rerun") expect((await e.migrate()).status).toBe("SUCCEEDED");
    await materializeLegacyUsage(e);
    const before = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "org-lead" } });
    expect(before.rootTeamRunId).toBe("org"); expect(before.accountingTotalTokens).toBe(120n);
    expect(before.estimatedApiTotalCost).toBe(0.0357);
    const facets = await e.client.tokenUsageAnalyticsDailyFacet.findMany();
    const read = vi.spyOn(fs, "readFile"), enumerate = vi.spyOn(fs, "readdir"), write = vi.spyOn(fs, "writeFile");
    const result = await e.migrate();
    expect(result.status, JSON.stringify(result)).toBe("SUCCEEDED");
    if (mode === "token-only-rerun") {
      expect(read.mock.calls.every(([file]) => /(?:execution_tree|history_index)\.json$/.test(String(file)))).toBe(true);
      expect(enumerate.mock.calls.map(([file]) => String(file))).toEqual([path.join(e.memory, "agent_teams"), path.join(e.memory, "agent_orgs")]);
      expect(write).not.toHaveBeenCalled();
    }
    vi.restoreAllMocks();
    const corrected = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "org-lead" } });
    expect(corrected).toEqual({ ...before, rootTeamRunId: null, rootAttributionStatus: "unknown",
      identitySummaryJson: JSON.stringify({ ...JSON.parse(before.identitySummaryJson), rootTeamRunIds: { status: "unknown" } }),
    });
    expect(await e.client.tokenUsageAnalyticsDailyFacet.findMany()).toEqual(facets);
    expect(await fs.readFile(path.join(target, "org-team", "org-lead", "raw_traces_active.jsonl"), "utf8")).toBe(historicalTrace);

    // Route the unchanged default event pipeline to this test-owned real SQL store.
    // Pricing and display lookup use deterministic fixture values, not ambient settings.
    const record = e.store.recordObservation.bind(e.store);
    vi.spyOn(TokenUsageRunStore.prototype, "recordObservation").mockImplementation(record);
    vi.spyOn(TokenCostCalculator.prototype, "enrichCost").mockImplementation(async (payload) => payload);
    const runtime = createMigrationContinuationRuntime(e.memory, e.store); runtimes.push(runtime);
    const org = await runtime.manager.restore("org");
    expect(org.isActive()).toBe(true); expect(runtime.restoreBackend).not.toHaveBeenCalled();
    const events: AgentOrgRunEvent[] = [];
    org.subscribeToEvents(({ event }) => events.push(event));
    for (const ordinal of [1, 2]) {
      expect(await org.executeAgentCommand("org-lead", { kind: "post_message", message: new AgentInputUserMessage(`Continue ${ordinal}`) })).toMatchObject({ accepted: true });
      await vi.waitFor(() => expect(events.some((event) => event.kind === "agent_presentation" && event.message.type === "ASSISTANT_COMPLETE"
        && event.message.payload.content === `Continued response ${ordinal}`)).toBe(true), { timeout: 5000 });
      await vi.waitFor(() => expect(events.filter((event) => event.kind === "agent_presentation" && event.message.type === "TURN_COMPLETED")).toHaveLength(ordinal));
      expect(org.isActive()).toBe(true);
      const persisted = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "org-lead" } });
      if (ordinal === 1) expect(persisted).toEqual(corrected); // saved cumulative replay is a true zero-write.
      else {
        expect(persisted.accountingTotalTokens).toBe(240n);
        expect(persisted.estimatedApiTotalCost).toBe(0.0714);
        expect(persisted.rootTeamRunId).toBeNull();
        expect(JSON.parse(persisted.identitySummaryJson).rootTeamRunIds).toEqual({ status: "unknown" });
      }
    }
    const tokenEvents = events.filter((event) => event.kind === "agent_presentation" && event.message.type === "TOKEN_USAGE_UPDATED");
    expect(tokenEvents).toHaveLength(2);
    for (const [index, event] of tokenEvents.entries()) {
      if (event.kind !== "agent_presentation" || event.message.type !== "TOKEN_USAGE_UPDATED") throw new Error("Expected token DTO");
      expect(event.message.payload.run_summary_after_event).toMatchObject({ run_id: "org-lead", total_tokens: (index + 1) * 120,
        estimated_api_total_cost: (index + 1) * 0.0357 });
      expect(event).toMatchObject({ execution: { agentRunId: "org-lead", root: { rootSubjectKind: "agent_org", rootRunId: "org" } } });
      expect(JSON.stringify(event)).not.toContain("token_usage_persistence_unavailable");
    }
    expect(runtime.received).toEqual(["Continue 1", "Continue 2"]);
    expect(runtime.restoreBackend).toHaveBeenCalledTimes(1);
    expect(runtime.restored[0]?.runtimeContext).toMatchObject({ threadId: retainedThread });
    expect(runtime.failures).toEqual([]);
    expect(runtime.agentManager.listActiveRuns()).toEqual(["org-lead"]);
    const currentTree = JSON.parse(await fs.readFile(path.join(target, "agent_org_run_execution_tree.json"), "utf8"));
    expect(currentTree.rootOrg.members[1].members[0].platformAgentRunId).toBe(retainedThread);
    await runtime.recorder.waitForIdle("org-lead");
    const trace = await fs.readFile(path.join(target, "org-team", "org-lead", "raw_traces_active.jsonl"), "utf8");
    expect(trace).toContain("historical-user"); expect(trace).toContain("Continued response 2");
    expect(await e.store.getAgentRunSummary("org-lead")).toMatchObject({ root_team_run_id: null, total_tokens: 240 });
  }, 20_000);
});
