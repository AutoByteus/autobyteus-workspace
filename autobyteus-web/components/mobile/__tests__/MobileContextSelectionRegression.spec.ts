import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import MobileChat from "../MobileChat.vue";
import MobileComposerContextTray from "../MobileComposerContextTray.vue";
import MobileRunSetup from "../MobileRunSetup.vue";
import MobileTeamMemberFocusBar from "../MobileTeamMemberFocusBar.vue";
import MobileRunActivityList from "../MobileRunActivityList.vue";
import MobileWorkShell from "../MobileWorkShell.vue";
import { useMobileFileContextCoordinator } from "~/composables/mobile/useMobileFileContextCoordinator";
import { useMobilePendingTeamRunAttachments } from "~/composables/mobile/useMobilePendingTeamRunAttachments";
import { useMobileWorkCatalog } from "~/composables/mobile/useMobileWorkCatalog";
import { useAgentContextsStore } from "~/stores/agentContextsStore";
import { useAgentSelectionStore } from "~/stores/agentSelectionStore";
import { useAgentTeamContextsStore } from "~/stores/agentTeamContextsStore";
import { useAgentActivityStore } from "~/stores/agentActivityStore";
import type { ToolActivity } from "~/types/activity/RunActivity";
import { useAgentDefinitionStore } from "~/stores/agentDefinitionStore";
import { useAgentTeamDefinitionStore } from "~/stores/agentTeamDefinitionStore";
import { useMobileWorkStore } from "~/stores/mobileWorkStore";
import { useRunHistoryStore } from "~/stores/runHistoryStore";
import { useWorkspaceStore } from "~/stores/workspace";
import { AgentContext } from "~/types/agent/AgentContext";
import { AgentRunState } from "~/types/agent/AgentRunState";
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
} from "~/types/agent/AgentRunConfig";
import type { AgentTeamContext } from "~/types/agent/AgentTeamContext";
import type { Conversation } from "~/types/conversation";
import type { MobileWorkContext } from "~/types/mobileWork";
import { createWorkspaceContextAttachment } from "~/utils/contextFiles/contextAttachmentModel";
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
} from "~/test-support/currentTeamTestFixtures";

const { createMobileRunFromConfigMock } = vi.hoisted(() => ({
  createMobileRunFromConfigMock: vi.fn(),
}));

vi.mock("~/composables/mobile/useMobileRunLaunchCoordinator", () => ({
  useMobileRunLaunchCoordinator: () => ({
    createMobileRunFromConfig: createMobileRunFromConfigMock,
  }),
}));

let pinia: Pinia;

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

const workspaceContext: MobileWorkContext = {
  kind: "workspace",
  workspaceId: "workspace-1",
  title: "Project Workspace",
  rootPath: "/Users/normy/project",
};

function makeAgentRunConfig(agentDefinitionId = "agent-1"): AgentRunConfig {
  return {
    agentDefinitionId,
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

function makeAgentContext(runId = "run-1"): AgentContext {
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: "2026-05-18T16:00:00.000Z",
    updatedAt: "2026-05-18T16:00:00.000Z",
    agentDefinitionId: "agent-1",
  };
  return new AgentContext(
    makeAgentRunConfig(),
    new AgentRunState(runId, conversation),
  );
}

function seedActiveAgentRun(): AgentContext {
  const run = makeAgentContext("run-1");
  useAgentContextsStore().runs.set("run-1", run);
  useAgentSelectionStore().selectRunWithoutShellNavigation("run-1", "agent");
  return run;
}

function seedActiveTeamRun(teamRunId = "team-run-1"): AgentTeamContext {
  const leadNode = testAgentNode("/lead", {
    displayName: "Lead",
    agentRunId: "lead-run",
    agentDefinitionId: "agent-1",
  });
  const reviewerNode = testAgentNode("/reviewer", {
    displayName: "Reviewer",
    agentRunId: "reviewer-run",
    agentDefinitionId: "agent-1",
  });
  const qaNode = testAgentNode("/qa-team/qa", {
    displayName: "QA",
    agentRunId: "qa-run",
    agentDefinitionId: "agent-1",
  });
  const qaTeam = testSubTeamNode("/qa-team", [qaNode], {
    displayName: "QA Team",
    teamDefinitionId: "qa-team",
    teamRunId: "qa-team-run",
    coordinatorAddress: qaNode.address,
  });
  const context = buildTestTeamContext({
    teamRunId,
    teamDefinitionId: "team-1",
    teamDefinitionName: "Software Team",
    rootChildren: [leadNode, reviewerNode, qaTeam],
    coordinatorAddress: "/lead",
    focusedAgentRunId: "lead-run",
    isActive: false,
  });
  const rootTeamRunId = context.view.getRootTeamRunId();
  useAgentTeamContextsStore().addTeamContext(context);
  useAgentSelectionStore().selectRunWithoutShellNavigation(
    rootTeamRunId,
    "team",
  );
  useMobileWorkStore().selectContext(
    {
      kind: "team-run",
      teamRunId: rootTeamRunId,
      teamDefinitionId: "team-1",
      title: "Software Team",
      summary: "Existing team run",
      workspaceRootPath: "/Users/normy/project",
      focusedAgentRunId: "lead-run",
      isActive: true,
      lastActivityAt: "2026-05-18T16:00:00.000Z",
      statusLabel: "Running",
    },
    "chat",
  );
  return context;
}

const teamMemberContext = (team: AgentTeamContext, memberAddress: string) =>
  team.view.listAgentContextEntries().find((entry) => entry.memberAddress === memberAddress)?.agentContext ?? null;

function seedCatalog(): void {
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
  ];
  useAgentTeamDefinitionStore().agentTeamDefinitions = [
    {
      id: "team-1",
      name: "Software Team",
      description: "Coordinates implementation",
      instructions: "",
      coordinatorMemberName: "lead",
      nodes: [],
    },
  ];
  const workspaceStore = useWorkspaceStore();
  workspaceStore.workspaces = {
    "workspace-1": {
      workspaceId: "workspace-1",
      name: "Project Workspace",
      displayName: "Project Workspace",
      workspaceConfig: { root_path: "/Users/normy/project" },
      absolutePath: "/Users/normy/project",
      workspaceRootPath: "/Users/normy/project",
      kind: "filesystem",
      isTemp: false,
    },
  };
  workspaceStore.workspacesFetched = true;
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

describe("mobile context selection stale-run regression", () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    seedCatalog();
    createMobileRunFromConfigMock.mockResolvedValue({
      context: agentRunContext,
    });
  });

  it("does not show an existing run monitor after switching mobile Chat to a non-run context", async () => {
    seedActiveAgentRun();

    const wrapper = mountWithPinia(MobileChat, {
      props: { context: workspaceContext },
      global: {
        stubs: {
          AgentEventMonitor: {
            template: '<div data-testid="agent-event-monitor" />',
          },
          AgentTeamEventMonitor: {
            template: '<div data-testid="team-event-monitor" />',
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain("Start or open a run");

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(
      true,
    );
  });

  it("routes non-run file attachments to mobile draft state instead of the stale selected run", () => {
    const run = seedActiveAgentRun();
    const coordinator = useMobileFileContextCoordinator();

    const draftResult = coordinator.attachWorkspaceFile(
      "/Users/normy/project/draft.md",
      workspaceContext,
    );

    expect(draftResult.target).toBe("mobile-draft");
    expect(run.contextFilePaths).toHaveLength(0);
    expect(useMobileWorkStore().draftContextAttachments).toHaveLength(1);
    expect(useMobileWorkStore().draftContextAttachments[0].locator).toBe(
      "/Users/normy/project/draft.md",
    );

    const activeRunResult = coordinator.attachWorkspaceFile(
      "/Users/normy/project/run.md",
      agentRunContext,
    );

    expect(activeRunResult.target).toBe("active-run");
    expect(
      run.contextFilePaths.map((attachment) => attachment.locator),
    ).toEqual(["/Users/normy/project/run.md"]);
    expect(
      useMobileWorkStore().draftContextAttachments.map(
        (attachment) => attachment.locator,
      ),
    ).toEqual(["/Users/normy/project/draft.md"]);
  });

  it("shows composer attachments from the current mobile context only", async () => {
    const run = seedActiveAgentRun();
    run.contextFilePaths.push(
      createWorkspaceContextAttachment("/Users/normy/project/active.md"),
    );
    useMobileWorkStore().addDraftContextAttachment(
      createWorkspaceContextAttachment("/Users/normy/project/draft.md"),
    );

    const wrapper = mountWithPinia(MobileComposerContextTray, {
      props: { context: workspaceContext },
    });

    expect(
      wrapper.findAll('[data-testid="mobile-composer-context-item"]'),
    ).toHaveLength(1);
    expect(wrapper.text()).toContain("draft.md");
    expect(wrapper.text()).not.toContain("active.md");

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(
      wrapper.findAll('[data-testid="mobile-composer-context-item"]'),
    ).toHaveLength(1);
    expect(wrapper.text()).toContain("active.md");
    expect(wrapper.text()).not.toContain("draft.md");
  });

  it("keeps pending team run attachments visible across focus changes and flushes them to the focused leaf before send", async () => {
    const teamContext = seedActiveTeamRun();
    const mobileWorkStore = useMobileWorkStore();
    const pendingAttachment = createWorkspaceContextAttachment(
      "/Users/normy/project/team-draft.md",
    );
    mobileWorkStore.addPendingTeamRunAttachment(
      "team-run-1",
      pendingAttachment,
    );

    const contextRef = ref(mobileWorkStore.currentContext);
    const tray = mountWithPinia(MobileComposerContextTray, {
      props: { context: contextRef.value },
    });

    expect(tray.text()).toContain("team-draft.md");
    expect(
      teamMemberContext(teamContext, "/lead")?.contextFilePaths,
    ).toHaveLength(0);
    expect(
      teamMemberContext(teamContext, "/reviewer")?.contextFilePaths,
    ).toHaveLength(0);

    expect(teamContext.view.focusAgent("reviewer-run").disposition).toBe("applied");
    mobileWorkStore.updateFocusedTeamMember("team-run-1", "reviewer-run");
    contextRef.value = mobileWorkStore.currentContext;
    await tray.setProps({ context: contextRef.value });

    expect(tray.text()).toContain("team-draft.md");

    const bridge = useMobilePendingTeamRunAttachments(contextRef);
    await bridge.beforeSend();

    expect(
      teamMemberContext(teamContext, "/lead")?.contextFilePaths,
    ).toHaveLength(0);
    expect(
      teamMemberContext(teamContext, "/reviewer")
        ?.contextFilePaths.map((attachment) => attachment.locator),
    ).toEqual(["/Users/normy/project/team-draft.md"]);
    expect(
      mobileWorkStore.getPendingTeamRunAttachments("team-run-1"),
    ).toHaveLength(0);
    expect(bridge.error.value).toBeNull();
  });

  it("ignores a stale non-Agent mobile focus and flushes only to the aggregate's exact Agent focus", async () => {
    const teamContext = seedActiveTeamRun();
    const mobileWorkStore = useMobileWorkStore();
    mobileWorkStore.updateFocusedTeamMember(
      "team-run-1",
      "qa-team-run",
    );
    mobileWorkStore.addPendingTeamRunAttachment(
      "team-run-1",
      createWorkspaceContextAttachment("/Users/normy/project/team-draft.md"),
    );

    const bridge = useMobilePendingTeamRunAttachments(
      ref(mobileWorkStore.currentContext),
    );
    await bridge.beforeSend();

    expect(
      mobileWorkStore.getPendingTeamRunAttachments("team-run-1"),
    ).toHaveLength(0);
    expect(
      teamMemberContext(teamContext, "/lead")?.contextFilePaths.map((attachment) => attachment.locator),
    ).toEqual(["/Users/normy/project/team-draft.md"]);
    expect(teamMemberContext(teamContext, "/qa-team/qa")?.contextFilePaths).toHaveLength(0);
    expect(bridge.error.value).toBeNull();
  });

  it("uses draft attachment count for run setup and launches with the next-run draft", async () => {
    seedActiveAgentRun().contextFilePaths.push(
      createWorkspaceContextAttachment("/Users/normy/project/active.md"),
    );
    useMobileWorkStore().addDraftContextAttachment(
      createWorkspaceContextAttachment("/Users/normy/project/draft.md"),
    );

    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    expect(
      wrapper.get('[data-testid="mobile-run-setup-context-count"]').text(),
    ).toContain("1 file");
    await wrapper
      .get('[data-testid="mobile-run-agent-select-toggle"]')
      .trigger("click");
    await nextTick();
    await wrapper
      .get('[data-testid="mobile-run-agent-select-option"]')
      .trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-prompt"]').exists()).toBe(
      false,
    );
    await wrapper.get("form").trigger("submit");
    await nextTick();

    expect(createMobileRunFromConfigMock).toHaveBeenCalledWith({
      kind: "agent",
      agentDefinitionId: "agent-1",
      workspaceId: "workspace-1",
    });
  });

  it("updates both team focus and the mobile work context when changing an existing team-run target", async () => {
    const teamContext = seedActiveTeamRun();

    const wrapper = mountWithPinia(MobileTeamMemberFocusBar, {
      props: { context: useMobileWorkStore().currentContext },
    });

    expect(
      wrapper.get('[data-testid="mobile-team-focus-select"]').text(),
    ).toContain("lead");
    expect(
      wrapper.get('[data-testid="mobile-team-focus-select"]').text(),
    ).not.toContain("Change");
    expect(
      wrapper
        .get('[data-testid="mobile-team-focus-select-toggle"]')
        .attributes("aria-label"),
    ).toBe("Change message target");

    await wrapper
      .get('[data-testid="mobile-team-focus-select-toggle"]')
      .trigger("click");
    await nextTick();
    const reviewerOption = wrapper
      .findAll('[data-testid="mobile-team-focus-select-option"]')
      .find((option) => option.text().includes("reviewer"));
    expect(reviewerOption).toBeTruthy();
    await reviewerOption!.trigger("click");
    await flushPromises();

    expect(teamContext.view.getFocusedMemberAddress()).toBe("/reviewer");
    const currentContext = useMobileWorkStore().currentContext;
    expect(currentContext?.kind).toBe("team-run");
    if (currentContext?.kind === "team-run") {
      expect(currentContext.focusedAgentRunId).toBe("reviewer-run");
    }
    expect(
      useMobileWorkStore().getRememberedFocusedTeamMember("team-run-1"),
    ).toBe("reviewer-run");
  });

  it("hides existing-run target selector on Runs while keeping compact target controls on focused work tabs", async () => {
    seedActiveTeamRun();
    const wrapper = mountWithPinia(MobileWorkShell, {
      props: {
        context: useMobileWorkStore().currentContext,
        activeTab: "runs",
      },
      global: {
        stubs: {
          MobileChat: { template: '<div data-testid="mobile-chat-stub" />' },
          MobileRuns: { template: '<div data-testid="mobile-runs-stub" />' },
          MobileFiles: { template: '<div data-testid="mobile-files-stub" />' },
          MobileArtifacts: {
            template: '<div data-testid="mobile-artifacts-stub" />',
          },
          MobileActivity: {
            template: '<div data-testid="mobile-activity-stub" />',
          },
        },
      },
    });

    expect(
      wrapper.find('[data-testid="mobile-team-member-focus-bar"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-testid="mobile-tab-artifacts"]').exists()).toBe(
      true,
    );
    expect(wrapper.get('[data-testid="mobile-tab-artifacts"]').text()).toContain(
      "Artifacts",
    );

    await wrapper.setProps({ activeTab: "chat" });
    await nextTick();

    expect(
      wrapper.find('[data-testid="mobile-team-member-focus-bar"]').exists(),
    ).toBe(true);
    expect(
      wrapper.get('[data-testid="mobile-team-focus-select"]').text(),
    ).toContain("lead");
    expect(
      wrapper.get('[data-testid="mobile-team-focus-select"]').text(),
    ).not.toContain("Change");
    expect(
      wrapper.get('[data-testid="mobile-team-focus-select"]').text(),
    ).not.toContain("Message target");
    expect(
      wrapper
        .get('[data-testid="mobile-team-focus-select"]')
        .attributes("aria-label"),
    ).toBe("Message target");
    expect(
      wrapper
        .get('[data-testid="mobile-team-focus-select-toggle"]')
        .attributes("aria-label"),
    ).toBe("Change message target");

    await wrapper.setProps({ activeTab: "artifacts" });
    await nextTick();

    expect(
      wrapper.find('[data-testid="mobile-team-member-focus-bar"]').exists(),
    ).toBe(true);
  });

  it("keeps non-chat tabs in a bounded block task surface so h-full roots fill the viewport", async () => {
    const wrapper = mountWithPinia(MobileWorkShell, {
      props: {
        context: agentRunContext,
        activeTab: "runs",
      },
      global: {
        stubs: {
          MobileChat: { template: '<div data-testid="mobile-chat-stub" />' },
          MobileRuns: {
            template:
              '<section class="flex h-full flex-col overflow-hidden" data-testid="mobile-runs-stub" />',
          },
          MobileFiles: {
            template:
              '<section class="flex h-full flex-col overflow-hidden" data-testid="mobile-files-stub" />',
          },
          MobileArtifacts: {
            template:
              '<section class="flex h-full flex-col overflow-hidden" data-testid="mobile-artifacts-stub" />',
          },
          MobileActivity: {
            template:
              '<section class="flex h-full flex-col overflow-hidden" data-testid="mobile-activity-stub" />',
          },
        },
      },
    });

    const taskSurface = wrapper.get('[data-testid="mobile-work-task-surface"]');
    expect(taskSurface.classes()).toEqual(
      expect.arrayContaining(["min-h-0", "flex-1", "overflow-hidden"]),
    );
    expect(taskSurface.classes()).not.toContain("flex");

    for (const [tab, testId] of [
      ["runs", "mobile-runs-stub"],
      ["files", "mobile-files-stub"],
      ["artifacts", "mobile-artifacts-stub"],
      ["activity", "mobile-activity-stub"],
    ] as const) {
      await wrapper.setProps({ activeTab: tab });
      await nextTick();

      const activeTabRoot = wrapper.get(`[data-testid="${testId}"]`);
      expect(activeTabRoot.classes()).toEqual(
        expect.arrayContaining(["h-full", "overflow-hidden"]),
      );
      expect(
        wrapper.get('[data-testid="mobile-work-task-surface"]').classes(),
      ).not.toContain("flex");
    }
  });

  it("prefers remembered valid team focus when mapping Recent team runs and falls back safely when stale", () => {
    const runHistoryStore = useRunHistoryStore();
    runHistoryStore.workspaceGroups = [
      {
        workspaceRootPath: "/Users/normy/project",
        workspaceName: "project",
        agentDefinitions: [],
        teamDefinitions: [
          {
            teamDefinitionId: "team-1",
            teamDefinitionName: "Software Team",
            runs: [
              {
                teamRunId: "team-run-1",
                teamDefinitionId: "team-1",
                teamDefinitionName: "Software Team",
                summary: "Existing team run",
                createdAt: "2026-05-18T16:00:00.000Z",
                status: true,
                isActive: true,
                coordinatorAddress: "/lead",
                rootTeam: {
                  kind: "agent_team",
                  address: "/",
                  teamDefinitionId: "team-1",
                  teamRunId: "team-run-1",
                  coordinatorAddress: "/lead",
                  children: [],
                },
                members: [
                  {
                    memberAddress: "/lead",
                    displayName: "lead",
                    agentRunId: "lead-run",
                    status: "idle",
                  },
                  {
                    memberAddress: "/reviewer",
                    displayName: "reviewer",
                    agentRunId: "reviewer-run",
                    status: "idle",
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as any;

    const mobileWorkStore = useMobileWorkStore();
    mobileWorkStore.rememberFocusedTeamMember("team-run-1", "reviewer-run");
    const { recentWorkItems } = useMobileWorkCatalog();
    const rememberedContext = recentWorkItems.value[0]?.context;
    expect(rememberedContext?.kind).toBe("team-run");
    if (rememberedContext?.kind === "team-run") {
      expect(rememberedContext.focusedAgentRunId).toBe("reviewer-run");
    }

    mobileWorkStore.rememberFocusedTeamMember("team-run-1", "missing-run");
    const fallbackContext = recentWorkItems.value[0]?.context;
    expect(fallbackContext?.kind).toBe("team-run");
    if (fallbackContext?.kind === "team-run") {
      expect(fallbackContext.focusedAgentRunId).toBe("lead-run");
    }
  });

  it("does not leak stale run or tool activity into non-run mobile activity contexts", async () => {
    seedActiveAgentRun();
    const activity: ToolActivity = {
      kind: "tool",
      activityId: "tool-1",
      invocationId: "tool-1",
      toolName: "read_file",
      type: "tool_call",
      status: "success",
      contextText: "/Users/normy/project/active.md",
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date("2026-05-18T16:05:00.000Z"),
    };
    useAgentActivityStore().addToolActivity("run-1", activity);

    const wrapper = mountWithPinia(MobileRunActivityList, {
      props: { context: workspaceContext },
    });

    expect(
      wrapper.find('[data-testid="mobile-run-activity-row"]').exists(),
    ).toBe(false);
    expect(wrapper.text()).toContain(
      "Select a run to see run activity history.",
    );
    expect(wrapper.text()).not.toContain("read_file");

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(
      wrapper.find('[data-testid="mobile-run-activity-row"]').exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("read_file");
  });
});
