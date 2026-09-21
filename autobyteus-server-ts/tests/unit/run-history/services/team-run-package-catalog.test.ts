import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { TaskDelegationRecordsV1Store } from "../../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../../../src/services/team-communication/team-communication-v1-store.js";
import {
  resetTeamRunPackageCatalog,
  TeamRunPackageCatalog,
} from "../../../../src/run-history/services/team-run-package-catalog.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const createPackage = (rootTeamRunId: string) => ({
  executionTree: testExecutionTree({
    rootTeamRunId,
    rootTeamDefinitionId: `definition-${rootTeamRunId}`,
    coordinatorAddress: "/coordinator",
    children: [testAgentNode("/coordinator", { agentRunId: `${rootTeamRunId}-coordinator` })],
  }),
  taskRecords: { schemaVersion: 1 as const, rootTeamRunId, records: [] },
  communicationMessages: { schemaVersion: 1 as const, rootTeamRunId, messages: [] },
});

describe("TeamRunPackageCatalog V2 current-only readiness", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-v2-catalog-"));
    layout = new AgentMemoryLayout(memoryDir);
    resetTeamRunPackageCatalog(memoryDir);
  });

  afterEach(async () => {
    resetTeamRunPackageCatalog(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const writePackage = async (rootTeamRunId: string) => {
    const state = createPackage(rootTeamRunId);
    const teamMemoryDir = layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(teamMemoryDir, state.executionTree);
    await new TaskDelegationRecordsV1Store().write(teamMemoryDir, state.taskRecords);
    await new TeamCommunicationV1Store().write(teamMemoryDir, state.communicationMessages);
    return teamMemoryDir;
  };

  it("admits a strict current package without writing any package authority", async () => {
    const rootTeamRunId = "native-flat-team";
    const packageDir = await writePackage(rootTeamRunId);
    const authorityPaths = [
      path.join(packageDir, "team_run_execution_tree.json"),
      path.join(packageDir, "task_delegation_records.json"),
      path.join(packageDir, "team_communication_messages.json"),
    ];
    const before = await Promise.all(authorityPaths.map(async (file) => ({
      bytes: await fs.readFile(file),
      mtimeMs: (await fs.stat(file)).mtimeMs,
    })));

    const catalog = new TeamRunPackageCatalog(memoryDir);
    await catalog.rebuild();

    expect(catalog.listAdmittedRootIds()).toEqual([rootTeamRunId]);
    expect(catalog.getDiagnostics()).toEqual(new Map());
    const after = await Promise.all(authorityPaths.map(async (file) => ({
      bytes: await fs.readFile(file),
      mtimeMs: (await fs.stat(file)).mtimeMs,
    })));
    expect(after).toEqual(before);
  });

  it("excludes only an invalid current package while admitting an unrelated valid root", async () => {
    const invalidRoot = "a-invalid-root";
    const validRoot = "b-valid-root";
    const invalidDir = await writePackage(invalidRoot);
    await writePackage(validRoot);
    await fs.writeFile(path.join(invalidDir, "task_delegation_records.json"), JSON.stringify({
      schemaVersion: 1,
      rootTeamRunId: invalidRoot,
      records: [],
      legacyFallback: true,
    }, null, 2));

    const catalog = new TeamRunPackageCatalog(memoryDir);
    await catalog.rebuild();

    expect(catalog.listAdmittedRootIds()).toEqual([validRoot]);
    expect(catalog.getDiagnostics().get(invalidRoot)).toContain("ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED");
    expect(catalog.getDiagnostics().has(validRoot)).toBe(false);
  });
});
