import { nextTick } from "vue";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";

const { storeHarness, terminalUnmounted } = vi.hoisted(() => ({
  storeHarness: {
    workspace: null as any,
    windowNodeContext: null as any,
  },
  terminalUnmounted: vi.fn(),
}));

vi.mock("~/stores/workspace", async () => {
  const { reactive } = await import("vue");
  const workspace = reactive({
    activeWorkspaceMetadata: null,
  });
  storeHarness.workspace = workspace;
  return {
    useWorkspaceStore: () => workspace,
  };
});

vi.mock("~/stores/windowNodeContextStore", async () => {
  const { reactive } = await import("vue");
  const windowNodeContext = reactive({
    nodeId: "node-a",
    bindingRevision: 0,
    boundEndpoints: {
      terminalWs: "ws://node-a.example/ws/terminal",
    },
  });
  storeHarness.windowNodeContext = windowNodeContext;
  return {
    useWindowNodeContextStore: () => windowNodeContext,
  };
});

import TerminalPanel from "../TerminalPanel.vue";

const terminalStub = {
  name: "Terminal",
  props: ["target", "active"],
  template:
    '<div class="terminal-child" :data-root-path="target && target.rootPath ? target.rootPath : \'server-home\'" :data-active="active ? \'true\' : \'false\'" />',
  unmounted() {
    terminalUnmounted((this as any).$props.target);
  },
};

const workspaceMetadata = (params: {
  workspaceId: string;
  workspaceRootPath: string;
  displayName?: string;
}) => ({
  workspaceId: params.workspaceId,
  workspaceRootPath: params.workspaceRootPath,
  displayName: params.displayName || params.workspaceId,
  kind: "filesystem",
});

const setActiveWorkspace = (
  workspaceRootPath: string | null,
  workspaceId = "workspace-1",
) => {
  storeHarness.workspace.activeWorkspaceMetadata = workspaceRootPath
    ? workspaceMetadata({ workspaceId, workspaceRootPath })
    : null;
};

const setNodeScope = (params: {
  nodeId?: string;
  terminalWs?: string;
  bumpRevision?: boolean;
}) => {
  if (params.nodeId !== undefined) {
    storeHarness.windowNodeContext.nodeId = params.nodeId;
  }
  if (params.terminalWs !== undefined) {
    storeHarness.windowNodeContext.boundEndpoints = {
      terminalWs: params.terminalWs,
    };
  }
  if (params.bumpRevision) {
    storeHarness.windowNodeContext.bindingRevision += 1;
  }
};

const mountedWrappers: VueWrapper[] = [];

const mountSubject = (props: { active?: boolean } = { active: true }) => {
  const wrapper = mount(TerminalPanel, {
    props,
    global: {
      stubs: {
        Terminal: terminalStub,
      },
    },
  });
  mountedWrappers.push(wrapper);
  return wrapper;
};

const terminalChildren = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAllComponents({ name: "Terminal" });

const activeTerminalChildren = (wrapper: ReturnType<typeof mount>) =>
  terminalChildren(wrapper).filter((terminal) => terminal.props("active"));

describe("TerminalPanel", () => {
  afterEach(() => {
    for (const wrapper of mountedWrappers.splice(0)) {
      wrapper.unmount();
    }
  });

  beforeEach(() => {
    terminalUnmounted.mockClear();
    setActiveWorkspace(null);
    setNodeScope({
      nodeId: "node-a",
      terminalWs: "ws://node-a.example/ws/terminal",
    });
    storeHarness.windowNodeContext.bindingRevision = 0;
  });

  it("creates the current terminal lazily only when the panel is active", async () => {
    setActiveWorkspace("/tmp/project-a", "workspace-a");
    const wrapper = mountSubject({ active: false });

    await nextTick();
    expect(terminalChildren(wrapper)).toHaveLength(0);

    setActiveWorkspace("/tmp/project-b", "workspace-b");
    await nextTick();

    expect(terminalChildren(wrapper)).toHaveLength(0);

    await wrapper.setProps({ active: true });
    await nextTick();

    const children = terminalChildren(wrapper);
    expect(children).toHaveLength(1);
    expect(children[0].props("target")).toMatchObject({
      rootPath: "/tmp/project-b",
      workspaceId: "workspace-b",
    });
  });

  it("reuses the same normalized root-path entry and preserves separate path entries", async () => {
    setActiveWorkspace("/tmp/project-a/", "run-workspace-a");
    const wrapper = mountSubject({ active: true });

    await nextTick();
    let children = terminalChildren(wrapper);
    expect(children).toHaveLength(1);
    const firstKey = wrapper.get('[data-test="terminal-panel-entry"]').attributes("data-terminal-key");

    setActiveWorkspace("/tmp/project-a", "different-run-same-path");
    await nextTick();

    children = terminalChildren(wrapper);
    expect(children).toHaveLength(1);
    expect(wrapper.get('[data-test="terminal-panel-entry"]').attributes("data-terminal-key")).toBe(firstKey);
    expect(children[0].props("target")).toMatchObject({
      rootPath: "/tmp/project-a",
      workspaceId: "run-workspace-a",
    });

    setActiveWorkspace("/tmp/project-b", "workspace-b");
    await nextTick();

    children = terminalChildren(wrapper);
    expect(children).toHaveLength(2);
    expect(activeTerminalChildren(wrapper)).toHaveLength(1);
    expect(activeTerminalChildren(wrapper)[0].props("target")).toMatchObject({
      rootPath: "/tmp/project-b",
    });

    setActiveWorkspace("/tmp/project-a", "third-run-same-path");
    await nextTick();

    children = terminalChildren(wrapper);
    expect(children).toHaveLength(2);
    expect(activeTerminalChildren(wrapper)[0].props("target")).toMatchObject({
      rootPath: "/tmp/project-a",
      workspaceId: "run-workspace-a",
    });
  });

  it("keeps server-home as an explicit null target and prevents target drift", async () => {
    setActiveWorkspace(null);
    const wrapper = mountSubject({ active: true });

    await nextTick();
    let children = terminalChildren(wrapper);
    expect(children).toHaveLength(1);
    expect(children[0].props("target")).toBeNull();
    const serverHomeKey = wrapper.get('[data-test="terminal-panel-entry"]').attributes("data-terminal-key");

    setActiveWorkspace("/tmp/project-a", "workspace-a");
    await nextTick();

    children = terminalChildren(wrapper);
    expect(children).toHaveLength(2);
    expect(children.some((child) => child.props("target") === null)).toBe(true);
    expect(activeTerminalChildren(wrapper)[0].props("target")).toMatchObject({
      rootPath: "/tmp/project-a",
    });

    setActiveWorkspace(null);
    await nextTick();

    children = terminalChildren(wrapper);
    expect(children).toHaveLength(2);
    expect(activeTerminalChildren(wrapper)[0].props("target")).toBeNull();
    const activeEntry = wrapper
      .findAll('[data-test="terminal-panel-entry"]')
      .find((entry) => !entry.attributes("style")?.includes("display: none"));
    expect(activeEntry?.attributes("data-terminal-key")).toBe(serverHomeKey);
  });

  it("clears cached terminals on node rebinding and recreates lazily", async () => {
    setActiveWorkspace("/tmp/project-a", "workspace-a");
    const wrapper = mountSubject({ active: true });

    await nextTick();
    expect(terminalChildren(wrapper)).toHaveLength(1);

    await wrapper.setProps({ active: false });
    await nextTick();
    terminalUnmounted.mockClear();

    setNodeScope({
      terminalWs: "ws://node-a.example/ws/terminal/",
      bumpRevision: true,
    });
    await nextTick();
    await nextTick();

    expect(terminalUnmounted).toHaveBeenCalledTimes(1);
    expect(terminalChildren(wrapper)).toHaveLength(0);

    await wrapper.setProps({ active: true });
    await nextTick();

    expect(terminalChildren(wrapper)).toHaveLength(1);
    expect(terminalChildren(wrapper)[0].props("target")).toMatchObject({
      rootPath: "/tmp/project-a",
    });
  });

  it("separates cache keys by node endpoint scope after rebinding", async () => {
    setActiveWorkspace("/tmp/project-a", "workspace-a");
    const wrapper = mountSubject({ active: true });

    await nextTick();
    const firstKey = wrapper.get('[data-test="terminal-panel-entry"]').attributes("data-terminal-key");
    terminalUnmounted.mockClear();

    setNodeScope({
      nodeId: "node-b",
      terminalWs: "ws://node-b.example/ws/terminal",
    });
    await nextTick();
    await nextTick();

    expect(terminalUnmounted).toHaveBeenCalledTimes(1);
    expect(terminalChildren(wrapper)).toHaveLength(1);
    const secondKey = wrapper.get('[data-test="terminal-panel-entry"]').attributes("data-terminal-key");
    expect(secondKey).not.toBe(firstKey);
    expect(secondKey).toContain("node-b");
    expect(secondKey).toContain("node-b.example");
  });
});
