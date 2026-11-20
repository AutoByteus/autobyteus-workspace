import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import {
  GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID,
  SemanticMemoryWorkspace,
} from "../../../src/workspaces/semantic-memory-workspace.js";

/**
 * The Memory page's view of a semantic memory folder (autobyteus-554 REQ-007, AC-006, AC-011): a transient workspace
 * created on demand for an existing folder only, read-only, links not followed, never listed, never a run's workspace.
 */
const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "semantic-memory-workspace-")));
const memoryDir = path.join(base, "memory");
const agentFolder = path.join(memoryDir, "semantic", "team-local-agent%3Ase%3Adesigner");
const globalFolder = path.join(memoryDir, "semantic-global");
const agentWorkspaceId = `semantic_ws_${encodeURIComponent("team-local-agent:se:designer")}`;

let manager: WorkspaceManager;
let appDataDir: string;

beforeAll(() => {
  // The process semantic memory reads the memory folder once, on first use: this file's own.
  vi.spyOn(appConfigProvider.config, "getMemoryDir").mockReturnValue(memoryDir);
});
afterAll(() => {
  vi.restoreAllMocks();
  fs.rmSync(base, { recursive: true, force: true });
});

beforeEach(() => {
  appDataDir = fs.mkdtempSync(path.join(base, "app-data-"));
  vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(appDataDir);
  vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(path.join(appDataDir, "temp"));
  (WorkspaceManager as unknown as { instance: WorkspaceManager | null }).instance = null;
  manager = WorkspaceManager.getInstance();
});

afterEach(async () => {
  for (const workspace of manager.getAllWorkspaces()) await workspace.close();
  fs.rmSync(path.join(memoryDir, "semantic"), { recursive: true, force: true });
  fs.rmSync(globalFolder, { recursive: true, force: true });
});

const makeFolders = () => {
  fs.mkdirSync(agentFolder, { recursive: true });
  fs.mkdirSync(globalFolder, { recursive: true });
};

describe("SemanticMemoryWorkspace through WorkspaceManager", () => {
  it("opens an agent's existing folder and the global folder on demand: read-only, links not followed", async () => {
    makeFolders();
    const agent = await manager.getOrCreateWorkspace(agentWorkspaceId);
    const global = await manager.getOrCreateWorkspace(GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID);
    for (const [workspace, folder] of [[agent, agentFolder], [global, globalFolder]] as const) {
      expect(workspace).toBeInstanceOf(SemanticMemoryWorkspace);
      expect(workspace.getBasePath()).toBe(folder);
      expect(workspace.metadata.kind).toBe("semantic_memory");
      expect(workspace.readOnly).toBe(true);
      expect(workspace.followSymbolicLinks).toBe(false);
    }
    expect(await manager.getOrCreateWorkspace(agentWorkspaceId)).toBe(agent);
  });

  it("refuses a missing folder and never creates it (AC-005)", async () => {
    await expect(manager.getOrCreateWorkspace(agentWorkspaceId)).rejects.toThrow("Semantic memory folder is missing or not a folder");
    await expect(manager.getOrCreateWorkspace(GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID)).rejects.toThrow("missing or not a folder");
    expect(fs.existsSync(agentFolder)).toBe(false);
    expect(fs.existsSync(globalFolder)).toBe(false);
    expect(manager.getAllWorkspaces()).toEqual([]);
  });

  it("refuses an ID that would leave semantic/ or is malformed (AC-006)", async () => {
    await expect(manager.getOrCreateWorkspace("semantic_ws_..")).rejects.toThrow("agentDefinitionId is invalid.");
    await expect(manager.getOrCreateWorkspace("semantic_ws_%2E%2E")).rejects.toThrow("agentDefinitionId is invalid.");
    await expect(manager.getOrCreateWorkspace("semantic_ws_%E0%A4%A")).rejects.toThrow(URIError);
  });

  it("refuses a folder that is itself a link", async () => {
    const outside = fs.mkdtempSync(path.join(base, "outside-"));
    fs.mkdirSync(path.dirname(agentFolder), { recursive: true });
    fs.symlinkSync(outside, agentFolder);
    await expect(manager.getOrCreateWorkspace(agentWorkspaceId)).rejects.toThrow("missing or not a folder");
  });

  it("never lists a semantic memory workspace (AC-011)", async () => {
    makeFolders();
    const listed = fs.mkdtempSync(path.join(base, "listed-"));
    await manager.ensureWorkspaceByRootPath(listed);
    await manager.getOrCreateWorkspace(agentWorkspaceId);
    await manager.getOrCreateWorkspace(GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID);
    const visible = await manager.listVisibleWorkspaces();
    expect(visible.map((workspace) => workspace.metadata.kind)).not.toContain("semantic_memory");
    expect(visible.map((workspace) => workspace.getBasePath())).toContain(listed);
  });

  it("refuses a semantic workspace as a run's workspace, opened or not, without creating one (AC-011)", async () => {
    await expect(manager.getOrCreateRunWorkspace(agentWorkspaceId)).rejects.toMatchObject({ code: "WORKSPACE_NOT_RUNNABLE" });
    expect(manager.getAllWorkspaces()).toEqual([]);
    makeFolders();
    await manager.getOrCreateWorkspace(GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID);
    await expect(manager.getOrCreateRunWorkspace(GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID)).rejects.toThrow("WORKSPACE_NOT_RUNNABLE");

    const runnable = fs.mkdtempSync(path.join(base, "runnable-"));
    const workspace = await manager.ensureWorkspaceByRootPath(runnable);
    expect(await manager.getOrCreateRunWorkspace(workspace.workspaceId)).toBe(workspace);
  });

  it("refuses writes on the semantic workspace only, and reading a path through a link (AC-006)", async () => {
    makeFolders();
    const outside = fs.mkdtempSync(path.join(base, "outside-"));
    fs.writeFileSync(path.join(outside, "secret.md"), "secret");
    fs.symlinkSync(outside, path.join(agentFolder, "shared"));
    fs.symlinkSync(path.join(outside, "secret.md"), path.join(agentFolder, "secret-link.md"));
    fs.writeFileSync(path.join(agentFolder, "notes.md"), "notes");

    const workspace = await manager.getOrCreateWorkspace(agentWorkspaceId);
    expect(() => workspace.assertWritable()).toThrow("WORKSPACE_READ_ONLY");
    expect(() => new FileSystemWorkspace({ rootPath: base }).assertWritable()).not.toThrow();

    expect(await workspace.resolveReadablePath("notes.md")).toBe(path.join(agentFolder, "notes.md"));
    await expect(workspace.resolveReadablePath("secret-link.md")).rejects.toMatchObject({ code: "WORKSPACE_LINK_NOT_OPENED" });
    await expect(workspace.resolveReadablePath("shared/secret.md")).rejects.toMatchObject({ code: "WORKSPACE_LINK_NOT_OPENED" });
    // A workspace that follows links reads through them as before.
    expect(await new FileSystemWorkspace({ rootPath: agentFolder }).resolveReadablePath("shared/secret.md"))
      .toBe(path.join(agentFolder, "shared", "secret.md"));
  });
});
