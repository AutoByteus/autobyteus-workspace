import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
let pinia: ReturnType<typeof createPinia>;
const mountedWrappers: Array<ReturnType<typeof mount>> = [];

vi.mock("~/utils/apolloClient", () => ({
  getApolloClient: vi.fn(() => ({
    mutate: mutateMock,
    query: vi.fn(),
  })),
}));

vi.mock("@iconify/vue", () => ({
  Icon: {
    name: "Icon",
    props: ["icon"],
    template: "<span />",
  },
}));

const flushUi = async () => {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
} as unknown as FileSystemChangeEvent);

const getRenderedPaths = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAllComponents(FileItem)
    .map((componentWrapper) => (componentWrapper.props("file") as TreeNode).path)
    .sort();

const setupWorkspace = (workspaceId = "ws-context") => {
  const workspaceStore = useWorkspaceStore();
  const fileExplorerStore = useFileExplorerStore();
  vi.spyOn(workspaceStore, "acquireFileExplorerLiveSession").mockReturnValue(vi.fn());

  workspaceStore.workspaces[workspaceId] = {
    workspaceId,
    name: "Test Workspace",
    workspaceConfig: {},
    absolutePath: "/tmp/test-workspace",
  };

  const root = createWorkspaceTree();
  const explorerState = fileExplorerStore._getOrCreateWorkspaceState(workspaceId);
  explorerState.tree = root;
  explorerState.nodeIdToNode = createNodeIdToNodeDictionary(root);
  explorerState.openFolders["tickets"] = true;
  explorerState.openFolders["tickets/in-progress"] = true;
  explorerState.openFolders["tickets/in-progress/ticket-123"] = true;
  explorerState.openFolders["tickets/in-progress/ticket-123/attachments"] = true;
  explorerState.openFolders["tickets/done"] = true;

  return {
    workspaceStore,
    fileExplorerStore,
    explorerState,
    root,
  };
};

const mountFileExplorer = (options: any) => {
  const wrapper = mount(FileExplorer, options);
  mountedWrappers.push(wrapper);
  return wrapper;
};

const mountExplorerWithRealContextMenu = (workspaceId = "ws-context", active = true) => mountFileExplorer({
  props: {
    workspaceId,
    active,
  },
  global: {
    plugins: [pinia],
    mocks: {
      $t: (key: string) => key,
    },
    stubs: {
      Icon: true,
    },
  },
});

const findFileItemByPath = (wrapper: ReturnType<typeof mount>, path: string) => {
  const item = wrapper.findAllComponents(FileItem).find((componentWrapper) => {
    return (componentWrapper.props("file") as TreeNode).path === path;
  });
  if (!item) {
    throw new Error(`Unable to find FileItem for path ${path}`);
  }
  return item;
};

const getMenuLabels = () =>
  Array.from(document.body.querySelectorAll(".menu-item"))
    .map((element) => element.textContent?.trim())
    .filter(Boolean);

const clickMenuItem = async (label: string) => {
  const item = Array.from(document.body.querySelectorAll(".menu-item")).find((element) => {
    return element.textContent?.trim() === label;
  });
  expect(item, `Expected menu item "${label}" to exist`).toBeTruthy();
  item!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushUi();
};

const setDialogInputValue = async (value: string) => {
  const input = document.body.querySelector("input");
  expect(input, "Expected dialog input to exist").toBeTruthy();
  (input as HTMLInputElement).value = value;
  input!.dispatchEvent(new Event("input", { bubbles: true }));
  await flushUi();
};

const clickDialogButton = async (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((element) => {
    return element.textContent?.trim() === label;
  });
  expect(button, `Expected dialog button "${label}" to exist`).toBeTruthy();
  button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushUi();
};

const mockCreateMutation = (parentId: string, path: string, isFile: boolean) => {
  const name = path.split("/").pop() || path;
  mutateMock.mockResolvedValueOnce({
    data: {
      createFileOrFolder: JSON.stringify({
        changes: [{
          type: "add",
          parent_id: parentId,
          node: {
            name,
            path,
            is_file: isFile,
            children: [],
            id: `${parentId}-${name}`,
            childrenLoaded: true,
          },
        }],
      }),
    },
    errors: [],
  });
};

const mockDeleteMutation = (nodeId: string, parentId: string) => {
  mutateMock.mockResolvedValueOnce({
    data: {
      deleteFileOrFolder: JSON.stringify({
        changes: [{
          type: "delete",
          node_id: nodeId,
          parent_id: parentId,
        }],
      }),
    },
    errors: [],
  });
};

describe("FileExplorer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    mutateMock.mockReset();
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      try {
        wrapper.unmount();
      } catch {
        // Ignore wrappers that a test already unmounted explicitly.
      }
    }
    document.body.innerHTML = "";
  });

  it("renders moved descendants under the new folder after mutation and streamed echo replay", async () => {
    const workspaceStore = useWorkspaceStore();
    const fileExplorerStore = useFileExplorerStore();
    vi.spyOn(workspaceStore, "acquireFileExplorerLiveSession").mockReturnValue(vi.fn());
    const root = createWorkspaceTree();

    workspaceStore.workspaces["ws-1"] = {
      workspaceId: "ws-1",
      name: "Test Workspace",
      workspaceConfig: {},
      absolutePath: "/tmp/test-workspace",
    };

    const explorerState = fileExplorerStore._getOrCreateWorkspaceState("ws-1");
    explorerState.tree = root;
    explorerState.nodeIdToNode = createNodeIdToNodeDictionary(root);
    explorerState.openFolders["tickets"] = true;
    explorerState.openFolders["tickets/in-progress"] = true;
    explorerState.openFolders["tickets/in-progress/ticket-123"] = true;
    explorerState.openFolders["tickets/done"] = true;

    const wrapper = mountFileExplorer({
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

  it("acquires a visible live session and releases it on unmount", async () => {
    const workspaceStore = useWorkspaceStore();
    const release = vi.fn();
    const acquire = vi.spyOn(workspaceStore, "acquireFileExplorerLiveSession").mockReturnValue(release);
    const root = createWorkspaceTree();

    workspaceStore.workspaces["ws-live"] = {
      workspaceId: "ws-live",
      name: "Live Workspace",
      workspaceConfig: {},
      absolutePath: "/tmp/live-workspace",
    };
    const explorerState = useFileExplorerStore()._getOrCreateWorkspaceState("ws-live");
    explorerState.tree = root;
    explorerState.nodeIdToNode = createNodeIdToNodeDictionary(root);

    const wrapper = mountFileExplorer({
      props: {
        workspaceId: "ws-live",
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

    expect(acquire).toHaveBeenCalledWith("ws-live", expect.stringMatching(/^file-explorer:/));

    wrapper.unmount();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases live resources and global listeners while cached inactive", async () => {
    const workspaceStore = useWorkspaceStore();
    const fileExplorerStore = useFileExplorerStore();
    const release = vi.fn();
    const acquire = vi.spyOn(workspaceStore, "acquireFileExplorerLiveSession").mockReturnValue(release);
    const abortSearch = vi.spyOn(fileExplorerStore, "abortSearch");
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const root = createWorkspaceTree();

    workspaceStore.workspaces["ws-cached"] = {
      workspaceId: "ws-cached",
      name: "Cached Workspace",
      workspaceConfig: {},
      absolutePath: "/tmp/cached-workspace",
    };
    const explorerState = fileExplorerStore._getOrCreateWorkspaceState("ws-cached");
    explorerState.tree = root;
    explorerState.nodeIdToNode = createNodeIdToNodeDictionary(root);

    const wrapper = mountFileExplorer({
      props: {
        workspaceId: "ws-cached",
        active: true,
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

    expect(acquire).toHaveBeenCalledTimes(1);
    expect(addDocumentListener).toHaveBeenCalledWith("dragover", expect.any(Function));
    expect(addDocumentListener).toHaveBeenCalledWith("dragend", expect.any(Function));
    expect(addDocumentListener).not.toHaveBeenCalledWith("closeAllFileContextMenus", expect.any(Function));

    await wrapper.setProps({ active: false });
    await flushUi();

    expect(release).toHaveBeenCalledTimes(1);
    expect(abortSearch).toHaveBeenCalledWith("ws-cached");
    expect(removeDocumentListener).toHaveBeenCalledWith("dragover", expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith("dragend", expect.any(Function));
    expect(removeDocumentListener).not.toHaveBeenCalledWith("closeAllFileContextMenus", expect.any(Function));

    await wrapper.setProps({ active: true });
    await flushUi();

    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it("keeps a top-level row context menu visible after the legacy close event would have fired", async () => {
    setupWorkspace("ws-context-top");
    const wrapper = mountExplorerWithRealContextMenu("ws-context-top");
    await flushUi();

    await findFileItemByPath(wrapper, "tickets").trigger("contextmenu", {
      clientX: 22,
      clientY: 44,
    });
    await flushUi();
    document.dispatchEvent(new Event("closeAllFileContextMenus"));
    await flushUi();

    expect(getMenuLabels()).toEqual(["Add File", "Add Folder", "Rename", "Delete"]);
  });

  it("opens a nested row context menu through the injected owner callback", async () => {
    setupWorkspace("ws-context-nested");
    const wrapper = mountExplorerWithRealContextMenu("ws-context-nested");
    await flushUi();

    await findFileItemByPath(wrapper, "tickets/in-progress/ticket-123/attachments").trigger("contextmenu", {
      clientX: 30,
      clientY: 52,
    });
    await flushUi();

    expect(getMenuLabels()).toContain("Add Folder");
    expect(getMenuLabels()).toContain("Delete");
  });

  it("creates a folder under a folder row target", async () => {
    setupWorkspace("ws-create-folder");
    const wrapper = mountExplorerWithRealContextMenu("ws-create-folder");
    await flushUi();
    mockCreateMutation("ticket-123", "tickets/in-progress/ticket-123/new-folder", false);

    await findFileItemByPath(wrapper, "tickets/in-progress/ticket-123").trigger("contextmenu", {
      clientX: 12,
      clientY: 18,
    });
    await flushUi();
    await clickMenuItem("Add Folder");
    await setDialogInputValue("new-folder");
    await clickDialogButton("Create");

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        workspaceId: "ws-create-folder",
        path: "tickets/in-progress/ticket-123/new-folder",
        isFile: false,
      },
    }));
  });

  it("creates a folder beside a file row target", async () => {
    setupWorkspace("ws-create-sibling");
    const wrapper = mountExplorerWithRealContextMenu("ws-create-sibling");
    await flushUi();
    mockCreateMutation("ticket-123", "tickets/in-progress/ticket-123/sibling-folder", false);

    await findFileItemByPath(wrapper, "tickets/in-progress/ticket-123/spec.md").trigger("contextmenu", {
      clientX: 12,
      clientY: 18,
    });
    await flushUi();
    await clickMenuItem("Add Folder");
    await setDialogInputValue("sibling-folder");
    await clickDialogButton("Create");

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        workspaceId: "ws-create-sibling",
        path: "tickets/in-progress/ticket-123/sibling-folder",
        isFile: false,
      },
    }));
  });

  it("opens a root context menu with root create actions only", async () => {
    setupWorkspace("ws-root-create");
    const wrapper = mountExplorerWithRealContextMenu("ws-root-create");
    await flushUi();
    mockCreateMutation("root", "root-folder", false);

    await wrapper.find(".file-explorer-content").trigger("contextmenu", {
      clientX: 4,
      clientY: 8,
    });
    await flushUi();

    expect(getMenuLabels()).toEqual(["Add File", "Add Folder"]);

    await clickMenuItem("Add Folder");
    await setDialogInputValue("root-folder");
    await clickDialogButton("Create");

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        workspaceId: "ws-root-create",
        path: "root-folder",
        isFile: false,
      },
    }));
  });

  it("requires delete confirmation before deleting a row target", async () => {
    setupWorkspace("ws-delete");
    const wrapper = mountExplorerWithRealContextMenu("ws-delete");
    await flushUi();
    mockDeleteMutation("spec-file", "ticket-123");

    await findFileItemByPath(wrapper, "tickets/in-progress/ticket-123/spec.md").trigger("contextmenu", {
      clientX: 14,
      clientY: 28,
    });
    await flushUi();
    await clickMenuItem("Delete");

    expect(document.body.textContent).toContain("spec.md");
    expect(mutateMock).not.toHaveBeenCalled();

    await clickDialogButton("Delete");

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        workspaceId: "ws-delete",
        path: "tickets/in-progress/ticket-123/spec.md",
      },
    }));
  });

  it("closes context actions and ignores context menu requests while inactive", async () => {
    setupWorkspace("ws-inactive");
    const wrapper = mountExplorerWithRealContextMenu("ws-inactive");
    await flushUi();

    await findFileItemByPath(wrapper, "tickets").trigger("contextmenu", {
      clientX: 22,
      clientY: 44,
    });
    await flushUi();
    expect(getMenuLabels()).toContain("Add Folder");

    await wrapper.setProps({ active: false });
    await flushUi();
    expect(getMenuLabels()).toEqual([]);

    await wrapper.find(".file-explorer-content").trigger("contextmenu", {
      clientX: 1,
      clientY: 1,
    });
    await flushUi();

    expect(getMenuLabels()).toEqual([]);
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
