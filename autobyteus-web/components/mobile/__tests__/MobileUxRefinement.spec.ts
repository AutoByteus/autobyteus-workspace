import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import MobileActivity from "../MobileActivity.vue";
import MobileChat from "../MobileChat.vue";
import MobileFiles from "../MobileFiles.vue";
import MobileHome from "../MobileHome.vue";
import MobileRuns from "../MobileRuns.vue";
import MobileRunSetup from "../MobileRunSetup.vue";
import { useAgentActivityStore } from "~/stores/agentActivityStore";
import type { CompactionActivity, ToolActivity } from "~/types/activity/RunActivity";
import { useAgentContextsStore } from "~/stores/agentContextsStore";
import { useAgentRunConfigStore } from "~/stores/agentRunConfigStore";
import { useAgentDefinitionStore } from "~/stores/agentDefinitionStore";
import { useAgentSelectionStore } from "~/stores/agentSelectionStore";
import { useAgentTeamContextsStore } from "~/stores/agentTeamContextsStore";
import { useAgentTeamDefinitionStore } from "~/stores/agentTeamDefinitionStore";
import { useFileExplorerStore } from "~/stores/fileExplorer";
import { createDefaultWorkspaceFileExplorerState } from "~/stores/fileExplorerState";
import { useMobileWorkStore } from "~/stores/mobileWorkStore";
import { useTeamRunConfigStore } from "~/stores/teamRunConfigStore";
import { useWorkspaceStore } from "~/stores/workspace";
import { AgentContext } from "~/types/agent/AgentContext";
import { AgentRunState } from "~/types/agent/AgentRunState";
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
} from "~/types/agent/AgentRunConfig";
import type { Conversation } from "~/types/conversation";
import type { MobileWorkContext } from "~/types/mobileWork";
import { createWorkspaceContextAttachment } from "~/utils/contextFiles/contextAttachmentModel";
import { TreeNode } from "~/utils/fileExplorer/TreeNode";
import { createNodeIdToNodeDictionary } from "~/utils/fileExplorer/fileUtils";

let pinia: Pinia;

const workspaceContext: MobileWorkContext = {
  kind: "workspace",
  workspaceId: "workspace-1",
  title: "Project Workspace",
  rootPath: "/Users/normy/project",
};

const agentRunContext: MobileWorkContext = {
  kind: "agent-run",
  runId: "run-1",
  agentDefinitionId: "agent-1",
  title: "Builder Agent",
  summary: "Existing run",
  workspaceRootPath: "/Users/normy/project",
  isActive: true,
  lastActivityAt: "2026-05-18T16:00:00.000Z",
  statusLabel: "Running",
};

function makeAgentRunConfig(): AgentRunConfig {
  return {
    agentDefinitionId: "agent-1",
    agentDefinitionName: "Builder Agent",
    llmModelIdentifier: "test-model",
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: "workspace-1",
    workspaceMetadata: null,
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    isLocked: false,
  };
}

function seedAgentRun(): AgentContext {
  const conversation: Conversation = {
    id: "run-1",
    messages: [],
    createdAt: "2026-05-18T16:00:00.000Z",
    updatedAt: "2026-05-18T16:00:00.000Z",
    agentDefinitionId: "agent-1",
  };
  const run = new AgentContext(
    makeAgentRunConfig(),
    new AgentRunState("run-1", conversation),
  );
  useAgentContextsStore().runs.set("run-1", run);
  useAgentSelectionStore().selectRunWithoutShellNavigation("run-1", "agent");
  return run;
}

function seedCatalogAndWorkspace(): void {
  useAgentDefinitionStore().agentDefinitions = [
    {
      id: "agent-1",
      name: "Builder Agent",
      description: "Builds software",
      instructions: "",
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
      defaultLaunchConfig: {
        runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
        llmModelIdentifier: "test-model",
        llmConfig: null,
      },
    },
    {
      id: "agent-2",
      name: "Reviewer Agent",
      description: "Reviews software",
      instructions: "",
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
      defaultLaunchConfig: {
        runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
        llmModelIdentifier: "test-model",
        llmConfig: null,
      },
    },
    {
      id: "agent-3",
      name: "Unconfigured Agent",
      description: "Needs a model choice",
      instructions: "",
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
    },
  ];
  useAgentTeamDefinitionStore().agentTeamDefinitions = [
    {
      id: "team-1",
      name: "Software Team",
      description: "Coordinates implementation",
      instructions: "",
      coordinatorMemberName: "lead",
      nodes: [
        {
          memberName: "lead",
          ref: "agent-1",
          refType: "AGENT",
          refScope: "SHARED",
        },
        {
          memberName: "reviewer",
          ref: "agent-2",
          refType: "AGENT",
          refScope: "SHARED",
        },
      ],
      defaultLaunchConfig: {
        runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
        llmModelIdentifier: "test-model",
        llmConfig: null,
      },
    },
  ];
  useWorkspaceStore().workspaces = {
    "workspace-1": {
      workspaceId: "workspace-1",
      name: "Project Workspace",
      displayName: "Project Workspace",
      absolutePath: "/Users/normy/project",
      workspaceRootPath: "/Users/normy/project",
      workspaceConfig: { root_path: "/Users/normy/project" },
      kind: "filesystem",
      isTemp: false,
    },
  };
  useWorkspaceStore().workspacesFetched = true;
}

function createProjectFileTree(): TreeNode {
  return new TreeNode(
    "project",
    "/Users/normy/project",
    false,
    [
      new TreeNode(
        "README.md",
        "/Users/normy/project/README.md",
        true,
        [],
        "readme",
        true,
      ),
      new TreeNode(
        "src",
        "/Users/normy/project/src",
        false,
        [
          new TreeNode(
            "deep.ts",
            "/Users/normy/project/src/deep.ts",
            true,
            [],
            "deep",
            true,
          ),
          new TreeNode(
            "image.png",
            "/Users/normy/project/src/image.png",
            true,
            [],
            "image",
            true,
          ),
        ],
        "src",
        true,
      ),
    ],
    "root",
    true,
  );
}

function seedProjectFileExplorerState(workspaceId = "workspace-1"): void {
  const state = createDefaultWorkspaceFileExplorerState(workspaceId);
  state.tree = createProjectFileTree();
  state.nodeIdToNode = createNodeIdToNodeDictionary(state.tree);
  state.openFiles = [
    {
      path: "/Users/normy/project/recent.ts",
      type: "Text",
      mode: "preview",
      content: "",
      url: null,
      relativeResourceContext: null,
      isLoading: false,
      error: null,
    },
  ];
  useFileExplorerStore().fileExplorerStateByWorkspace.set(workspaceId, state);
}

function mountWithPinia(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [pinia, ...(options.global?.plugins ?? [])],
      stubs: {
        RuntimeModelConfigFields: {
          template: '<div data-testid="runtime-model-config-fields" />',
        },
        ...(options.global?.stubs ?? {}),
      },
    },
  });
}

describe("mobile Round 4 UX refinements", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    seedCatalogAndWorkspace();
  });

  it("shows mixed-success reachability instead of claiming the desktop is unreachable", () => {
    const wrapper = mountWithPinia(MobileHome, {
      props: {
        serverBaseUrl: "http://desktop-private.local:29695",
        status: null,
        isRefreshing: false,
        diagnostic: {
          kind: "network_unreachable",
          title: "Cannot reach AutoByteus desktop",
          message: "Your phone cannot reach the desktop node.",
          recoveryAction: "Check the network.",
        },
        authorizedApiReachable: true,
        currentContext: null,
        recentItems: [],
      },
    });

    expect(
      wrapper.get('[data-testid="mobile-home-status-card"]').text(),
    ).toContain("Node reachable");
    expect(
      wrapper.get('[data-testid="mobile-home-status-card"]').text(),
    ).toContain("Phone Access status unavailable");
    expect(
      wrapper.get('[data-testid="mobile-home-status-card"]').text(),
    ).not.toContain("Cannot reach AutoByteus desktop");
    expect(
      wrapper.get('[data-testid="mobile-home-status-card"]').text(),
    ).not.toContain("Offline");
    expect(wrapper.text()).not.toContain("Mobile Home");
    expect(wrapper.text()).not.toContain("Current node");
    expect(wrapper.text()).not.toContain("Current work context");
    expect(wrapper.text()).not.toContain("Primary next action");
    expect(
      wrapper.find('[data-testid="mobile-home-primary-action"]').exists(),
    ).toBe(false);
  });

  it("uses concise configure-only mobile setup without first-message entry or launch summary", async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    expect(wrapper.text()).not.toContain("Start new work");
    expect(wrapper.text()).not.toContain(
      "Choose an agent, workspace, and runtime/model. You’ll type the first message in Chat.",
    );
    expect(wrapper.text()).not.toContain("Pick the runtime and model");
    expect(wrapper.text()).not.toContain("focused member");
    expect(wrapper.find('[data-testid="mobile-run-prompt"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="mobile-launch-summary"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.get('[data-testid="mobile-run-agent-select"]').text(),
    ).toContain("Choose an agent intentionally");
    expect(
      wrapper.get('[data-testid="mobile-run-workspace-select"]').text(),
    ).toContain("Project Workspace");
    expect(
      wrapper.get('[data-testid="mobile-run-setup-readiness"]').text(),
    ).toContain("Choose an agent before creating the run.");
    expect(
      wrapper
        .find('[data-testid="mobile-runtime-model-blocking-issue"]')
        .exists(),
    ).toBe(false);
    expect(
      wrapper.get('[data-testid="mobile-run-launch"]').attributes("disabled"),
    ).toBeDefined();

    await wrapper
      .get('[data-testid="mobile-run-agent-select-toggle"]')
      .trigger("click");
    await nextTick();
    await wrapper
      .findAll('[data-testid="mobile-run-agent-select-option"]')[1]
      .trigger("click");
    await nextTick();

    expect(
      wrapper.get('[data-testid="mobile-run-agent-select"]').text(),
    ).toContain("Reviewer Agent");
    expect(
      wrapper.get('[data-testid="mobile-run-setup-readiness"]').text(),
    ).toContain("Ready to create the run. Chat opens next.");
    expect(
      wrapper.get('[data-testid="mobile-run-launch"]').attributes("disabled"),
    ).toBeUndefined();
  });

  it("removes team launch first-message target from setup while keeping searchable team selection", async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper
      .get('[data-testid="mobile-run-setup-team-mode"]')
      .trigger("click");
    await nextTick();
    expect(wrapper.text()).not.toContain(
      "Choose a team, workspace, and runtime/model. You’ll select the message target in Chat.",
    );
    expect(wrapper.find('[data-testid="mobile-run-prompt"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.find('[data-testid="mobile-team-launch-focus-select"]').exists(),
    ).toBe(false);
    expect(wrapper.text()).not.toContain("First message target");

    await wrapper
      .get('[data-testid="mobile-run-team-select-toggle"]')
      .trigger("click");
    await nextTick();
    expect(
      wrapper.find('select[data-testid="mobile-run-team-select"]').exists(),
    ).toBe(false);

    await wrapper
      .get('[data-testid="mobile-run-team-select-option"]')
      .trigger("click");
    await nextTick();

    expect(
      wrapper.get('[data-testid="mobile-run-team-select"]').text(),
    ).toContain("Software Team");
    expect(
      wrapper.get('[data-testid="mobile-run-setup-readiness"]').text(),
    ).not.toContain("First message");
    expect(wrapper.get('[data-testid="mobile-run-launch"]').text()).toContain(
      "Create run",
    );
  });

  it("keeps mobile launch disabled instead of silently choosing a model for unconfigured agents", async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper
      .get('[data-testid="mobile-run-agent-select-toggle"]')
      .trigger("click");
    await nextTick();
    await wrapper
      .findAll('[data-testid="mobile-run-agent-select-option"]')[2]
      .trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-prompt"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="mobile-launch-summary"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.get('[data-testid="mobile-run-agent-select"]').text(),
    ).toContain("Unconfigured Agent");
    expect(
      wrapper.get('[data-testid="mobile-run-setup-readiness"]').text(),
    ).toContain("Choose a model before creating the run.");
    expect(
      wrapper.get('[data-testid="mobile-run-launch"]').attributes("disabled"),
    ).toBeDefined();
  });

  it("consumes a single-use setup intent so selected agents open visible setup preselected", async () => {
    const mobileWorkStore = useMobileWorkStore();
    const agentContext: MobileWorkContext = {
      kind: "agent-definition",
      agentDefinitionId: "agent-1",
      title: "Builder Agent",
      description: "Builds software",
    };
    mobileWorkStore.selectContext(agentContext, "runs");
    mobileWorkStore.requestRunSetup({
      kind: "agent",
      agentDefinitionId: "agent-1",
    });

    const wrapper = mountWithPinia(MobileRuns, {
      props: { context: agentContext },
      global: {
        stubs: {
          RuntimeModelConfigFields: {
            template: '<div data-testid="runtime-model-config-fields" />',
          },
        },
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-setup"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.get('[data-testid="mobile-run-agent-select"]').text(),
    ).toContain("Builder Agent");
    expect(mobileWorkStore.runSetupIntent).toBeNull();
  });

  it("binds agent Auto approve tools to the launch config and created context", async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper
      .get('[data-testid="mobile-run-agent-select-toggle"]')
      .trigger("click");
    await nextTick();
    await wrapper
      .get('[data-testid="mobile-run-agent-select-option"]')
      .trigger("click");
    await nextTick();

    const switchButton = wrapper.get(
      '[data-testid="mobile-run-auto-approve-tools-switch"]',
    );
    expect(wrapper.get('[data-testid="mobile-run-auto-approve-tools"]').text()).toContain(
      "Auto approve tools",
    );
    expect(switchButton.attributes("role")).toBe("switch");
    expect(switchButton.attributes("aria-checked")).toBe("false");
    expect(useAgentRunConfigStore().config?.autoExecuteTools).toBe(false);

    await switchButton.trigger("click");
    await nextTick();

    expect(useAgentRunConfigStore().config?.autoExecuteTools).toBe(true);
    expect(
      wrapper
        .get('[data-testid="mobile-run-auto-approve-tools-switch"]')
        .attributes("aria-checked"),
    ).toBe("true");

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(useAgentContextsStore().activeRun?.config.autoExecuteTools).toBe(true);
  });

  it("binds team Auto approve tools to the selected immutable launch draft", async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper.get('[data-testid="mobile-run-setup-team-mode"]').trigger("click");
    await nextTick();
    await wrapper
      .get('[data-testid="mobile-run-team-select-toggle"]')
      .trigger("click");
    await nextTick();
    await wrapper
      .get('[data-testid="mobile-run-team-select-option"]')
      .trigger("click");
    await nextTick();
    useTeamRunConfigStore().setRuntimeModelCatalog(DEFAULT_AGENT_RUNTIME_KIND, [
      "test-model",
    ]);
    await nextTick();

    const switchButton = wrapper.get(
      '[data-testid="mobile-run-auto-approve-tools-switch"]',
    );
    expect(switchButton.attributes("aria-checked")).toBe("false");
    expect(useTeamRunConfigStore().config?.rootConfig.autoExecuteTools).toBe(false);

    await switchButton.trigger("click");
    await nextTick();

    expect(useTeamRunConfigStore().config?.rootConfig.autoExecuteTools).toBe(true);
    const selectedDraft = useTeamRunConfigStore().selectedDraft;
    expect(selectedDraft).toBeTruthy();
    expect(selectedDraft?.config.rootConfig.autoExecuteTools).toBe(true);
    expect(Object.isFrozen(selectedDraft)).toBe(true);
    expect(Object.isFrozen(selectedDraft?.config)).toBe(true);
  });

  it("lists launch workspaces from the workspace store and loads an unlisted server path into the active config", async () => {
    const workspaceStore = useWorkspaceStore();
    workspaceStore.workspaces["workspace-no-run"] = {
      workspaceId: "workspace-no-run",
      name: "Dormant Workspace",
      displayName: "Dormant Workspace",
      absolutePath: "/Users/normy/dormant",
      workspaceRootPath: "/Users/normy/dormant",
      workspaceConfig: { root_path: "/Users/normy/dormant" },
      kind: "filesystem",
      isTemp: false,
    } as any;
    const createWorkspaceSpy = vi
      .spyOn(workspaceStore, "createWorkspace")
      .mockImplementation(async (config: { root_path: string }) => {
        workspaceStore.workspaces["workspace-loaded"] = {
          workspaceId: "workspace-loaded",
          name: "Loaded Workspace",
          displayName: "Loaded Workspace",
          absolutePath: config.root_path,
          workspaceRootPath: config.root_path,
          workspaceConfig: { root_path: config.root_path },
          kind: "filesystem",
          isTemp: false,
        } as any;
        return "workspace-loaded";
      });

    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper
      .get('[data-testid="mobile-run-workspace-select-toggle"]')
      .trigger("click");
    await nextTick();
    expect(
      wrapper.get('[data-testid="mobile-run-workspace-select-sheet"]').text(),
    ).toContain("Dormant Workspace");

    await wrapper
      .get('[data-testid="mobile-run-agent-select-toggle"]')
      .trigger("click");
    await nextTick();
    await wrapper
      .get('[data-testid="mobile-run-agent-select-option"]')
      .trigger("click");
    await nextTick();

    await wrapper
      .get('[data-testid="mobile-run-workspace-path-input"]')
      .setValue("/srv/autobyteus/loaded");
    await wrapper.get('[data-testid="mobile-run-workspace-load"]').trigger("click");
    await flushPromises();

    expect(createWorkspaceSpy).toHaveBeenCalledWith({
      root_path: "/srv/autobyteus/loaded",
    });
    expect(useAgentRunConfigStore().config?.workspaceId).toBe("workspace-loaded");
    expect(wrapper.get('[data-testid="mobile-run-workspace-select"]').text()).toContain(
      "Loaded Workspace",
    );
  });

  it("keeps context visibility adjacent to the mobile composer send decision", () => {
    const run = seedAgentRun();
    run.contextFilePaths.push(
      createWorkspaceContextAttachment("/Users/normy/project/active.md"),
    );

    const wrapper = mountWithPinia(MobileChat, {
      props: { context: agentRunContext },
      global: {
        stubs: {
          AgentEventMonitor: {
            template:
              '<div data-testid="agent-event-monitor"><slot name="composerContext" /><button title="Send message">Send</button></div>',
          },
          AgentTeamEventMonitor: {
            template: '<div data-testid="team-event-monitor" />',
          },
        },
      },
    });

    const monitorHtml = wrapper
      .get('[data-testid="agent-event-monitor"]')
      .html();
    expect(monitorHtml).toContain("mobile-composer-context-tray");
    expect(monitorHtml.indexOf("mobile-composer-context-tray")).toBeLessThan(
      monitorHtml.indexOf("Send message"),
    );
  });

  it("keeps mobile Files browse-first while preserving secondary filters and deliberate deep search", async () => {
    useMobileWorkStore().addDraftContextAttachment(
      createWorkspaceContextAttachment("/Users/normy/project/attached.md"),
    );
    seedProjectFileExplorerState("workspace-1");
    vi.spyOn(
      useWorkspaceStore(),
      "acquireFileExplorerLiveSession",
    ).mockReturnValue(vi.fn());
    vi.spyOn(useFileExplorerStore(), "fetchFolderChildren").mockResolvedValue();

    const wrapper = mountWithPinia(MobileFiles, {
      props: { context: workspaceContext },
    });
    await flushPromises();
    await nextTick();

    expect(
      wrapper.find('[data-testid="mobile-files-sticky-context"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="mobile-files-primary-controls"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="mobile-files-advanced-filters"]').exists(),
    ).toBe(false);
    expect(wrapper.text()).not.toContain("Files");
    expect(wrapper.text()).not.toContain("Current folder");
    expect(wrapper.text()).not.toContain("Workspace-wide search");
    expect(wrapper.text()).not.toContain("Markdown/code");

    await wrapper
      .get('[data-testid="mobile-files-filters-toggle"]')
      .trigger("click");
    await nextTick();

    expect(
      wrapper.find('[data-testid="mobile-files-filter-recent"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="mobile-files-filter-attached"]').exists(),
    ).toBe(true);
    expect(
      wrapper
        .find('[data-testid="mobile-files-filter-markdown-code"]')
        .exists(),
    ).toBe(true);
    expect(wrapper.text()).not.toContain("deep.ts");

    await wrapper
      .get('[data-testid="mobile-files-deep-search"]')
      .trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("deep.ts");

    await wrapper
      .get('[data-testid="mobile-files-filter-attached"]')
      .trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("attached.md");
  });

  it("renders Activity as a compact digest without secondary issue filters or redundant headers", async () => {
    seedAgentRun();
    const activity: ToolActivity = {
      kind: "tool",
      activityId: "tool-1",
      invocationId: "tool-1",
      toolName: "run_terminal_command",
      type: "terminal_command",
      status: "error",
      contextText: "npm test -- --very-long-command-that-should-be-compact",
      arguments: {},
      logs: ["line one", "line two", "line three"],
      result: null,
      error: "ANTHROPIC_API_KEY environment variable is not set",
      timestamp: new Date("2026-05-18T16:05:00.000Z"),
    };
    useAgentActivityStore().addToolActivity("run-1", activity);

    const wrapper = mountWithPinia(MobileActivity, {
      props: { context: agentRunContext },
    });

    expect(
      wrapper.find('[data-testid="mobile-activity-digest"]').exists(),
    ).toBe(true);
    expect(wrapper.text()).not.toContain("Task and team updates");
    expect(wrapper.text()).not.toContain(
      "Right-panel information becomes cards and sheets on phone.",
    );
    expect(wrapper.text()).not.toContain(
      "Interactive terminal, browser, and desktop tool panes are not supported",
    );
    expect(
      wrapper.find('[data-testid="mobile-activity-filter-all"]').exists(),
    ).toBe(false);
    expect(
      wrapper.get('[data-testid="mobile-activity-filters"]').text(),
    ).not.toContain("All");
    expect(
      wrapper.find('[data-testid="mobile-activity-more-filters"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="mobile-activity-advanced-filters"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="mobile-activity-filter-errors"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="mobile-activity-filter-approvals"]').exists(),
    ).toBe(false);
    expect(wrapper.text()).not.toContain("Issue filters");
    expect(wrapper.text()).not.toContain("Approvals");
    expect(wrapper.text()).not.toContain(
      "ANTHROPIC_API_KEY environment variable is not set",
    );

    await wrapper
      .get('[data-testid="mobile-activity-filter-activity"]')
      .trigger("click");
    await nextTick();
    expect(
      wrapper.find('[data-testid="mobile-run-activity-row"]').exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("1 activity item");
    expect(wrapper.text()).toContain(
      "ANTHROPIC_API_KEY environment variable is not set",
    );
  });

  it("renders compaction rows in the mobile run Activity list and count", async () => {
    seedAgentRun();
    const activity: CompactionActivity = {
      kind: "compaction",
      activityId: "compaction:task:mobile-1",
      phase: "failed",
      message: "Mobile compaction failed",
      turnId: "turn-mobile",
      provider: "codex",
      errorMessage: "Mobile backend compaction failed",
      timestamp: new Date("2026-05-18T16:05:00.000Z"),
      updatedAt: new Date("2026-05-18T16:06:00.000Z"),
    };
    useAgentActivityStore().upsertCompactionActivity("run-1", activity);

    const wrapper = mountWithPinia(MobileActivity, {
      props: { context: agentRunContext },
    });

    expect(
      wrapper.get('[data-testid="mobile-activity-filter-activity"]').text(),
    ).toContain("Activity · 1");

    await wrapper
      .get('[data-testid="mobile-activity-filter-activity"]')
      .trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-activity-row"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Run activity history");
    expect(wrapper.text()).toContain("Memory compaction");
    expect(wrapper.text()).toContain("Mobile compaction failed");
    expect(wrapper.text()).toContain("Mobile backend compaction failed");
    expect(wrapper.text()).not.toContain("Tool activity history");
  });

  it("opens mobile Files from run root-path metadata with an empty workspace store", async () => {
    const workspaceStore = useWorkspaceStore();
    workspaceStore.workspaces = {};
    workspaceStore.workspaceMetadataById = {};
    workspaceStore.workspaceMetadataIdsByRootPath = {};
    vi.spyOn(
      workspaceStore,
      "resolveWorkspaceMetadataByRootPath",
    ).mockResolvedValue({
      workspaceId: "agent-run-ws",
      workspaceRootPath: "/Users/normy/project",
      displayName: "project",
      kind: "filesystem",
    });
    vi.spyOn(workspaceStore, "ensureWorkspaceMetadata").mockImplementation(
      async (metadata: any) => {
        const workspace = {
          workspaceId: metadata.workspaceId,
          name: metadata.displayName,
          displayName: metadata.displayName,
          absolutePath: metadata.workspaceRootPath,
          workspaceRootPath: metadata.workspaceRootPath,
          workspaceConfig: { root_path: metadata.workspaceRootPath },
          kind: "filesystem",
          isTemp: false,
        };
        workspaceStore.workspaces[metadata.workspaceId] = workspace as any;
        return workspace as any;
      },
    );
    vi.spyOn(workspaceStore, "registerWorkspaceInfoMetadata").mockReturnValue({
      workspaceId: "agent-run-ws",
      workspaceRootPath: "/Users/normy/project",
      displayName: "project",
      kind: "filesystem",
    });
    const releaseLiveSession = vi.fn();
    vi.spyOn(workspaceStore, "acquireFileExplorerLiveSession").mockReturnValue(
      releaseLiveSession,
    );
    vi.spyOn(useFileExplorerStore(), "fetchFolderChildren").mockImplementation(
      async (workspaceId: string) => {
        seedProjectFileExplorerState(workspaceId);
      },
    );

    const wrapper = mountWithPinia(MobileFiles, {
      props: { context: agentRunContext },
    });
    await flushPromises();
    await nextTick();

    expect(
      workspaceStore.resolveWorkspaceMetadataByRootPath,
    ).toHaveBeenCalledWith("/Users/normy/project");
    expect(workspaceStore.ensureWorkspaceMetadata).toHaveBeenCalledTimes(1);
    expect(workspaceStore.acquireFileExplorerLiveSession).toHaveBeenCalledWith(
      "agent-run-ws",
      "mobile-files:agent-run-ws",
    );
    expect(
      wrapper.find('[data-testid="mobile-files-no-workspace"]').exists(),
    ).toBe(false);
    expect(wrapper.text()).toContain("README.md");

    wrapper.unmount();
    expect(releaseLiveSession).toHaveBeenCalledTimes(1);
  });

  it("releases the mobile Files live session when the visible context changes", async () => {
    const secondWorkspaceContext: MobileWorkContext = {
      kind: "workspace",
      workspaceId: "workspace-2",
      title: "Second Workspace",
      rootPath: "/Users/normy/second-project",
    };
    const workspaceStore = useWorkspaceStore();
    vi.spyOn(workspaceStore, "ensureWorkspaceMetadata").mockImplementation(
      async (metadata: any) => {
        const workspace = {
          workspaceId: metadata.workspaceId,
          name: metadata.displayName,
          displayName: metadata.displayName,
          absolutePath: metadata.workspaceRootPath,
          workspaceRootPath: metadata.workspaceRootPath,
          workspaceConfig: { root_path: metadata.workspaceRootPath },
          kind: metadata.kind,
          isTemp: false,
        };
        workspaceStore.workspaces[metadata.workspaceId] = workspace as any;
        return workspace as any;
      },
    );
    vi.spyOn(workspaceStore, "registerWorkspaceInfoMetadata").mockImplementation(
      (workspace: any) => ({
        workspaceId: workspace.workspaceId,
        workspaceRootPath: workspace.workspaceRootPath,
        displayName: workspace.displayName,
        kind: workspace.kind,
      }),
    );
    const releaseFirstLiveSession = vi.fn();
    const releaseSecondLiveSession = vi.fn();
    vi.spyOn(workspaceStore, "acquireFileExplorerLiveSession")
      .mockReturnValueOnce(releaseFirstLiveSession)
      .mockReturnValueOnce(releaseSecondLiveSession);
    vi.spyOn(useFileExplorerStore(), "fetchFolderChildren").mockImplementation(
      async (workspaceId: string) => {
        seedProjectFileExplorerState(workspaceId);
      },
    );

    const wrapper = mountWithPinia(MobileFiles, {
      props: { context: workspaceContext },
    });
    await flushPromises();
    await nextTick();

    expect(workspaceStore.acquireFileExplorerLiveSession).toHaveBeenCalledWith(
      "workspace-1",
      "mobile-files:workspace-1",
    );

    await wrapper.setProps({ context: secondWorkspaceContext });
    await flushPromises();
    await nextTick();

    expect(releaseFirstLiveSession).toHaveBeenCalledTimes(1);
    expect(workspaceStore.acquireFileExplorerLiveSession).toHaveBeenCalledWith(
      "workspace-2",
      "mobile-files:workspace-2",
    );

    wrapper.unmount();
    expect(releaseSecondLiveSession).toHaveBeenCalledTimes(1);
  });

  it("keeps interactive Terminal and VNC out of mobile refinement surfaces", () => {
    expect(
      existsSync(resolve(process.cwd(), "components/mobile/MobileTools.vue")),
    ).toBe(false);
  });

});
