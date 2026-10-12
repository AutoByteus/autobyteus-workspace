import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import MobileRunSetup from "../MobileRunSetup.vue";
import { useAgentDefinitionStore } from "~/stores/agentDefinitionStore";
import { useAgentTeamDefinitionStore } from "~/stores/agentTeamDefinitionStore";
import { useTeamRunConfigStore } from "~/stores/teamRunConfigStore";
import { useWorkspaceStore } from "~/stores/workspace";
import { DEFAULT_AGENT_RUNTIME_KIND } from "~/types/agent/AgentRunConfig";
import type { MobileWorkContext } from "~/types/mobileWork";

// delegated-launch-config-defaults DS-006 (mobile), AC-011: a mobile Team start seeds members from their own
// usable defaults through the setup controller (the mobile setup has no member rows, so the seed is observed
// on the selected launch draft), and a seed that resolves after the user switched to another Team is dropped.
// While `held`, every catalog load waits; `releaseAll` settles all of them (one load per member default runtime check).
const catalogGate = vi.hoisted(() => {
  const pending: Array<() => void> = [];
  return { held: false, pending, releaseAll: () => { pending.splice(0).forEach((release) => release()); } };
});
vi.mock("~/services/runSettings/startModelCatalog", () => ({
  startModelCatalog: () => ({
    ensureAvailability: async () => undefined,
    isRuntimeEnabled: () => true,
    ensureCatalog: () => (catalogGate.held ? new Promise<void>((resolve) => { catalogGate.pending.push(resolve); }) : Promise.resolve()),
    models: () => ["test-model", "model-b"],
  }),
}));

const RUNTIME = DEFAULT_AGENT_RUNTIME_KIND;
const workspaceContext: MobileWorkContext = {
  kind: "workspace",
  workspaceId: "workspace-1",
  title: "Project Workspace",
  rootPath: "/Users/normy/project",
};
let pinia: Pinia;

const agent = (id: string, defaultLaunchConfig?: Record<string, unknown>) => ({
  id, name: id, description: id, instructions: "", toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [],
  toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [],
  skillScope: "CONFIGURED", ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}),
});
const team = (id: string, name: string, members: Record<string, string>) => ({
  id, name, description: name, instructions: "", coordinatorMemberName: Object.keys(members)[0]!,
  nodes: Object.entries(members).map(([memberName, ref]) => ({ memberName, ref, refType: "AGENT", refScope: "SHARED" })),
  defaultLaunchConfig: { runtimeKind: RUNTIME, llmModelIdentifier: "test-model", llmConfig: null },
});

const seedCatalogAndWorkspace = () => {
  useAgentDefinitionStore().agentDefinitions = [
    agent("lead-agent"),
    agent("reviewer-agent", { runtimeKind: RUNTIME, llmModelIdentifier: "model-b", llmConfig: null }),
    agent("unoffered-agent", { runtimeKind: RUNTIME, llmModelIdentifier: "not-offered", llmConfig: null }),
    agent("writer-agent"),
  ] as any;
  useAgentTeamDefinitionStore().agentTeamDefinitions = [
    team("team-1", "Software Team", { lead: "lead-agent", reviewer: "reviewer-agent", unoffered: "unoffered-agent" }),
    team("team-2", "Writing Team", { writer: "writer-agent" }),
  ] as any;
  useWorkspaceStore().workspaces = {
    "workspace-1": {
      workspaceId: "workspace-1", name: "Project Workspace", displayName: "Project Workspace", absolutePath: "/Users/normy/project",
      workspaceRootPath: "/Users/normy/project", workspaceConfig: { root_path: "/Users/normy/project" }, kind: "filesystem", isTemp: false,
    },
  } as any;
  useWorkspaceStore().workspacesFetched = true;
};

const mountSetup = () => mount(MobileRunSetup, {
  props: { context: workspaceContext },
  global: { plugins: [pinia], stubs: { RuntimeModelConfigFields: { template: '<div data-testid="runtime-model-config-fields" />' } } },
});
const selectTeam = async (wrapper: ReturnType<typeof mountSetup>, name: string) => {
  await wrapper.get('[data-testid="mobile-run-team-select-toggle"]').trigger("click");
  await nextTick();
  const option = wrapper.findAll('[data-testid="mobile-run-team-select-option"]').find((candidate) => candidate.text().includes(name));
  expect(option, `team option ${name}`).toBeTruthy();
  await option!.trigger("click");
  await nextTick();
};

describe("Mobile Team start seeds members from their own defaults (DS-006 mobile)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    catalogGate.held = false;
    catalogGate.pending.length = 0;
    pinia = createPinia();
    setActivePinia(pinia);
    seedCatalogAndWorkspace();
  });

  it("a member with a usable own default gets it on the selected draft; one without or with an unusable default follows the Team", async () => {
    const wrapper = mountSetup();
    await nextTick();
    await wrapper.get('[data-testid="mobile-run-setup-team-mode"]').trigger("click");
    await nextTick();
    await selectTeam(wrapper, "Software Team");
    await flushPromises();

    const draft = useTeamRunConfigStore().selectedDraft;
    expect(draft?.config.teamDefinitionId).toBe("team-1");
    const overrides = draft!.config.agentOverrides as Record<string, Record<string, unknown>>;
    const reviewer = Object.entries(overrides).find(([address]) => address.endsWith("reviewer"));
    expect(reviewer?.[1]).toMatchObject({ runtimeKind: RUNTIME, llmModelIdentifier: "model-b" });
    expect(Object.keys(overrides).filter((address) => /lead|unoffered/.test(address))).toEqual([]);
  });

  const reviewerOverride = () => Object.entries(useTeamRunConfigStore().selectedDraft!.config.agentOverrides as Record<string, Record<string, unknown>>)
    .find(([address]) => address.endsWith("reviewer"))?.[1];

  it("a seed held on the catalog is applied once it resolves while the same Team is still selected (control)", async () => {
    catalogGate.held = true;
    const wrapper = mountSetup();
    await nextTick();
    await wrapper.get('[data-testid="mobile-run-setup-team-mode"]').trigger("click");
    await nextTick();
    await selectTeam(wrapper, "Software Team");
    await flushPromises();
    expect(catalogGate.pending.length, "seeding waits on the catalog").toBeGreaterThan(0);
    expect(reviewerOverride(), "nothing applied while held").toBeUndefined();
    catalogGate.releaseAll();
    await flushPromises();

    expect(useTeamRunConfigStore().selectedDraft?.config.teamDefinitionId).toBe("team-1");
    expect(reviewerOverride()).toMatchObject({ runtimeKind: RUNTIME, llmModelIdentifier: "model-b" });
  });

  it("a seed that resolves after the user switched to another Team is not applied to it", async () => {
    catalogGate.held = true;
    const wrapper = mountSetup();
    await nextTick();
    await wrapper.get('[data-testid="mobile-run-setup-team-mode"]').trigger("click");
    await nextTick();
    await selectTeam(wrapper, "Software Team");
    await flushPromises();
    expect(catalogGate.pending.length, "seeding waits on the catalog").toBeGreaterThan(0);
    catalogGate.held = false;
    await selectTeam(wrapper, "Writing Team");
    await flushPromises();
    catalogGate.releaseAll();
    await flushPromises();

    const draft = useTeamRunConfigStore().selectedDraft;
    expect(draft?.config.teamDefinitionId).toBe("team-2");
    expect(Object.keys(draft!.config.agentOverrides)).toEqual([]);
  });
});
