import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentSemanticMemory } from "../../../src/agent-memory/services/agent-semantic-memory.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";

/**
 * The semantic memory owner and its folder (REQ-003, REQ-004, REQ-007, QR-001, QR-003; prompt contract §3):
 * one folder per agent definition under `<memory>/semantic/`, named by the URI-encoded definition ID, created
 * for a run of every agent (autobyteus-554) and never removed or rewritten.
 */
let memoryDir: string;

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

describe("AgentSemanticMemory (every agent has one, autobyteus-554 REQ-001, REQ-010)", () => {
  const agentFolder = () => path.join(path.resolve(memoryDir), "semantic", "computer-use-operator");
  const globalFolder = () => path.join(path.resolve(memoryDir), "semantic-global");

  it("returns both folders without creating them on a read, and creates both for a run (REQ-001, REQ-010)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    expect(semanticMemory.folderOf("computer-use-operator")).toBe(agentFolder());
    expect(semanticMemory.globalFolder()).toBe(globalFolder());
    await expect(fs.stat(agentFolder())).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(globalFolder())).rejects.toMatchObject({ code: "ENOENT" });

    expect(await semanticMemory.prepareForRun("computer-use-operator")).toEqual({ agentFolder: agentFolder(), globalFolder: globalFolder() });
    expect((await fs.stat(agentFolder())).isDirectory()).toBe(true);
    expect((await fs.stat(globalFolder())).isDirectory()).toBe(true);
  });

  it("gives every run of the definition the same folders and keeps what is in them (REQ-004, REQ-007, DEC-014)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    const folders = await semanticMemory.prepareForRun("computer-use-operator");
    await fs.writeFile(path.join(folders.agentFolder, "linkedin.md"), "# LinkedIn\n");
    await fs.writeFile(path.join(folders.globalFolder, "product.md"), "# Product\n");

    expect(await semanticMemory.prepareForRun("computer-use-operator")).toEqual(folders);
    expect((await new AgentSemanticMemory({ memoryDir }).prepareForRun("another-agent")).globalFolder).toBe(folders.globalFolder);
    expect(await fs.readFile(path.join(folders.agentFolder, "linkedin.md"), "utf8")).toBe("# LinkedIn\n");
    expect(await fs.readFile(path.join(folders.globalFolder, "product.md"), "utf8")).toBe("# Product\n");
  });

  it("gives a team-local agent and a shared agent with the same local name different folders (AC-006)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    const shared = await semanticMemory.prepareForRun("marketing-reply-scout");
    const teamLocal = await semanticMemory.prepareForRun("team-local-agent:marketing-team:marketing-reply-scout");
    expect(shared.agentFolder).not.toBe(teamLocal.agentFolder);
    expect((await fs.readdir(path.join(memoryDir, "semantic"))).sort()).toEqual([
      "marketing-reply-scout",
      "team-local-agent%3Amarketing-team%3Amarketing-reply-scout",
    ]);
  });

  it("refuses a blank ID or one that would leave semantic/, before touching any file (AC-006)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    expect(() => semanticMemory.folderOf("  ")).toThrow("agentDefinitionId is required.");
    await expect(semanticMemory.prepareForRun("..")).rejects.toThrow("agentDefinitionId is invalid.");
    await expect(semanticMemory.folderState("..")).rejects.toThrow("agentDefinitionId is invalid.");
    await expect(fs.stat(memoryDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reports a folder's state for the Memory page without creating it: missing, empty, holding files (AC-005, AC-010)", async () => {
    const semanticMemory = new AgentSemanticMemory({ memoryDir });
    expect(await semanticMemory.folderState("computer-use-operator")).toEqual({ folderPath: agentFolder(), exists: false, isEmpty: true });
    expect(await semanticMemory.globalFolderState()).toEqual({ folderPath: globalFolder(), exists: false, isEmpty: true });
    await expect(fs.stat(memoryDir)).rejects.toMatchObject({ code: "ENOENT" });

    await semanticMemory.prepareForRun("computer-use-operator");
    expect(await semanticMemory.folderState("computer-use-operator")).toEqual({ folderPath: agentFolder(), exists: true, isEmpty: true });
    await fs.mkdir(path.join(globalFolder(), "notes"));
    expect(await semanticMemory.globalFolderState()).toEqual({ folderPath: globalFolder(), exists: true, isEmpty: false });
  });
});
