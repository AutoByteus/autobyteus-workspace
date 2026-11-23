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
import { WorkspaceFileExplorer } from "../../../src/file-explorer/file-explorer.js";
import { FILE_EVENT_TEST_TIMEOUT_MS, IN_PROCESS_SERVER_HOOK_TIMEOUT_MS, OS_FILE_EVENT_WAIT_MS } from "../../helpers/os-latency-under-load.js";
import { labelFileEventTimeout, OS_FILE_EVENT_PROBE_MS } from "../../helpers/os-file-event-probe.js";

const createTempWorkspace = async (): Promise<string> => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-watch-"));
  return base;
};

/**
 * autobyteus-500 FU-021: the tests assert outcomes, not timing. Under CPU contention an event can arrive late and a rename
 * can come as a delete and an add in separate batches, so every wait collects changes until the expected one appears,
 * under one hang guard; a "no event" check uses a sentinel change instead of a quiet window. The guard is one budget per
 * test, shared by its waits: the shared OS file-event limit (autobyteus-517 `os-latency-under-load.ts`, TESTING.md "File
 * watching on a busy Mac"). The test timeout is the helper's file-event test timeout plus the 10 s environment probe that
 * runs when the guard is reached, so the probe still runs (and labels the failure) before it.
 */
const HANG_GUARD_MS = OS_FILE_EVENT_WAIT_MS;
const TEST_TIMEOUT_MS = FILE_EVENT_TEST_TIMEOUT_MS + OS_FILE_EVENT_PROBE_MS;
let guardEndsAt = 0;
const HANG_GUARD_MESSAGE = "Timed out waiting for event (hang guard)";

/**
 * SR-013/SR-014 (D-13, D-13b): when a wait reaches the hang guard, the shared probe (`os-file-event-probe.ts`) labels the
 * failure `ENVIRONMENT` or `INCONCLUSIVE` (TESTING.md "File watching on a busy Mac"); neither is a product verdict.
 */
const nextEvent = async (
  events: AsyncGenerator<string, void, void>,
  timeoutMs = HANG_GUARD_MS,
): Promise<FileSystemChangeEvent> => {
  let timeout: NodeJS.Timeout | null = null;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(HANG_GUARD_MESSAGE)), timeoutMs);
  });
  const next = events.next().then((result) => {
    if (result.done || !result.value) {
      throw new Error("Event stream ended without data");
    }
    return FileSystemChangeEvent.fromJson(result.value);
  });
  try {
    return await Promise.race([timer, next]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

/** Every change until one matches `expected`, under the test's hang guard. */
const collectUntil = async (
  events: AsyncGenerator<string, void, void>,
  expected: (change: FileSystemChange) => boolean,
): Promise<FileSystemChange[]> => {
  const deadline = guardEndsAt;
  const changes: FileSystemChange[] = [];
  try {
    while (!changes.some(expected)) {
      changes.push(...(await nextEvent(events, Math.max(deadline - Date.now(), 1))).changes);
    }
  } catch (error) {
    if (!(error instanceof Error) || error.message !== HANG_GUARD_MESSAGE) throw error;
    // The case's diagnostics: what arrived before the guard.
    const seen = JSON.stringify(changes.map((change) => ({ type: change.type, path: pathOf(change) || (change as { path?: string }).path })));
    throw await labelFileEventTimeout(`Changes before the guard: ${seen}`);
  }
  return changes;
};

/** The changes after `action`, up to the first one matching `expected` (any change when none is given). */
const expectEventAfterAction = async (
  events: AsyncGenerator<string, void, void>,
  action: () => Promise<void> | void,
  expected: (change: FileSystemChange) => boolean = () => true,
): Promise<FileSystemChangeEvent> => {
  const collected = collectUntil(events, expected);
  await Promise.resolve();
  await action();
  return new FileSystemChangeEvent(await collected);
};

const pathOf = (change: FileSystemChange): string => {
  const node = (change as AddChange).node;
  return node ? (node.pathValue ?? node.getPath()) : "";
};

/**
 * No change for the ignored path: after `action`, a sentinel file is written in `root` (watched), and every change up to
 * the sentinel's add is checked. The watcher reports in order, so an ignored change would come before it. The sentinel is
 * then removed and its delete awaited, so no late sentinel change reaches a later subscriber.
 */
const expectNoEventAfterAction = async (
  events: AsyncGenerator<string, void, void>,
  action: () => Promise<void> | void,
  root: string,
): Promise<void> => {
  const sentinel = `sentinel-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  const isSentinel = (change: FileSystemChange) => pathOf(change).endsWith(sentinel)
    || (change as { path?: string }).path?.endsWith(sentinel) === true;
  const collected = collectUntil(events, isSentinel);
  await Promise.resolve();
  await action();
  await fs.writeFile(path.join(root, sentinel), "sentinel", "utf-8");
  const changes = await collected;
  expect(changes.filter((change) => !isSentinel(change)), "an ignored path reported a change").toEqual([]);
  const sentinelNodeId = (changes.find(isSentinel) as AddChange).node.id;
  await expectEventAfterAction(events, () => fs.rm(path.join(root, sentinel), { force: true }),
    (change) => change.type === ChangeType.DELETE && (change as DeleteChange).nodeId === sentinelNodeId);
  if (events.return) {
    void events.return();
  }
};

const isAddOf = (name: string) => (change: FileSystemChange) =>
  change.type === ChangeType.ADD && (change as AddChange).node.name === name;

const waitForChange = async (
  events: AsyncGenerator<string, void, void>,
  predicate: (change: FileSystemChange) => boolean,
): Promise<FileSystemChange> => (await collectUntil(events, predicate)).find(predicate)!;

describe("FileSystemWatcher integration", () => {
  let workspace: string;
  let explorer: WorkspaceFileExplorer;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
    explorer = new WorkspaceFileExplorer(workspace);
    await explorer.buildWorkspaceDirectoryTree();
    await explorer.startWatcher();
    guardEndsAt = Date.now() + HANG_GUARD_MS;
  }, IN_PROCESS_SERVER_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await explorer.close();
    await fs.rm(workspace, { recursive: true, force: true });
  }, IN_PROCESS_SERVER_HOOK_TIMEOUT_MS);

  it(
    "does not emit events for pre-existing root .gitignore excluded directories",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const isolatedWorkspace = await createTempWorkspace();
      const isolatedExplorer = new WorkspaceFileExplorer(isolatedWorkspace);

      try {
        await fs.writeFile(path.join(isolatedWorkspace, ".gitignore"), ".nuxt/\nnode_modules/\n", "utf-8");
        await fs.mkdir(path.join(isolatedWorkspace, ".nuxt", "types"), { recursive: true });
        await fs.mkdir(path.join(isolatedWorkspace, "node_modules", "pkg"), { recursive: true });
        await fs.mkdir(path.join(isolatedWorkspace, "src"), { recursive: true });

        await isolatedExplorer.buildWorkspaceDirectoryTree();
        await isolatedExplorer.startWatcher();
        const ignoredStream = isolatedExplorer.fileWatcher?.events();
        if (!ignoredStream) {
          throw new Error("Watcher not started");
        }

        await expectNoEventAfterAction(
          ignoredStream,
          () =>
            Promise.all([
              fs.writeFile(path.join(isolatedWorkspace, ".nuxt", "types", "ignored.ts"), "ignored"),
              fs.writeFile(path.join(isolatedWorkspace, "node_modules", "pkg", "ignored.js"), "ignored"),
            ]),
          isolatedWorkspace,
        );
      } finally {
        await isolatedExplorer.close();
        await fs.rm(isolatedWorkspace, { recursive: true, force: true });
      }
    },
  );

  it(
    "does not emit events for pre-existing nested .gitignore excluded directories",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const isolatedWorkspace = await createTempWorkspace();
      const isolatedExplorer = new WorkspaceFileExplorer(isolatedWorkspace);

      try {
        await fs.mkdir(path.join(isolatedWorkspace, "project", "build", "generated"), {
          recursive: true,
        });
        await fs.mkdir(path.join(isolatedWorkspace, "project", "src"), { recursive: true });
        await fs.writeFile(path.join(isolatedWorkspace, "project", ".gitignore"), "build/\n", "utf-8");

        await isolatedExplorer.buildWorkspaceDirectoryTree();
        await isolatedExplorer.startWatcher();
        const ignoredStream = isolatedExplorer.fileWatcher?.events();
        if (!ignoredStream) {
          throw new Error("Watcher not started");
        }

        await expectNoEventAfterAction(
          ignoredStream,
          () => fs.writeFile(path.join(isolatedWorkspace, "project", "build", "generated", "ignored.ts"), "ignored"),
          isolatedWorkspace,
        );
      } finally {
        await isolatedExplorer.close();
        await fs.rm(isolatedWorkspace, { recursive: true, force: true });
      }
    },
  );

  it(
    "emits add + modify + delete events",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const filePath = path.join(workspace, "watch.txt");
      const addEvent = await expectEventAfterAction(stream, () =>
        fs.writeFile(filePath, "hello", { encoding: "utf-8" }), (change) => change.type === ChangeType.ADD,
      );
      expect(addEvent.changes.some((change) => change.type === ChangeType.ADD)).toBe(true);

      const modifyEvent = await expectEventAfterAction(stream, () =>
        fs.writeFile(filePath, "update", { encoding: "utf-8" }), (change) => change.type === ChangeType.MODIFY,
      );
      expect(modifyEvent.changes.some((change) => change.type === ChangeType.MODIFY)).toBe(true);

      const deleteEvent = await expectEventAfterAction(stream, () => fs.unlink(filePath), (change) => change.type === ChangeType.DELETE);
      expect(deleteEvent.changes.some((change) => change.type === ChangeType.DELETE)).toBe(true);

      await stream.return?.();
    },
  );

  it(
    "returns one idle event stream without stopping other subscribers",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const firstStream = explorer.fileWatcher?.events();
      const secondStream = explorer.fileWatcher?.events();
      if (!firstStream || !secondStream || !firstStream.return) {
        throw new Error("Watcher streams not started");
      }

      const pendingFirstRead = firstStream.next();
      const returned = await Promise.race([
        firstStream.return(),
        new Promise<IteratorResult<string, void>>((_, reject) =>
          setTimeout(() => reject(new Error("Timed out returning idle stream")), 500),
        ),
      ]);
      expect(returned.done).toBe(true);

      const pendingResult = await Promise.race([
        pendingFirstRead,
        new Promise<IteratorResult<string, void>>((_, reject) =>
          setTimeout(() => reject(new Error("Timed out unwinding pending idle stream read")), 500),
        ),
      ]);
      expect(pendingResult.done).toBe(true);

      const filePath = path.join(workspace, "second-subscriber-still-live.txt");
      const event = await expectEventAfterAction(secondStream, () =>
        fs.writeFile(filePath, "second subscriber stays active", { encoding: "utf-8" }), (change) => change.type === ChangeType.ADD,
      );
      expect(event.changes.some((change) => change.type === ChangeType.ADD)).toBe(true);

      await secondStream.return?.();
    },
  );

  it(
    "emits move/rename event",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const srcPath = path.join(workspace, "source.txt");
      const destPath = path.join(workspace, "renamed.txt");
      await expectEventAfterAction(stream, () => fs.writeFile(srcPath, "hello", { encoding: "utf-8" }), (change) => change.type === ChangeType.ADD);

      // A move or rename, or (when batching splits it) a delete and then an add of the destination.
      const changes = (await expectEventAfterAction(stream, () => fs.rename(srcPath, destPath), (change) =>
        change.type === ChangeType.MOVE || change.type === ChangeType.RENAME || (change.type === ChangeType.ADD && pathOf(change) === "renamed.txt"))).changes;
      const moved = changes.some((change) => change.type === ChangeType.MOVE || change.type === ChangeType.RENAME);
      expect(moved || (changes.some((change) => change.type === ChangeType.DELETE) && changes.some((change) => change.type === ChangeType.ADD)),
        JSON.stringify(changes.map((change) => change.type))).toBe(true);
      // The explorer's tree: the source is gone, the destination is there.
      await explorer.buildWorkspaceDirectoryTree();
      expect(explorer.getTree()?.findNodeByPath("source.txt")).toBeFalsy();
      expect(explorer.getTree()?.findNodeByPath("renamed.txt")).toBeTruthy();

      await stream.return?.();
    },
  );

  it(
    "emits file creation event with node metadata",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const filePath = path.join(workspace, "new_file.txt");
      const changePromise = waitForChange(
        stream,
        (change) => change.type === ChangeType.ADD,
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
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const folderPath = path.join(workspace, "new_folder");
      const addEvent = await expectEventAfterAction(stream, () => fs.mkdir(folderPath), (change) => change.type === ChangeType.ADD);
      const addChange = addEvent.changes.find((change) => change.type === ChangeType.ADD) as
        | AddChange
        | undefined;
      expect(addChange?.node.name).toBe("new_folder");
      expect(addChange?.node.isFile).toBe(false);

      await explorer.buildWorkspaceDirectoryTree();
      const nodeToDelete = explorer.getTree()?.findNodeByPath("new_folder");
      if (!nodeToDelete || !nodeToDelete.parent) {
        throw new Error("Folder node missing in tree");
      }

      const deleteChangePromise = waitForChange(
        stream,
        (change) => change.type === ChangeType.DELETE,
      );
      await fs.rm(folderPath, { recursive: true, force: true });
      const deleteChange = (await deleteChangePromise) as DeleteChange;
      expect(deleteChange.nodeId).toBe(nodeToDelete.id);
      expect(deleteChange.parentId).toBe(nodeToDelete.parent.id);

      await stream.return?.();
    },
  );

  it(
    "ignores default strategy paths like __pycache__",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }

      const pycachePath = path.join(workspace, "__pycache__");
      await expectNoEventAfterAction(ignoreStream, () => fs.mkdir(pycachePath), workspace);
    },
  );

  it(
    "ignores specific folders like .git and their contents",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }

      const gitDir = path.join(workspace, ".git");
      await expectNoEventAfterAction(ignoreStream, () => fs.mkdir(gitDir), workspace);

      const ignoreStream2 = explorer.fileWatcher?.events();
      if (!ignoreStream2) {
        throw new Error("Watcher not started");
      }
      const headPath = path.join(gitDir, "HEAD");
      await expectNoEventAfterAction(ignoreStream2, () => fs.writeFile(headPath, "ref", "utf-8"), workspace);
    },
  );

  it(
    "respects nested .gitignore files",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const projectDir = path.join(workspace, "project");
      await expectEventAfterAction(stream, () => fs.mkdir(projectDir), isAddOf("project"));

      const gitignorePath = path.join(projectDir, ".gitignore");
      await expectEventAfterAction(stream, () => fs.writeFile(gitignorePath, "build/\n*.log\n"), isAddOf(".gitignore"));

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
        workspace,
      );

      const change = await expectEventAfterAction(stream, () =>
        fs.writeFile(path.join(projectDir, "main.ts"), "main", "utf-8"), isAddOf("main.ts"),
      );
      const addChange = change.changes.find(isAddOf("main.ts")) as
        | AddChange
        | undefined;
      expect(addChange?.node.name).toBe("main.ts");

      await stream.return?.();
    },
  );

  it(
    "respects root .gitignore files",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      await expectEventAfterAction(stream, () =>
        fs.writeFile(path.join(workspace, ".gitignore"), "*.tmp\nlogs/\n"), isAddOf(".gitignore"),
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
        workspace,
      );

      await stream.return?.();
    },
  );

  it(
    "captures rapid changes without dropping events",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      // Both adds, in one batch or two: collected until both arrived.
      const addNames = new Set<string>();
      const bothAdded = (change: FileSystemChange) => {
        if (change.type === ChangeType.ADD) addNames.add((change as AddChange).node.name);
        return addNames.has("another_file.txt") && addNames.has("another_folder");
      };
      await expectEventAfterAction(stream, () => {
        const filePath = path.join(workspace, "another_file.txt");
        const folderPath = path.join(workspace, "another_folder");
        return Promise.all([fs.writeFile(filePath, "hello", "utf-8"), fs.mkdir(folderPath)]);
      }, bothAdded);

      expect(addNames.has("another_file.txt")).toBe(true);
      expect(addNames.has("another_folder")).toBe(true);

      await stream.return?.();
    },
  );

  it(
    "treats moves into ignored directories as deletes from the visible tree",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      await expectEventAfterAction(stream, () =>
        fs.writeFile(path.join(workspace, ".gitignore"), "build/\n"), isAddOf(".gitignore"),
      );

      const sourceFile = path.join(workspace, "main.js");
      await expectEventAfterAction(stream, () => fs.writeFile(sourceFile, "main", "utf-8"), isAddOf("main.js"));
      const sourceNode = explorer.getTree()?.findNodeByPath("main.js");
      if (!sourceNode || !sourceNode.parent) {
        throw new Error("Source node missing in tree");
      }

      const buildDir = path.join(workspace, "build");
      const ignoreStream = explorer.fileWatcher?.events();
      if (!ignoreStream) {
        throw new Error("Watcher not started");
      }
      await expectNoEventAfterAction(ignoreStream, () => fs.mkdir(buildDir), workspace);

      const ignoreStream2 = explorer.fileWatcher?.events();
      if (!ignoreStream2) {
        throw new Error("Watcher not started");
      }
      const deleteChangePromise = waitForChange(
        ignoreStream2,
        (change) => change.type === ChangeType.DELETE,
      );
      await fs.rename(sourceFile, path.join(buildDir, "main.js"));
      const deleteChange = (await deleteChangePromise) as DeleteChange;
      expect(deleteChange.nodeId).toBe(sourceNode.id);
      expect(deleteChange.parentId).toBe(sourceNode.parent.id);

      await stream.return?.();
    },
  );

  it(
    "emits delete events even if the in-memory node is missing",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const ghostPath = path.join(workspace, "ghost_file.txt");
      await expectEventAfterAction(stream, () => fs.writeFile(ghostPath, "ghost", "utf-8"), isAddOf("ghost_file.txt"));

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
      );

      await fs.unlink(ghostPath);
      const deleteChange = (await deleteChangePromise) as DeleteChange;
      expect(deleteChange.nodeId).toBe(originalId);

      await stream.return?.();
    },
  );
});
