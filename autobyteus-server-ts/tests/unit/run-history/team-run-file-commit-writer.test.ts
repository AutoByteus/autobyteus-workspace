import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TeamRunFileCommitWriter } from "../../../src/run-history/store/team-run-file-commit-writer.js";

const disposableDirectories: string[] = [];

const createDirectory = async (): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-writer-"));
  disposableDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(disposableDirectories.splice(0).map((directory) =>
    fs.rm(directory, { recursive: true, force: true }).catch(() => undefined),
  ));
});

describe("TeamRunFileCommitWriter", () => {
  it("reports committed only after the renamed file and directory are synchronized", async () => {
    const directory = await createDirectory();
    const filePath = path.join(directory, "team_run_execution_tree.json");
    const result = await new TeamRunFileCommitWriter().write({
      file: "execution_tree",
      filePath,
      payload: { schemaVersion: 1 },
    });

    expect(result).toEqual({ outcome: "committed", file: "execution_tree" });
    await expect(fs.readFile(filePath, "utf-8")).resolves.toBe('{\n  "schemaVersion": 1\n}\n');
  });

  it("distinguishes a rename failure from a post-rename finalization failure", async () => {
    const firstDirectory = await createDirectory();
    const renameFailurePath = path.join(firstDirectory, "task_delegation_records.json");
    const renameFailure = new TeamRunFileCommitWriter({
      operations: {
        mkdir: fs.mkdir,
        open: fs.open,
        rm: fs.rm,
        rename: async () => { throw new Error("rename rejected"); },
      },
    });
    await expect(renameFailure.write({
      file: "task_records",
      filePath: renameFailurePath,
      payload: [],
    })).resolves.toMatchObject({
      outcome: "not_renamed",
      file: "task_records",
      stage: "rename",
    });
    await expect(fs.access(renameFailurePath)).rejects.toMatchObject({ code: "ENOENT" });

    const secondDirectory = await createDirectory();
    const finalizationFailurePath = path.join(secondDirectory, "team_communication_messages.json");
    const finalizationFailure = new TeamRunFileCommitWriter({
      operations: {
        mkdir: fs.mkdir,
        rename: fs.rename,
        rm: fs.rm,
        open: async (target, flags) => {
          const handle = await fs.open(target, flags);
          if (path.resolve(String(target)) !== path.resolve(secondDirectory)) return handle;
          return Object.assign(handle, {
            sync: async () => { throw new Error("directory sync rejected"); },
          });
        },
      },
    });
    await expect(finalizationFailure.write({
      file: "communication_messages",
      filePath: finalizationFailurePath,
      payload: [],
    })).resolves.toMatchObject({
      outcome: "renamed_finalization_indeterminate",
      file: "communication_messages",
      stage: "sync_directory",
    });
    await expect(fs.readFile(finalizationFailurePath, "utf-8")).resolves.toBe("[]\n");
  });
});
