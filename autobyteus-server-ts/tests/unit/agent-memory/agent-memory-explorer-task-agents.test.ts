import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryExplorerService } from "../../../src/agent-memory/services/agent-memory-explorer-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { testOrgLaunchConfiguration } from "../../fixtures/current-agent-org-run-fixtures.js";
import { openEveryOwnFileUnder } from "../../fixtures/open-delegated-run-sources.js";

/**
 * Design D-5, contract §4 (Memory page — Agents list), AC-013; autobyteus-469 D-6, AC-012: a task agent is listed
 * while its coordinating run still exists (its own file), whether or not its Task is open; a detached one is not.
 */

const T0 = "2026-10-17T09:00:00.000Z";
const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

const copy = (agentRunId: string) => ({ address: "/code_reviewer", agentRunId, platformAgentRunId: null, delegatorAgentRunId: "hub", startedAt: T0,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: testOrgLaunchConfiguration("/workspace/reviews") } });

const hostTree = (hostRunId: string, taskExecutions: unknown[]) => validateStandaloneRootTreePayload({
  ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: hostRunId, agentDefinitionId: "assistant" }, createdAt: T0 }),
  taskExecutions,
}, hostRunId);
const writeHostMetadata = (memory: string, runId: string) => new AgentRunMetadataStore(memory).writeMetadata(runId, {
  runId, agentDefinitionId: "assistant", workspaceRootPath: "/workspace", memoryDir: new AgentMemoryLayout(memory).getStandaloneRunDirPath(runId),
  llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null, startedAt: T0,
});

describe("Memory page Agents list with task agents (D-5)", () => {
  let memory: string;
  afterEach(() => fs.rmSync(memory, { recursive: true, force: true }));

  it("lists a task agent under its definition, never Unattributed, also one whose Task closed, and leaves out a detached one", async () => {
    memory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-task-agents-")); openEveryOwnFileUnder(memory);
    const layout = new AgentMemoryLayout(memory);
    await writeHostMetadata(memory, "hub");
    await new StandaloneRootPackageStore().writeTree(layout.getAgentRunCollaborationDirPath("hub"), hostTree("hub", [copy("open-copy"), copy("closed-copy")]));
    // The hub's tree holds no closed run (it left at its Task's closure): the Memory page still lists it (D-6).
    // `detached-copy` belongs to a coordinating run that was deleted afterwards.
    await writeHostMetadata(memory, "deleted-hub");
    await new StandaloneRootPackageStore().writeTree(layout.getAgentRunCollaborationDirPath("deleted-hub"), hostTree("deleted-hub", [{ ...copy("detached-copy"), delegatorAgentRunId: "deleted-hub" }]));
    fs.rmSync(layout.getStandaloneRunDirPath("deleted-hub"), { recursive: true });
    for (const runId of ["hub", "open-copy", "closed-copy", "detached-copy"]) touch(path.join(memory, "agents", runId, "raw_traces_active.jsonl"), 1000);

    const service = new AgentMemoryExplorerService(new MemoryFileStore(memory), memory);
    const groups = (await service.listAgentsWithMemory()).entries;
    expect(groups.map((group) => [group.attribution, group.agentDefinitionId, group.runCount]).sort())
      .toEqual([["DEFINITION", "assistant", 1], ["DEFINITION", "code-reviewer", 2]]);
    const runs = (await service.listAgentRunsWithMemory({ attribution: "DEFINITION", agentDefinitionId: "code-reviewer" })).entries;
    expect(runs.map((run) => run.runId).sort()).toEqual(["closed-copy", "open-copy"]);
    expect(runs).toContainEqual(expect.objectContaining({ runId: "open-copy", agentDefinitionId: "code-reviewer", workspaceRootPath: "/workspace/reviews", createdAt: T0 }));
    expect((await service.listAgentsWithMemory("reviews")).entries.map((group) => group.agentDefinitionId)).toEqual(["code-reviewer"]);
  });

  it("shows a task-agent-only group under its definition's name, and the id only when the definition is gone (DEC-018)", async () => {
    memory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-task-agents-")); openEveryOwnFileUnder(memory);
    const retired = { ...copy("retired-copy"), source: { ...copy("retired-copy").source, agentDefinitionId: "retired-agent" } };
    await writeHostMetadata(memory, "hub");
    await new StandaloneRootPackageStore().writeTree(new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath("hub"), hostTree("hub", [copy("reviewer-copy"), retired]));
    for (const runId of ["reviewer-copy", "retired-copy"]) touch(path.join(memory, "agents", runId, "raw_traces_active.jsonl"), 1000);
    const definitions: Record<string, { name: string }> = { "code-reviewer": { name: "Code Reviewer" } };
    const service = new AgentMemoryExplorerService(new MemoryFileStore(memory), memory, {
      agentDefinitions: { getAgentDefinitionById: async (id) => definitions[id] ?? null },
    });

    const groups = (await service.listAgentsWithMemory()).entries;
    expect(groups.map((group) => [group.agentDefinitionId, group.displayName]).sort())
      .toEqual([["code-reviewer", "Code Reviewer"], ["retired-agent", "retired-agent"]]);
    // The name is searchable like any other group's name.
    expect((await service.listAgentsWithMemory("Code Reviewer")).entries.map((group) => group.agentDefinitionId)).toEqual(["code-reviewer"]);
  });

  it("does not read a coordinating run's tree: one whose tree cannot be read still has its task agents listed (D-6, rule 7)", async () => {
    memory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-task-agents-")); openEveryOwnFileUnder(memory);
    const dir = new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath("hub");
    await writeHostMetadata(memory, "hub");
    await new StandaloneRootPackageStore().writeTree(dir, hostTree("hub", [copy("copy-a"), copy("copy-b")]));
    fs.writeFileSync(path.join(dir, "collaboration_tree.json"), "{ not json");
    for (const runId of ["copy-a", "copy-b"]) touch(path.join(memory, "agents", runId, "raw_traces_active.jsonl"), 1000);
    const groups = (await new AgentMemoryExplorerService(new MemoryFileStore(memory), memory).listAgentsWithMemory()).entries;
    expect(groups.map((group) => [group.agentDefinitionId, group.runCount])).toEqual([["code-reviewer", 2]]);
  });
});
