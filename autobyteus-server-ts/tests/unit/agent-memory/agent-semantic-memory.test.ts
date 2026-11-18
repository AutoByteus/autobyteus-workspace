import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentSemanticMemory } from "../../../src/agent-memory/services/agent-semantic-memory.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";

/**
 * The semantic memory owner and its folder (REQ-003, REQ-004, REQ-007, QR-001, QR-003; prompt contract §3):
 * one folder per agent definition under `<memory>/semantic/`, named by the URI-encoded definition ID, created
 * for a run of an enabled agent and never removed or rewritten.
 */
let memoryDir: string;

const agent = (id: string | null, semanticMemoryEnabled: boolean) => new AgentDefinition({
  id, name: "Agent", description: "d", instructions: "i", semanticMemoryEnabled,
});

beforeEach(async () => {
  memoryDir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "semantic-memory-")), "memory");
});
afterEach(async () => {
  await fs.rm(path.dirname(memoryDir), { recursive: true, force: true });
});

describe("AgentMemoryLayout semantic memory path (contract §3, QR-001)", () => {
  it.each([
    ["computer-use-operator", "computer-use-operator"],
    ["team-local-agent:marketing-team:marketing-reply-scout", "team-local-agent%3Amarketing-team%3Amarketing-reply-scout"],
    ["agent-org-owned-agent:my-org:helper", "agent-org-owned-agent%3Amy-org%3Ahelper"],
    ["app-agent__6a2f9c__brief-writer", "app-agent__6a2f9c__brief-writer"],
    ["team/with/slash", "team%2Fwith%2Fslash"],
  ])("%s → semantic/%s", (definitionId, folderName) => {
    const folder = new AgentMemoryLayout(memoryDir).getAgentSemanticMemoryDirPath(definitionId);
    expect(folder).toBe(path.join(path.resolve(memoryDir), "semantic", folderName));
    expect(path.isAbsolute(folder)).toBe(true);
    expect(path.basename(folder)).not.toMatch(/[<>:"/\\|?]/);
  });

  it("is a sibling of the run folders, not inside one", () => {
    const layout = new AgentMemoryLayout(memoryDir);
    const folder = layout.getAgentSemanticMemoryDirPath("computer-use-operator");
    for (const runRoot of [layout.getStandaloneRootDirPath(), layout.getTeamRootDirPath(), layout.getOrgRootDirPath()]) {
      expect(folder.startsWith(`${runRoot}${path.sep}`)).toBe(false);
    }
  });

  it("refuses a blank ID or one that names no folder", () => {
    const layout = new AgentMemoryLayout(memoryDir);
    expect(() => layout.getAgentSemanticMemoryDirPath("  ")).toThrow("agentDefinitionId is required.");
    expect(() => layout.getAgentSemanticMemoryDirPath("..")).toThrow("agentDefinitionId is invalid.");
  });
});

describe("AgentSemanticMemory", () => {
  it("gives an agent without semantic memory no folder and touches no files (REQ-008, QR-003)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    expect(semanticMemory.folderOf(agent("computer-use-operator", false))).toBeNull();
    expect(await semanticMemory.prepareForRun(agent("computer-use-operator", false))).toBeNull();
    await expect(fs.stat(memoryDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not read the app config for an agent without semantic memory", () => {
    // No memoryDir given: a read of the app config would happen on first use of the layout only.
    expect(new AgentSemanticMemory().folderOf(agent(null, false))).toBeNull();
  });

  it("returns the folder without creating it on a read, and creates it for a run (REQ-003)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    const expected = path.join(path.resolve(memoryDir), "semantic", "computer-use-operator");
    expect(semanticMemory.folderOf(agent("computer-use-operator", true))).toBe(expected);
    await expect(fs.stat(expected)).rejects.toMatchObject({ code: "ENOENT" });

    expect(await semanticMemory.prepareForRun(agent("computer-use-operator", true))).toBe(expected);
    expect((await fs.stat(expected)).isDirectory()).toBe(true);
  });

  it("gives every run of the definition the same folder and keeps what is in it (REQ-004, REQ-007)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    const folder = (await semanticMemory.prepareForRun(agent("computer-use-operator", true)))!;
    await fs.writeFile(path.join(folder, "linkedin.md"), "# LinkedIn\n");

    // Turned off: no folder for the run, the document stays. On again: the same folder, the same document.
    expect(await semanticMemory.prepareForRun(agent("computer-use-operator", false))).toBeNull();
    expect(await semanticMemory.prepareForRun(agent("computer-use-operator", true))).toBe(folder);
    expect(await new AgentSemanticMemory({ memoryDir }).prepareForRun(agent("computer-use-operator", true))).toBe(folder);
    expect(await fs.readFile(path.join(folder, "linkedin.md"), "utf8")).toBe("# LinkedIn\n");
  });

  it("gives a team-local agent and a shared agent with the same local name different folders (AC-006)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    const shared = await semanticMemory.prepareForRun(agent("marketing-reply-scout", true));
    const teamLocal = await semanticMemory.prepareForRun(agent("team-local-agent:marketing-team:marketing-reply-scout", true));
    expect(shared).not.toBe(teamLocal);
    expect((await fs.readdir(path.join(memoryDir, "semantic"))).sort()).toEqual([
      "marketing-reply-scout",
      "team-local-agent%3Amarketing-team%3Amarketing-reply-scout",
    ]);
  });

  it("refuses an enabled definition without an ID", () => {
    expect(() => new AgentSemanticMemory({ memoryDir }).folderOf(agent(null, true)))
      .toThrow("An agent definition with semantic memory must have an ID.");
  });
});
