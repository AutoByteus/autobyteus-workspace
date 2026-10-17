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

/** Design D-5, contract §4 (Memory page — Agents list), AC-013. */

const T0 = "2026-10-17T09:00:00.000Z";
const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

const copy = (agentRunId: string) => ({ address: "/code_reviewer", agentRunId, platformAgentRunId: null, delegatorAgentRunId: "hub", startedAt: T0,
  source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: testOrgLaunchConfiguration("/workspace/reviews") } });

describe("Memory page Agents list with task agents (D-5)", () => {
  let memory: string;
  afterEach(() => fs.rmSync(memory, { recursive: true, force: true }));

  it("lists a task agent under its definition, never Unattributed, and leaves out a detached one", async () => {
    memory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-task-agents-"));
    const layout = new AgentMemoryLayout(memory);
    await new AgentRunMetadataStore(memory).writeMetadata("hub", {
      runId: "hub", agentDefinitionId: "assistant", workspaceRootPath: "/workspace", memoryDir: layout.getStandaloneRunDirPath("hub"),
      llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null, startedAt: T0,
    });
    const store = new StandaloneRootPackageStore();
    const dir = layout.getAgentRunCollaborationDirPath("hub");
    await store.writeTree(dir, validateStandaloneRootTreePayload({
      ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "hub", agentDefinitionId: "assistant" }, createdAt: T0 }),
      taskExecutions: [copy("linked-copy"), copy("detached-copy")],
    }, "hub"));
    // The hub no longer links `detached-copy` (as after deleting the coordinating run that linked it).
    const raw = JSON.parse(fs.readFileSync(path.join(dir, "collaboration_tree.json"), "utf8"));
    raw.taskExecutions = raw.taskExecutions.filter((link: { agentRunId: string }) => link.agentRunId === "linked-copy");
    fs.writeFileSync(path.join(dir, "collaboration_tree.json"), JSON.stringify(raw));
    for (const runId of ["hub", "linked-copy", "detached-copy"]) touch(path.join(memory, "agents", runId, "raw_traces_active.jsonl"), 1000);

    const service = new AgentMemoryExplorerService(new MemoryFileStore(memory), memory);
    const groups = (await service.listAgentsWithMemory()).entries;
    expect(groups.map((group) => [group.attribution, group.agentDefinitionId, group.runCount]).sort())
      .toEqual([["DEFINITION", "assistant", 1], ["DEFINITION", "code-reviewer", 1]]);
    const runs = (await service.listAgentRunsWithMemory({ attribution: "DEFINITION", agentDefinitionId: "code-reviewer" })).entries;
    expect(runs).toEqual([expect.objectContaining({ runId: "linked-copy", agentDefinitionId: "code-reviewer", workspaceRootPath: "/workspace/reviews", createdAt: T0 })]);
    expect((await service.listAgentsWithMemory("reviews")).entries.map((group) => group.agentDefinitionId)).toEqual(["code-reviewer"]);
  });

  it("shows a task-agent-only group under its definition's name, and the id only when the definition is gone (DEC-018)", async () => {
    memory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-task-agents-"));
    const retired = { ...copy("retired-copy"), source: { ...copy("retired-copy").source, agentDefinitionId: "retired-agent" } };
    await new StandaloneRootPackageStore().writeTree(new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath("hub"), validateStandaloneRootTreePayload({
      ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "hub", agentDefinitionId: "assistant" }, createdAt: T0 }),
      taskExecutions: [copy("reviewer-copy"), retired],
    }, "hub"));
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

  it("skips the task agents of a coordinating run whose tree cannot be read, with one warning naming the run (rule 7)", async () => {
    memory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-task-agents-"));
    const dir = new AgentMemoryLayout(memory).getAgentRunCollaborationDirPath("hub");
    await new StandaloneRootPackageStore().writeTree(dir, validateStandaloneRootTreePayload({
      ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "hub", agentDefinitionId: "assistant" }, createdAt: T0 }),
      taskExecutions: [copy("copy-a"), copy("copy-b")],
    }, "hub"));
    fs.writeFileSync(path.join(dir, "collaboration_tree.json"), "{ not json");
    for (const runId of ["copy-a", "copy-b"]) touch(path.join(memory, "agents", runId, "raw_traces_active.jsonl"), 1000);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const groups = (await new AgentMemoryExplorerService(new MemoryFileStore(memory), memory).listAgentsWithMemory()).entries;
      expect(groups).toEqual([]);
      const skipped = warn.mock.calls.map((call) => String(call[0])).filter((line) => line.includes("Skipping the task agents"));
      expect(skipped).toHaveLength(1);
      expect(skipped[0]).toContain("agent run 'hub'");
    } finally {
      warn.mockRestore();
    }
  });
});
