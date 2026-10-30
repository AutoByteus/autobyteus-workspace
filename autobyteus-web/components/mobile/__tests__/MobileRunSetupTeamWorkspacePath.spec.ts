import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import MobileRunSetup from "../MobileRunSetup.vue";
import MobileLaunchWorkspacePicker from "../MobileLaunchWorkspacePicker.vue";
import { useAgentDefinitionStore } from "~/stores/agentDefinitionStore";
import { useAgentTeamDefinitionStore } from "~/stores/agentTeamDefinitionStore";
import { useTeamRunConfigStore } from "~/stores/teamRunConfigStore";
import { useWorkspaceStore } from "~/stores/workspace";
import { DEFAULT_AGENT_RUNTIME_KIND } from "~/types/agent/AgentRunConfig";
import type { MobileWorkContext } from "~/types/mobileWork";

// BEH-032 (a) of autobyteus-294: on the phone, loading a workspace by its server path while a new Team run is being
// set up makes it the Team setup's workspace, and a failed load shows its message in the workspace picker; the
// load never throws (the team run config store has no workspace-loading setters since ebea1289bc).
vi.mock("~/services/runSettings/startModelCatalog", () => ({
  startModelCatalog: () => ({
    ensureAvailability: async () => undefined,
    isRuntimeEnabled: () => true,
    ensureCatalog: async () => undefined,
    models: () => ["test-model"],
  }),
}));

const RUNTIME = DEFAULT_AGENT_RUNTIME_KIND;
const context: MobileWorkContext = { kind: "workspace", workspaceId: "workspace-1", title: "Project Workspace", rootPath: "/Users/normy/project" };
let pinia: Pinia;

const workspace = (workspaceId: string, rootPath: string) => ({
  workspaceId, name: workspaceId, displayName: workspaceId, absolutePath: rootPath, workspaceRootPath: rootPath,
  workspaceConfig: { root_path: rootPath }, kind: "filesystem", isTemp: false,
});

const mountTeamSetup = async () => {
  useAgentDefinitionStore().agentDefinitions = [{
    id: "lead-agent", name: "lead-agent", description: "lead", instructions: "", toolNames: [], inputProcessorNames: [],
    llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [], skillNames: [], skillScope: "CONFIGURED",
  }] as any;
  useAgentTeamDefinitionStore().agentTeamDefinitions = [{
    id: "team-1", name: "Software Team", description: "Software Team", instructions: "", coordinatorMemberName: "lead",
    nodes: [{ memberName: "lead", ref: "lead-agent", refType: "AGENT", refScope: "SHARED" }],
    defaultLaunchConfig: { runtimeKind: RUNTIME, llmModelIdentifier: "test-model", llmConfig: null },
  }] as any;
  useWorkspaceStore().workspaces = { "workspace-1": workspace("workspace-1", "/Users/normy/project") } as any;
  useWorkspaceStore().workspacesFetched = true;

  const wrapper = mount(MobileRunSetup, {
    props: { context },
    global: { plugins: [pinia], stubs: { RuntimeModelConfigFields: { template: "<div />" } } },
  });
  await nextTick();
  await wrapper.get('[data-testid="mobile-run-setup-team-mode"]').trigger("click");
  await nextTick();
  await wrapper.get('[data-testid="mobile-run-team-select-toggle"]').trigger("click");
  await nextTick();
  const option = wrapper.findAll('[data-testid="mobile-run-team-select-option"]').find((candidate) => candidate.text().includes("Software Team"));
  await option!.trigger("click");
  await flushPromises();
  expect(useTeamRunConfigStore().config?.teamDefinitionId).toBe("team-1");
  return wrapper;
};

const loadPath = async (wrapper: Awaited<ReturnType<typeof mountTeamSetup>>, path: string) => {
  wrapper.findComponent(MobileLaunchWorkspacePicker).vm.$emit("load-path", path);
  await flushPromises();
};

describe("Mobile Team setup: load a workspace by path (BEH-032 a)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it("makes the loaded workspace the Team setup's workspace", async () => {
    const wrapper = await mountTeamSetup();
    const workspaceStore = useWorkspaceStore();
    vi.spyOn(workspaceStore, "createWorkspace").mockImplementation(async (config: { root_path: string }) => {
      workspaceStore.workspaces["workspace-loaded"] = workspace("workspace-loaded", config.root_path) as any;
      return "workspace-loaded";
    });

    await loadPath(wrapper, "/srv/autobyteus/loaded");

    expect(useTeamRunConfigStore().config?.rootConfig.workspace).toMatchObject({
      workspaceId: "workspace-loaded",
      workspaceMetadata: expect.objectContaining({ workspaceId: "workspace-loaded", workspaceRootPath: "/srv/autobyteus/loaded" }),
    });
    expect(wrapper.find('[data-testid="mobile-run-workspace-error"]').exists()).toBe(false);
  });

  it("shows a failed load's message in the workspace picker", async () => {
    const wrapper = await mountTeamSetup();
    vi.spyOn(useWorkspaceStore(), "createWorkspace").mockRejectedValue(new Error("Path does not exist on the server."));

    await loadPath(wrapper, "/srv/autobyteus/missing");

    expect(wrapper.get('[data-testid="mobile-run-workspace-error"]').text()).toBe("Path does not exist on the server.");
  });
});
