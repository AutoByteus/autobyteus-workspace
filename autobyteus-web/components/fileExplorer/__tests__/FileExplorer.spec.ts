import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";

import FileExplorer from "../FileExplorer.vue";
import FileItem from "../FileItem.vue";
import { useFileExplorerStore } from "~/stores/fileExplorer";
import { useWorkspaceStore } from "~/stores/workspace";
import type { FileSystemChangeEvent } from "~/types/fileSystemChangeTypes";
import { createNodeIdToNodeDictionary } from "~/utils/fileExplorer/fileUtils";
import { TreeNode } from "~/utils/fileExplorer/TreeNode";

const mutateMock = vi.fn();

vi.mock("~/utils/apolloClient", () => ({
  getApolloClient: vi.fn(() => ({
    mutate: mutateMock,
    query: vi.fn(),
  })),
}));

const flushUi = async () => {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

const createFile = (name: string, filePath: string, id: string) =>
  new TreeNode(name, filePath, true, [], id);

const createFolder = (
  name: string,
  folderPath: string,
  id: string,
  children: TreeNode[] = [],
): TreeNode => new TreeNode(name, folderPath, false, children, id, true);

const createWorkspaceTree = (): TreeNode => {
  const ticketFolder = createFolder(
    "ticket-123",
    "tickets/in-progress/ticket-123",
    "ticket-123",
    [
      createFolder(
        "attachments",
        "tickets/in-progress/ticket-123/attachments",
        "attachments",
        [createFile("note.txt", "tickets/in-progress/ticket-123/attachments/note.txt", "note-file")],
      ),
      createFile("spec.md", "tickets/in-progress/ticket-123/spec.md", "spec-file"),
    ],
  );

  const ticketsFolder = createFolder("tickets", "tickets", "tickets", [
    createFolder("done", "tickets/done", "done"),
    createFolder("in-progress", "tickets/in-progress", "in-progress", [ticketFolder]),
  ]);

  return createFolder("workspace-root", "", "root", [ticketsFolder]);
};

const createMoveEvent = (): FileSystemChangeEvent => ({
  changes: [
    {
      type: "move",
      node: {
        name: "ticket-123",
        path: "tickets/done/ticket-123",
        is_file: false,
        children: [],
        id: "ticket-123",
        childrenLoaded: true,
      },
      old_parent_id: "in-progress",
      new_parent_id: "done",
    },
  ],
});

const getRenderedPaths = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAllComponents(FileItem)
    .map((componentWrapper) => (componentWrapper.props("file") as TreeNode).path)
    .sort();

describe("FileExplorer", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    mutateMock.mockReset();
  });

  it("renders moved descendants under the new folder after mutation and streamed echo replay", async () => {
    const workspaceStore = useWorkspaceStore();
    const fileExplorerStore = useFileExplorerStore();
    const root = createWorkspaceTree();

    workspaceStore.workspaces["ws-1"] = {
      workspaceId: "ws-1",
      name: "Test Workspace",
      fileExplorer: root,
      nodeIdToNode: createNodeIdToNodeDictionary(root),
      workspaceConfig: {},
      absolutePath: "/tmp/test-workspace",
    };

    const explorerState = fileExplorerStore._getOrCreateWorkspaceState("ws-1");
    explorerState.openFolders["tickets"] = true;
    explorerState.openFolders["tickets/in-progress"] = true;
    explorerState.openFolders["tickets/in-progress/ticket-123"] = true;
    explorerState.openFolders["tickets/done"] = true;

    const wrapper = mount(FileExplorer, {
      props: {
        workspaceId: "ws-1",
      },
      global: {
        plugins: [pinia],
        stubs: {
          FileContextMenu: true,
          ConfirmDeleteDialog: true,
          AddFileOrFolderDialog: true,
        },
      },
    });

    await flushUi();

    expect(getRenderedPaths(wrapper)).toEqual([
      "tickets",
      "tickets/done",
      "tickets/in-progress",
      "tickets/in-progress/ticket-123",
      "tickets/in-progress/ticket-123/attachments",
      "tickets/in-progress/ticket-123/spec.md",
    ]);

    const moveEvent = createMoveEvent();
    mutateMock.mockResolvedValue({
      data: {
        moveFileOrFolder: JSON.stringify(moveEvent),
      },
      errors: [],
    });

    await fileExplorerStore.moveFileOrFolder(
      "tickets/in-progress/ticket-123",
      "tickets/done/ticket-123",
      "ws-1",
    );
    await flushUi();

    expect(getRenderedPaths(wrapper)).toEqual([
      "tickets",
      "tickets/done",
      "tickets/done/ticket-123",
      "tickets/done/ticket-123/attachments",
      "tickets/done/ticket-123/spec.md",
      "tickets/in-progress",
    ]);

    workspaceStore.handleFileSystemChange("ws-1", moveEvent, "stream");
    await flushUi();

    expect(getRenderedPaths(wrapper)).toEqual([
      "tickets",
      "tickets/done",
      "tickets/done/ticket-123",
      "tickets/done/ticket-123/attachments",
      "tickets/done/ticket-123/spec.md",
      "tickets/in-progress",
    ]);
    expect(explorerState.openFolders["tickets/in-progress/ticket-123"]).toBeUndefined();
    expect(explorerState.openFolders["tickets/done/ticket-123"]).toBe(true);
  });
});
