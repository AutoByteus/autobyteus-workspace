import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DelegatedCopyOwnFileCompleteV1AppDataMigration } from "../../../src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import { link, releasedAgentOwnFile, releasedTeamOwnTree } from "../../fixtures/app-data-migrations/released-delegated-copy-own-file-fixtures.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";
import {
  createImportedAgentMemoryExplorerService,
  createImportedTeamMemoryExplorerService,
} from "../../../src/memory-sync/hub/imported-memory-explorer-adapter.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * REQ-015, AC-018, contract §4 / §12.3a: Memory Sync on the task-agent layout, with no Memory Sync source change.
 * F-SYNC-NEW: an upgraded node exports its task agents as their own run folders, and the Memory page over that import
 * shows its hubs with their task agents (an Org-coordinated task agent is not listed: `agent_orgs/` is not exported).
 * F-SYNC-OLD: an import from a node not yet upgraded shows its hubs without their nested task agents; nothing is deleted.
 */

const T0 = "2026-10-17T09:00:00.000Z";
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const tempRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "memory-sync-task-agents-"));
  roots.push(root);
  return root;
};
const put = async (file: string, content: string) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf-8");
};
const filesUnder = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(file)); else out.push(path.relative(dir, file));
  }
  return out.sort();
};
const catalogCopy = (agentRunId: string, delegatorAgentRunId: string) => ({
  address: "/code_reviewer", agentRunId, platformAgentRunId: null, delegatorAgentRunId, startedAt: T0,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch },
});
const writeHubMetadata = (memory: string, runId: string) => new AgentRunMetadataStore(memory).writeMetadata(runId, {
  runId, agentDefinitionId: "assistant", workspaceRootPath: "/workspace", memoryDir: new AgentMemoryLayout(memory).getStandaloneRunDirPath(runId),
  llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null, startedAt: T0,
});

/** An upgraded node: an Agent hub, a Team hub and an Org hub, each with one task agent that wrote memory. */
const seedUpgradedNode = async (memory: string) => {
  const layout = new AgentMemoryLayout(memory);
  await writeHubMetadata(memory, "hub");
  await new StandaloneRootPackageStore().writeTree(layout.getAgentRunCollaborationDirPath("hub"), validateStandaloneRootTreePayload({
    ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "hub", agentDefinitionId: "assistant" }, createdAt: T0 }),
    taskExecutions: [catalogCopy("hub-copy", "hub")],
  }, "hub"));

  const teamDir = layout.getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
  const base = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/lead", createdAt: T0,
    children: [testAgentNode("/lead", { agentRunId: "team-lead" }), testAgentNode("/writer", { agentRunId: "team-writer", agentDefinitionId: "writer" })] });
  const writerCopy = { address: "/writer", agentRunId: "team-copy", platformAgentRunId: null, delegatorAgentRunId: "team-lead", startedAt: T0,
    source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: base.rootTeam.members[1]!.launchConfiguration } };
  await writeCurrentTeamRunPackage(teamDir, validateTeamRunExecutionTreePayload({ ...base, rootTeam: { ...base.rootTeam, taskExecutions: [writerCopy] } }, "team-root"));

  const orgBase = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "org-director")] });
  await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath("org-root"), validateAgentOrgRunExecutionTreePayload({
    ...orgBase, rootOrg: { ...orgBase.rootOrg, taskExecutions: [catalogCopy("org-copy", "org-director")] } }, "org-root"));

  for (const dir of [layout.getStandaloneRunDirPath("hub"), ...["hub-copy", "team-copy", "org-copy"].map((id) => layout.getStandaloneRunDirPath(id)),
    path.join(teamDir, "team-lead")]) {
    await put(path.join(dir, "raw_traces_active.jsonl"), `${path.basename(dir)} memory\n`);
  }
  return { teamDefinitionId: base.rootTeam.teamDefinitionId };
};

/** What the hub's ingestion stores: every exported file at `<import root>/<kind>/<relativePath>`. */
const exportAndImport = async (sourceMemory: string, importRoot: string): Promise<string[]> => {
  const scanned = await new LocalMemoryExportScanner({ getMemoryDir: () => sourceMemory }).scan();
  expect(scanned.deferred).toEqual([]);
  for (const file of scanned.files) {
    await put(path.join(importRoot, file.kind, file.relativePath), await fs.readFile(path.join(sourceMemory, file.kind, file.relativePath), "utf-8"));
  }
  return scanned.files.map((file) => `${file.kind}/${file.relativePath}`);
};

describe("Memory Sync on the task-agent layout (REQ-015, AC-018)", () => {
  it("F-SYNC-NEW: an upgraded node exports task agents as their own run folders and its import shows hubs with their task agents", async () => {
    const root = await tempRoot();
    const source = path.join(root, "source", "memory");
    const importRoot = path.join(root, "hub", "memory", "imports", "node-a");
    const { teamDefinitionId } = await seedUpgradedNode(source);

    const exported = await exportAndImport(source, importRoot);
    // Task agents leave as their own run folders, including the Org-coordinated one (its hub's `agent_orgs/` is not exported).
    expect(exported).toEqual(expect.arrayContaining([
      "agents/hub-copy/run_metadata.json", "agents/hub-copy/raw_traces_active.jsonl",
      "agents/team-copy/run_metadata.json", "agents/team-copy/raw_traces_active.jsonl",
      "agents/org-copy/run_metadata.json", "agents/org-copy/raw_traces_active.jsonl",
      "agents/hub/collaboration/collaboration_tree.json", "agent_teams/team-root/team_run_execution_tree.json",
    ]));
    expect(exported.some((file) => file.startsWith("agent_orgs/"))).toBe(false);
    expect(exported.some((file) => /^agents\/hub\/collaboration\/hub-copy\//.test(file))).toBe(false);

    try {
      const agents = createImportedAgentMemoryExplorerService(importRoot);
      const groups = (await agents.listAgentsWithMemory()).entries;
      expect(groups.map((group) => [group.agentDefinitionId, group.runCount]).sort()).toEqual([["assistant", 1], ["code-reviewer", 1], ["writer", 1]]);
      const reviewers = (await agents.listAgentRunsWithMemory({ attribution: "DEFINITION", agentDefinitionId: "code-reviewer" })).entries;
      expect(reviewers.map((run) => run.runId)).toEqual(["hub-copy"]);
      const writers = (await agents.listAgentRunsWithMemory({ attribution: "DEFINITION", agentDefinitionId: "writer" })).entries;
      expect(writers.map((run) => run.runId)).toEqual(["team-copy"]);

      // The imported Team hub still shows its task agent as a task member whose memory view opens at its own folder.
      const teams = createImportedTeamMemoryExplorerService(importRoot);
      const teamRuns = (await teams.listAgentTeamRunsWithMemory(teamDefinitionId)).entries;
      expect(teamRuns.map((run) => run.teamRunId)).toEqual(["team-root"]);
      expect(teamRuns[0]!.memberTargets.map((target) => target.agentRunId).sort()).toEqual(["team-copy", "team-lead"]);
    } finally {
      resetRootRunPackageReadinessIndex(importRoot);
    }
  });

  it("F-X3: mirrors from a node on the 10-17 shape stay byte-identical; readable copies are shown, the rest are left out and the source still lists its other runs", async () => {
    const root = await tempRoot();
    const memory = path.join(root, "hub", "memory");
    const importRoot = path.join(memory, "imports", "node-c");
    const released = { coordinating: { kind: "agent" as const, runId: "hub" }, delegator: "hub" };
    await writeHubMetadata(importRoot, "hub");
    await put(path.join(new AgentMemoryLayout(importRoot).getAgentRunCollaborationDirPath("hub"), "collaboration_tree.json"), JSON.stringify({
      ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "hub", agentDefinitionId: "assistant" }, createdAt: T0 }),
      taskExecutions: [link("/code_reviewer", { agentRunId: "mirror-catalog" }, "hub"), link("/writer", { agentRunId: "mirror-configured" }, "hub"),
        link("/product_team", { teamRunId: "mirror-team" }, "hub")],
    }, null, 2));
    // F-X3: a catalog agent copy with `origin` (readable: the current reader ignores it and it has a launch).
    await put(path.join(importRoot, "agents", "mirror-catalog", "run_metadata.json"), JSON.stringify(releasedAgentOwnFile(importRoot, "mirror-catalog",
      { ...released, address: "/code_reviewer", origin: "catalog", agentDefinitionId: "code-reviewer", launch: { ...launch } })));
    // F-X3b: a configured-place agent copy with null launch; F-X3c: a catalog team copy in the released member shape.
    await put(path.join(importRoot, "agents", "mirror-configured", "run_metadata.json"), JSON.stringify(releasedAgentOwnFile(importRoot, "mirror-configured",
      { ...released, address: "/writer", origin: "configured_place", agentDefinitionId: "writer", launch: null })));
    await put(path.join(importRoot, "agent_teams", "mirror-team", "team_run_execution_tree.json"), JSON.stringify(releasedTeamOwnTree("mirror-team",
      { ...released, address: "/product_team", origin: "catalog", teamDefinitionId: "product-team", members: [{ name: "lead" }], defaultLaunchConfiguration: { ...launch } })));
    for (const id of ["hub", "mirror-catalog", "mirror-configured"]) await put(path.join(importRoot, "agents", id, "raw_traces_active.jsonl"), `${id} memory\n`);
    const contents = async (dir: string): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) Object.assign(out, await contents(file)); else out[path.relative(importRoot, file)] = await fs.readFile(file, "utf-8");
      }
      return out;
    };
    const before = await contents(importRoot);

    // The hub's own startup migration never discovers mirrors.
    const migrated = await new DelegatedCopyOwnFileCompleteV1AppDataMigration(memory, {
      ledger: { getRecord: async (migrationId: string) => ({ migrationId, status: "SUCCEEDED" }) as never },
    }).execute();
    expect(migrated.summary.scannedCount).toBe(0);
    expect(await contents(importRoot)).toEqual(before);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const agents = createImportedAgentMemoryExplorerService(importRoot);
      const groups = (await agents.listAgentsWithMemory()).entries;
      // The hub and the readable mirrored copy are shown by definition. The unreadable configured-place copy is not
      // attributed to its definition: like any run whose metadata cannot be read, its memory stays reachable under
      // "Unattributed runs" (nothing lost, DESIGN rule 7). The team copy has no memory of its own here.
      expect(groups.map((group) => [group.attribution, group.agentDefinitionId, group.runCount])).toEqual(expect.arrayContaining([
        ["DEFINITION", "assistant", 1], ["DEFINITION", "code-reviewer", 1], ["UNATTRIBUTED", null, 1],
      ]));
      expect(groups).toHaveLength(3);
      expect((await agents.listAgentsWithMemory("writer")).entries).toEqual([]);
      const unattributed = (await agents.listAgentRunsWithMemory({ attribution: "UNATTRIBUTED" })).entries;
      expect(unattributed.map((run) => run.runId)).toEqual(["mirror-configured"]);
    } finally {
      resetRootRunPackageReadinessIndex(importRoot);
      warn.mockRestore();
    }
    expect(await contents(importRoot)).toEqual(before);
  });

  it("F-SYNC-OLD: an import from a node not yet upgraded shows its hubs without their nested task agents, and nothing is deleted", async () => {
    const root = await tempRoot();
    const importRoot = path.join(root, "hub", "memory", "imports", "node-b");
    // The released layout: the task agent's full record in the hub's tree and its memory nested in the hub's folder.
    await writeHubMetadata(importRoot, "hub");
    const hubDir = new AgentMemoryLayout(importRoot).getAgentRunCollaborationDirPath("hub");
    await put(path.join(hubDir, "collaboration_tree.json"), JSON.stringify({
      ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "hub", agentDefinitionId: "assistant" }, createdAt: T0 }),
      taskExecutions: [catalogCopy("hub-copy", "hub")],
    }, null, 2));
    await put(path.join(importRoot, "agents", "hub", "raw_traces_active.jsonl"), "hub memory\n");
    await put(path.join(hubDir, "hub-copy", "raw_traces_active.jsonl"), "copy memory\n");
    const before = await filesUnder(importRoot);

    try {
      const agents = createImportedAgentMemoryExplorerService(importRoot);
      const groups = (await agents.listAgentsWithMemory()).entries;
      expect(groups.map((group) => [group.agentDefinitionId, group.runCount])).toEqual([["assistant", 1]]);
      expect((await agents.listAgentsWithMemory("code-reviewer")).entries).toEqual([]);
    } finally {
      resetRootRunPackageReadinessIndex(importRoot);
    }
    expect(await filesUnder(importRoot)).toEqual(before);
  });
});
