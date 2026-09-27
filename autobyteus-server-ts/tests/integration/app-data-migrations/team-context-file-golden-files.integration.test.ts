import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { TeamContextFileExecutionLocatorsV1AppDataMigration } from "../../../src/app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.js";

const fixtures = fileURLToPath(new URL("../../fixtures/team-context-file-migration/", import.meta.url));
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe("Team attachment migration: independent source/expected golden files", () => {
  it.each([
    { name: "converted", status: "SUCCEEDED", migratedCount: 1 },
    { name: "unavailable", status: "SUCCEEDED_WITH_WARNINGS", migratedCount: 0 },
    { name: "current", status: "SUCCEEDED", migratedCount: 0 },
  ])("matches the complete $name expected file and stays stable on rerun", async ({ name, status, migratedCount }) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "team-migration-golden-"));
    roots.push(root);
    const memory = path.join(root, "memory");
    const team = path.join(memory, "agent_teams", "golden-team");
    const agent = path.join(team, "exact-worker-run");
    const context = path.join(agent, "context_files", "image.png");
    await fs.mkdir(path.dirname(context), { recursive: true });
    const blob = Buffer.from([0, 1, 2, 128, 255]);
    await fs.writeFile(context, blob);
    const tree = testExecutionTree({ rootTeamRunId: "golden-team", coordinatorAddress: "/worker",
      children: [testAgentNode("/worker", { agentRunId: "exact-worker-run" })] });
    await fs.writeFile(path.join(team, "team_run_execution_tree.json"), JSON.stringify(tree));
    await fs.writeFile(path.join(team, "task_delegation_records.json"), JSON.stringify({ schemaVersion: 1, rootTeamRunId: "golden-team", records: [] }));
    await fs.writeFile(path.join(team, "team_communication_messages.json"), JSON.stringify({ schemaVersion: 1, rootTeamRunId: "golden-team", messages: [] }));
    const source = path.join(agent, "raw_traces_active.jsonl");
    await fs.copyFile(path.join(fixtures, `${name}.source.jsonl`), source);
    // Independent checked-in oracle; never obtained from the production transformer.
    const expected = await fs.readFile(path.join(fixtures, `${name}.expected.jsonl`));
    const migration = new TeamContextFileExecutionLocatorsV1AppDataMigration(memory, () => "https://node.example:8000");
    expect(await migration.execute()).toMatchObject({ status, summary: { migratedCount, failedCount: 0 } });
    expect(await fs.readFile(source)).toEqual(expected);
    expect(await fs.readFile(context)).toEqual(blob);
    expect(await migration.execute()).toMatchObject({ status, summary: { migratedCount: 0, failedCount: 0 } });
    expect(await fs.readFile(source)).toEqual(expected);
  });
});
