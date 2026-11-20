import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FileExplorerResolver } from "../../../src/api/graphql/types/file-explorer.js";
import { WorkspaceResolver } from "../../../src/api/graphql/types/workspace.js";
import { registerWorkspaceRoutes } from "../../../src/api/rest/workspaces.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

/**
 * The semantic memory view's workspace through the node's API (autobyteus-554 REQ-007, AC-006, AC-010, AC-011): every
 * write is refused before any file is touched, a link's content is refused, and the workspace is never listed.
 */
const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "semantic-memory-access-")));
const memoryDir = path.join(base, "memory");
const folder = path.join(memoryDir, "semantic", "operator");
const globalFolder = path.join(memoryDir, "semantic-global");
const outside = path.join(base, "outside");
const WORKSPACE_IDS = ["semantic_ws_operator", "semantic_global_ws"];

/** Every file and link under a folder with its bytes or target: the folder's exact state. */
const snapshot = (dir: string): Record<string, string> => Object.fromEntries(
  fs.readdirSync(dir, { recursive: true, withFileTypes: true }).map((entry) => {
    const full = path.join(entry.parentPath, entry.name);
    const value = entry.isSymbolicLink() ? `link:${fs.readlinkSync(full)}` : entry.isFile() ? fs.readFileSync(full, "utf8") : "dir";
    return [path.relative(dir, full), value];
  }),
);

beforeAll(() => {
  vi.spyOn(appConfigProvider.config, "getMemoryDir").mockReturnValue(memoryDir);
  vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(path.join(base, "app-data"));
  vi.spyOn(appConfigProvider.config, "getTempWorkspaceDir").mockReturnValue(path.join(base, "temp"));
  (WorkspaceManager as unknown as { instance: WorkspaceManager | null }).instance = null;
});
afterAll(async () => {
  for (const workspace of WorkspaceManager.getInstance().getAllWorkspaces()) await workspace.close();
  vi.restoreAllMocks();
  fs.rmSync(base, { recursive: true, force: true });
});

beforeEach(() => {
  for (const dir of [path.join(folder, "notes"), globalFolder, outside]) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(folder, "notes", "linkedin.md"), "# LinkedIn\n");
  fs.writeFileSync(path.join(globalFolder, "product.md"), "# Product\n");
  fs.writeFileSync(path.join(outside, "secret.md"), "secret\n");
  fs.symlinkSync(outside, path.join(folder, "shared"));
  fs.symlinkSync(path.join(outside, "secret.md"), path.join(folder, "secret-link.md"));
});
afterEach(() => {
  fs.rmSync(memoryDir, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

describe("GraphQL file explorer on a semantic memory workspace", () => {
  const resolver = new FileExplorerResolver();

  it.each(WORKSPACE_IDS)("refuses every write on %s with WORKSPACE_READ_ONLY and leaves the folders byte-identical", async (workspaceId) => {
    const before = { agent: snapshot(folder), global: snapshot(globalFolder), outside: snapshot(outside) };
    const file = workspaceId === "semantic_global_ws" ? "product.md" : "notes/linkedin.md";
    for (const write of [
      () => resolver.writeFileContent(workspaceId, file, "changed"),
      () => resolver.writeFileContent(workspaceId, "new.md", "new"),
      () => resolver.createFileOrFolder(workspaceId, "created", false),
      () => resolver.renameFileOrFolder(workspaceId, file, "renamed.md"),
      () => resolver.moveFileOrFolder(workspaceId, file, "moved.md"),
      () => resolver.deleteFileOrFolder(workspaceId, file),
      () => resolver.writeFileContent(workspaceId, "shared/secret.md", "through the link"),
    ]) {
      await expect(write()).rejects.toThrow("WORKSPACE_READ_ONLY");
    }
    expect({ agent: snapshot(folder), global: snapshot(globalFolder), outside: snapshot(outside) }).toEqual(before);
  });

  it("lists links as link rows and refuses their content; reads regular files (AC-006)", async () => {
    const top = JSON.parse(await resolver.folderChildren("semantic_ws_operator", ""));
    expect(top.children.map((child: { name: string; is_symbolic_link: boolean }) => [child.name, child.is_symbolic_link])).toEqual([
      ["notes", false], ["secret-link.md", true], ["shared", true],
    ]);
    expect(JSON.parse(await resolver.fileContent("semantic_ws_operator", "secret-link.md")).error).toMatch(/^WORKSPACE_LINK_NOT_OPENED/);
    expect(JSON.parse(await resolver.fileContent("semantic_ws_operator", "shared/secret.md")).error).toMatch(/^WORKSPACE_LINK_NOT_OPENED/);
    expect(JSON.parse(await resolver.folderChildren("semantic_ws_operator", "shared")).error).toMatch(/^WORKSPACE_LINK_NOT_OPENED/);
    expect(await resolver.fileContent("semantic_ws_operator", "notes/linkedin.md")).toBe("# LinkedIn\n");
    expect(await resolver.fileContent("semantic_global_ws", "product.md")).toBe("# Product\n");
  });

  it("never lists the opened semantic workspaces in the workspaces query (AC-011)", async () => {
    await resolver.folderChildren("semantic_ws_operator", "");
    await resolver.folderChildren("semantic_global_ws", "");
    const listed = await new WorkspaceResolver().workspaces();
    expect(listed.map((workspace) => workspace.kind)).not.toContain("semantic_memory");
    expect(listed.map((workspace) => workspace.workspaceId)).not.toEqual(expect.arrayContaining(["semantic_ws_operator"]));
  });
});

describe("workspace content route on a semantic memory workspace", () => {
  it("serves a regular file and refuses a link or a path through one (403 WORKSPACE_LINK_NOT_OPENED)", async () => {
    await new FileExplorerResolver().folderChildren("semantic_ws_operator", "");
    const app = fastify();
    await registerWorkspaceRoutes(app);
    try {
      const get = (route: string, file: string) => app.inject({ method: "GET", url: route === "content"
        ? `/workspaces/semantic_ws_operator/content?path=${encodeURIComponent(file)}`
        : `/workspaces/semantic_ws_operator/static/${file}` });
      for (const route of ["content", "static"]) {
        const ok = await get(route, "notes/linkedin.md");
        expect([ok.statusCode, ok.body]).toEqual([200, "# LinkedIn\n"]);
        for (const file of ["secret-link.md", "shared/secret.md"]) {
          const refused = await get(route, file);
          expect(refused.statusCode).toBe(403);
          expect(refused.json()).toMatchObject({ code: "WORKSPACE_LINK_NOT_OPENED" });
        }
      }
    } finally {
      await app.close();
    }
  });
});
