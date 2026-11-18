import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectFolderForNewCopy } from "../../../src/projects/services/project-new-copy-folder.js";

/** A new copy's folder (autobyteus-97 REQ-001, 002, 005): the Project's first link, or none, or a coded refusal. */
describe("projectFolderForNewCopy", () => {
  let dir: string;
  const storeWith = (...workspaceRootPaths: string[]) => ({
    readProject: async () => ({ name: "AutoByteus Agents", workspaces: workspaceRootPaths.map((workspaceRootPath) => ({ workspaceRootPath })) }) as never,
  });
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), "new-copy-folder-")); });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

  it("is the first linked folder, whatever the others are (AC-005)", async () => {
    await expect(projectFolderForNewCopy(storeWith(dir, path.join(dir, "missing")), "p")).resolves.toBe(dir);
  });

  it("is null for a Project with no link: the copy inherits (AC-004)", async () => {
    await expect(projectFolderForNewCopy(storeWith(), "p")).resolves.toBeNull();
  });

  it.each(["missing", "a-file"])("refuses a first link that is not an existing folder, naming the Project and the folder: %s (AC-006)", async (name) => {
    await fs.writeFile(path.join(dir, "a-file"), "not a folder");
    const folder = path.join(dir, name);
    const refusal = projectFolderForNewCopy(storeWith(folder, dir), "p");
    await expect(refusal).rejects.toMatchObject({ code: "TASK_PROJECT_FOLDER_UNAVAILABLE" });
    await expect(refusal).rejects.toThrow(`Project "AutoByteus Agents" has the linked folder "${folder}"`);
  });

  it("does not treat a Project that is gone as having no link", async () => {
    await expect(projectFolderForNewCopy({ readProject: async () => null }, "gone")).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });
});
