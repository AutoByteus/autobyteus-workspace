import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AgentDefinitionForm from "../AgentDefinitionForm.vue";

const mockTranslations: Record<string, string> = {
  "agents.components.agents.AgentDefinitionForm.instructionsPlaceholder": "Enter the agent's system instructions...",
};

const {
  mockOptionsStore,
  mockToolStore,
  mockSkillStore,
  mockFileUploadStore,
} = vi.hoisted(() => ({
  mockOptionsStore: {
    fetchAllAvailableOptions: vi.fn(),
    inputProcessors: [] as string[],
    llmResponseProcessors: [] as string[],
    systemPromptProcessors: [] as string[],
    toolExecutionResultProcessors: [] as string[],
    toolInvocationPreprocessors: [] as string[],
    lifecycleProcessors: [] as string[],
  },
  mockToolStore: {
    getLocalToolsByCategory: [] as Array<{ categoryName: string; tools: Array<{ name: string }> }>,
    fetchLocalToolsGroupedByCategory: vi.fn(),
    getMcpServers: [] as Array<{ serverId: string }>,
    fetchMcpServers: vi.fn().mockResolvedValue(undefined),
    getToolsForServer: vi.fn(() => [] as Array<{ name: string }>),
  },
  mockSkillStore: {
    skills: [] as Array<{ name: string }>,
    fetchAllSkills: vi.fn(),
  },
  mockFileUploadStore: {
    isUploading: false,
    error: null as string | null,
    uploadFile: vi.fn().mockResolvedValue(""),
  },
}));

vi.mock("~/stores/agentDefinitionOptionsStore", () => ({
  useAgentDefinitionOptionsStore: () => mockOptionsStore,
}));

vi.mock("~/stores/toolManagementStore", () => ({
  useToolManagementStore: () => mockToolStore,
}));

vi.mock("~/stores/skillStore", () => ({
  useSkillStore: () => mockSkillStore,
}));

vi.mock("~/stores/fileUploadStore", () => ({
  useFileUploadStore: () => mockFileUploadStore,
}));

describe("AgentDefinitionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders required instructions input with expected placeholder", () => {
    const wrapper = mount(AgentDefinitionForm, {
      props: {
        isSubmitting: false,
        submitButtonText: "Create Agent",
        isCreateMode: true,
      },
      global: {
        stubs: {
          GroupableTagInput: true,
        },
        mocks: {
          $t: (key: string) => mockTranslations[key] ?? key,
        },
      },
    });

    const instructions = wrapper.get("textarea#instructions");
    expect(instructions.attributes("required")).toBeDefined();
    expect(instructions.attributes("placeholder")).toBe("Enter the agent's system instructions...");
  });

  it("emits submit payload containing instructions", async () => {
    const wrapper = mount(AgentDefinitionForm, {
      props: {
        isSubmitting: false,
        submitButtonText: "Create Agent",
        isCreateMode: true,
      },
      global: {
        stubs: {
          GroupableTagInput: true,
        },
        mocks: {
          $t: (key: string) => mockTranslations[key] ?? key,
        },
      },
    });

    await wrapper.get("input#name").setValue("Planner Agent");
    await wrapper.get("textarea#description").setValue("Plans implementation work");
    await wrapper.get("textarea#instructions").setValue("Always produce an executable plan.");

    await wrapper.get("form").trigger("submit.prevent");

    const submitEvents = wrapper.emitted("submit") || [];
    expect(submitEvents.length).toBe(1);
    const payload = submitEvents[0]?.[0] as Record<string, unknown>;
    expect(payload.instructions).toBe("Always produce an executable plan.");
    expect(payload.name).toBe("Planner Agent");
  });

  it("emits defaultLaunchConfig when launch defaults are provided", async () => {
    const wrapper = mount(AgentDefinitionForm, {
      props: {
        isSubmitting: false,
        submitButtonText: "Create Agent",
        isCreateMode: true,
      },
      global: {
        stubs: {
          GroupableTagInput: true,
        },
        mocks: {
          $t: (key: string) => mockTranslations[key] ?? key,
        },
      },
    });

    await wrapper.get("input#name").setValue("Planner Agent");
    await wrapper.get("textarea#description").setValue("Plans implementation work");
    await wrapper.get("textarea#instructions").setValue("Always produce an executable plan.");
    await wrapper.get("input#default-launch-runtime-kind").setValue("autobyteus");
    await wrapper.get("input#default-launch-model").setValue("gpt-5.4-mini");
    await wrapper.get("textarea#default-launch-llm-config").setValue('{"reasoning_effort":"medium"}');

    await wrapper.get("form").trigger("submit.prevent");

    const payload = (wrapper.emitted("submit") || [])[0]?.[0] as Record<string, any>;
    expect(payload.defaultLaunchConfig).toEqual({
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: {
        reasoning_effort: "medium",
      },
    });
  });

  it("does not emit submit when default launch config JSON is invalid", async () => {
    const wrapper = mount(AgentDefinitionForm, {
      props: {
        isSubmitting: false,
        submitButtonText: "Create Agent",
        isCreateMode: true,
      },
      global: {
        stubs: {
          GroupableTagInput: true,
        },
        mocks: {
          $t: (key: string) => mockTranslations[key] ?? key,
        },
      },
    });

    await wrapper.get("input#name").setValue("Planner Agent");
    await wrapper.get("textarea#description").setValue("Plans implementation work");
    await wrapper.get("textarea#instructions").setValue("Always produce an executable plan.");
    await wrapper.get("textarea#default-launch-llm-config").setValue("{invalid json}");

    await wrapper.get("form").trigger("submit.prevent");

    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.text()).toContain("LLM config JSON is invalid.");
  });
});
