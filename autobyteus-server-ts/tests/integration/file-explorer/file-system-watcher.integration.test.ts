import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  AddChange,
  ChangeType,
  DeleteChange,
  FileSystemChange,
  FileSystemChangeEvent,
} from "../../../src/file-explorer/file-system-changes.js";
import { FileExplorer } from "../../../src/file-explorer/file-explorer.js";

const createTempWorkspace = async (): Promise<string> => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-watch-"));
  return base;
};

const nextEvent = async (
  events: AsyncGenerator<string, void, void>,
  timeoutMs = 30000,
): Promise<FileSystemChangeEvent> => {
  const timer = new Promise<never>((_, reject) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      reject(new Error("Timed out waiting for event"));
    }, timeoutMs);
  });

  const next = events.next().then((result) => {
    if (result.done || !result.value) {
      throw new Error("Event stream ended without data");
    }
    return FileSystemChangeEvent.fromJson(result.value);
  });

  return Promise.race([timer, next]);
};

const expectEventAfterAction = async (
  events: AsyncGenerator<string, void, void>,
  action: () => Promise<void> | void,
  timeoutMs = 30000,
): Promise<FileSystemChangeEvent> => {
  const eventPromise = nextEvent(events, timeoutMs);
  await Promise.resolve();
  await action();
  return eventPromise;
};

const expectNoEventAfterAction = async (
  events: AsyncGenerator<string, void, void>,
  action: () => Promise<void> | void,
  timeoutMs = 1200,
): Promise<void> => {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const nextPromise = events.next().then((result) => {
    if (result.done || !result.value) {
      throw new Error("Event stream ended without data");
    }
    return result.value;
  });

  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeoutHandle = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  await Promise.resolve();
  await action();

  const outcome = await Promise.race([
    nextPromise.then(() => "event" as const),
    timeoutPromise,
  ]);

  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }

  if (outcome !== "timeout") {
    throw new Error("Unexpected event received");
  }

  nextPromise.catch(() => undefined);
  if (events.return) {
    void events.return();
  }
};

const waitForChange = async (
  events: AsyncGenerator<string, void, void>,
  predicate: (change: FileSystemChange) => boolean,
  timeoutMs = 30000,
): Promise<FileSystemChange> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(deadline - Date.now(), 50);
    const event = await nextEvent(events, remaining);
    const match = event.changes.find(predicate);
    if (match) {
      return match;
    }
  }
  throw new Error("Timed out waiting for change");
};

describe("FileSystemWatcher integration", () => {
  let workspace: string;
  let explorer: FileExplorer;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
    explorer = new FileExplorer(workspace);
    await explorer.buildWorkspaceDirectoryTree();
    await explorer.startWatcher();
  });

  afterEach(async () => {
    await explorer.close();
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it(
    "emits add + modify + delete events",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const filePath = path.join(workspace, "watch.txt");
      await fs.writeFile(filePath, "hello", { encoding: "utf-8" });

      const addEvent = await nextEvent(stream);
      expect(addEvent.changes[0]?.type).toBe(ChangeType.ADD);

      await fs.writeFile(filePath, "update", { encoding: "utf-8" });
      const modifyEvent = await nextEvent(stream);
      expect(modifyEvent.changes[0]?.type).toBe(ChangeType.MODIFY);

      await fs.unlink(filePath);
      const deleteEvent = await nextEvent(stream);
      expect(deleteEvent.changes[0]?.type).toBe(ChangeType.DELETE);

      await stream.return?.();
    },
  );

  it(
    "emits move/rename event",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const srcPath = path.join(workspace, "source.txt");
      const destPath = path.join(workspace, "renamed.txt");
      await fs.writeFile(srcPath, "hello", { encoding: "utf-8" });
      await nextEvent(stream); // consume add

      await fs.rename(srcPath, destPath);
      const moveEvent = await nextEvent(stream);
      expect([ChangeType.MOVE, ChangeType.RENAME]).toContain(moveEvent.changes[0]?.type);

      await stream.return?.();
    },
  );

  it(
    "emits file creation event with node metadata",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const filePath = path.join(workspace, "new_file.txt");
      const changePromise = waitForChange(
        stream,
        (change) => change.type === ChangeType.ADD,
        8000,
      );

      await fs.writeFile(filePath, "hello", { encoding: "utf-8" });

      const change = (await changePromise) as AddChange;
      const node = change.node;
      const nodePath = node.pathValue ?? node.getPath();
      expect(node.name).toBe("new_file.txt");
      expect(nodePath).toBe("new_file.txt");
      expect(node.isFile).toBe(true);

      await stream.return?.();
    },
  );

  it(
    "emits folder creation and deletion events",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const folderPath = path.join(workspace, "new_folder");
      await fs.mkdir(folderPath);
      const addChange = (await waitForChange(
        stream,
        (change) =>
          change.type === ChangeType.ADD &&
          (change as AddChange).node.name === "new_folder",
        12000,
      )) as AddChange;
      expect(addChange.node.name).toBe("new_folder");
      expect(addChange.node.isFile).toBe(false);

      await explorer.buildWorkspaceDirectoryTree();
      const nodeToDelete = explorer.getTree()?.findNodeByPath("new_folder");
      if (!nodeToDelete || !nodeToDelete.parent) {
        throw new Error("Folder node missing in tree");
      }

      await fs.rm(folderPath, { recursive: true, force: true });
      const deleteChange = (await waitForChange(
        stream,
        (change) =>
          change.type === ChangeType.DELETE &&
          (change as DeleteChange).nodeId === nodeToDelete.id,
        12000,
      )) as DeleteChange;
      expect(deleteChange.nodeId).toBe(nodeToDelete.id);
      expect(deleteChange.parentId).toBe(nodeToDelete.parent.id);

      await stream.return?.();
    },
  );

  it(
    "ignores default strategy paths like __pycache__",
    { timeout: 30000 },
    async () => {
      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }

      const pycachePath = path.join(workspace, "__pycache__");
      await expectNoEventAfterAction(ignoreStream, () => fs.mkdir(pycachePath), 1200);
    },
  );

  it(
    "ignores specific folders like .git and their contents",
    { timeout: 30000 },
    async () => {
      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }

      const gitDir = path.join(workspace, ".git");
      await expectNoEventAfterAction(ignoreStream, () => fs.mkdir(gitDir), 1200);

      const ignoreStream2 = explorer.fileWatcher?.events();
      if (!ignoreStream2) {
        throw new Error("Watcher not started");
      }
      const headPath = path.join(gitDir, "HEAD");
      await expectNoEventAfterAction(ignoreStream2, () => fs.writeFile(headPath, "ref", "utf-8"), 1200);
    },
  );

  it(
    "respects nested .gitignore files",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const projectDir = path.join(workspace, "project");
      await expectEventAfterAction(stream, () => fs.mkdir(projectDir));

      const gitignorePath = path.join(projectDir, ".gitignore");
      await expectEventAfterAction(stream, () => fs.writeFile(gitignorePath, "build/\n*.log\n"));

      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }
      await expectNoEventAfterAction(
        ignoreStream,
        () =>
          Promise.all([
            fs.mkdir(path.join(projectDir, "build")),
            fs.writeFile(path.join(projectDir, "app.log"), "log", "utf-8"),
          ]),
        1000,
      );

      const change = await expectEventAfterAction(stream, () =>
        fs.writeFile(path.join(projectDir, "main.ts"), "main", "utf-8"),
      );
      const addChange = change.changes.find((item) => item.type === ChangeType.ADD) as
        | AddChange
        | undefined;
      expect(addChange?.node.name).toBe("main.ts");

      await stream.return?.();
    },
  );

  it(
    "respects root .gitignore files",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      await expectEventAfterAction(stream, () =>
        fs.writeFile(path.join(workspace, ".gitignore"), "*.tmp\nlogs/\n"),
      );

      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }
      await expectNoEventAfterAction(
        ignoreStream,
        () =>
          Promise.all([
            fs.writeFile(path.join(workspace, "tempfile.tmp"), "tmp", "utf-8"),
            fs.mkdir(path.join(workspace, "logs")),
          ]),
        1000,
      );

      await stream.return?.();
    },
  );

  it(
    "captures rapid changes without dropping events",
    { timeout: 25000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const event = await expectEventAfterAction(stream, () => {
        const filePath = path.join(workspace, "another_file.txt");
        const folderPath = path.join(workspace, "another_folder");
        return Promise.all([fs.writeFile(filePath, "hello", "utf-8"), fs.mkdir(folderPath)]);
      });

      const addNames = new Set<string>();
      for (const change of event.changes) {
        if (change.type === ChangeType.ADD) {
          const node = (change as AddChange).node;
          addNames.add(node.name);
        }
      }

      if (!addNames.has("another_file.txt") || !addNames.has("another_folder")) {
        const second = await nextEvent(stream, 4000);
        for (const change of second.changes) {
          if (change.type === ChangeType.ADD) {
            const node = (change as AddChange).node;
            addNames.add(node.name);
          }
        }
      }

      expect(addNames.has("another_file.txt")).toBe(true);
      expect(addNames.has("another_folder")).toBe(true);

      await stream.return?.();
    },
  );

  it(
    "ignores moves into ignored directories",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      await expectEventAfterAction(stream, () =>
        fs.writeFile(path.join(workspace, ".gitignore"), "build/\n"),
      );

      const sourceFile = path.join(workspace, "main.js");
      await expectEventAfterAction(stream, () => fs.writeFile(sourceFile, "main", "utf-8"));

      const buildDir = path.join(workspace, "build");
      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }
      await expectNoEventAfterAction(ignoreStream, () => fs.mkdir(buildDir), 1500);

      const ignoreStream2 = explorer.fileWatcher?.events();
      if (!ignoreStream2) {
        throw new Error("Watcher not started");
      }
      await expectNoEventAfterAction(
        ignoreStream2,
        () => fs.rename(sourceFile, path.join(buildDir, "main.js")),
        1000,
      );

      await stream.return?.();
    },
  );

  it(
    "emits delete events even if the in-memory node is missing",
    { timeout: 30000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const ghostPath = path.join(workspace, "ghost_file.txt");
      await expectEventAfterAction(stream, () => fs.writeFile(ghostPath, "ghost", "utf-8"));

      await explorer.buildWorkspaceDirectoryTree();
      const node = explorer.getTree()?.findNodeByPath("ghost_file.txt");
      if (!node || !node.parent) {
        throw new Error("Node not found in tree after creation");
      }
      const originalId = node.id;

      explorer.rootNode!.children = explorer.rootNode!.children.filter(
        (child) => child.name !== "ghost_file.txt",
      );

      const deleteChangePromise = waitForChange(
        stream,
        (change) => change.type === ChangeType.DELETE,
        8000,
      );

      await fs.unlink(ghostPath);
      const deleteChange = (await deleteChangePromise) as DeleteChange;
      expect(deleteChange.nodeId).toBe(originalId);

      await stream.return?.();
    },
  );
});
