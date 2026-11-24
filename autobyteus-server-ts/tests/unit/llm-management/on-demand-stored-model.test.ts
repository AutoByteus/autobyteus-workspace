import { afterEach, describe, expect, it, vi } from "vitest";
import { LMStudioModelProvider } from "autobyteus-ts/llm/lmstudio-provider.js";
import { OllamaModelProvider } from "autobyteus-ts/llm/ollama-provider.js";
import { ModelAvailabilityService } from "../../../src/llm-management/services/model-availability-service.js";
import { RunModelSelectionService } from "../../../src/llm-management/services/run-model-selection-service.js";
import { storedModelStartRefusal } from "../../../src/llm-management/services/run-model-selection-refusal.js";
import { MODEL_LIST_READ_MS } from "../../../src/runtime-management/read-deadline.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { EXISTING_AGENT_DEFINITIONS } from "../../helpers/explicit-host-collaborators.js";

/**
 * autobyteus-500 G-5 revision (SR-015 R1, SR-016; CR-500-003). On the AutoByteus runtime, Ollama, LM Studio and custom
 * endpoint models are in the runtime's list only once their provider's catalog is loaded, as a start loads it. The
 * stored-model check (both start paths ask `storedModelStartRefusal`) and the Settings options read load it first: a
 * model present after the load is offered; one missing from a provider that was read is not; a provider that could
 * not be read (its host down, any failed host, a throw, the 8 s budget) is `list_unreadable`, so the start proceeds as
 * at base and Settings shows no note. The real `ModelAvailabilityService` and `RunModelSelectionService`, over a fake
 * catalog that lists a provider's models only after its load, as after a restart.
 */
const LMSTUDIO_HOST = "http://localhost:1234";
const OLLAMA_A = "http://localhost:11434";
const OLLAMA_B = "http://gpu-box:11434";
const lmstudio = (name: string) => `${name}:lmstudio@localhost:1234`;
const ollamaOn = (host: "localhost:11434" | "gpu-box:11434", name: string) => `${name}:ollama@${host}`;
const CUSTOM = "openai-compatible:provider_gateway:vendor:family:model";

type Source = { state: string; failedUnitCount: number; successfulUnitCount: number };
type ProviderLoad = { models: string[]; source?: Partial<Source>; throws?: string; hangs?: boolean };
const healthy: Source = { state: "READY", failedUnitCount: 0, successfulUnitCount: 1 };

/** Providers' models appear in the AutoByteus list only after `ensureProviderModelCatalog` loaded them. */
const world = (providers: Record<string, ProviderLoad>) => {
  const loaded = new Set<string>();
  const catalog = {
    ensureProviderModelCatalog: vi.fn(async (providerId: string) => {
      const provider = providers[providerId];
      if (!provider) throw new Error(`no provider ${providerId}`);
      if (provider.hangs) return new Promise<never>(() => undefined);
      if (provider.throws) throw new Error(provider.throws);
      loaded.add(providerId);
      return { sources: [{ ...healthy, ...provider.source }] };
    }),
    runtimeModelSelectionCatalog: vi.fn(async (runtimeKind: string) => {
      if (runtimeKind !== RuntimeKind.AUTOBYTEUS) throw new Error("only autobyteus here");
      const offeredModels = [...loaded].flatMap((id) => providers[id]!.models).map((model_identifier) => ({ model_identifier }));
      return { offeredModels, findExactCurrent: (id: string | null) => offeredModels.find((model) => model.model_identifier === id) ?? null };
    }),
  };
  const customProviders = { getProviderById: vi.fn(async (id: string) => id === "provider_gateway" ? { id } : null) };
  const availability = new ModelAvailabilityService(catalog as never, customProviders as never);
  const selection = new RunModelSelectionService(catalog as never, availability, { resolveMany: () => ({}) } as never);
  return { catalog, availability, selection };
};
const startRefusal = (selection: RunModelSelectionService, llmModelIdentifier: string) => storedModelStartRefusal(
  { agentDefinitions: EXISTING_AGENT_DEFINITIONS, storedModels: selection },
  { agentDefinitionId: "writer-def", agentName: "writer", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier });
// Not about autobyteus-53's hand-over capability; `unavailable` keeps this file's pre-existing capacity-gated options
// shape (none of its assertions read `replacements`).
const options = (selection: RunModelSelectionService, currentModelIdentifier: string) =>
  selection.listOptions({ runtimeKind: RuntimeKind.AUTOBYTEUS, currentModelIdentifier, workspaceRootPath: "/work", handOver: "unavailable" });

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("G-5 on the AutoByteus runtime: a model its provider loads on demand (SR-015 R1)", () => {
  const hosts = () => {
    vi.spyOn(LMStudioModelProvider, "getHosts").mockReturnValue([LMSTUDIO_HOST]);
    vi.spyOn(OllamaModelProvider, "getHosts").mockReturnValue([OLLAMA_A, OLLAMA_B]);
  };

  it.each([
    ["LM Studio", lmstudio("qwen3-coder"), { LMSTUDIO: { models: [lmstudio("qwen3-coder")] } }],
    ["Ollama", ollamaOn("localhost:11434", "llama3.2"), { OLLAMA: { models: [ollamaOn("localhost:11434", "llama3.2")] } }],
    ["a custom endpoint", CUSTOM, { provider_gateway: { models: [CUSTOM] } }],
  ])("%s: present after the load (nothing loaded yet, as after a restart) is offered; the start proceeds, no note", async (_, id, providers) => {
    hosts();
    const { selection, catalog } = world(providers);
    await expect(selection.storedModelOffer({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: id })).resolves.toBe("offered");
    await expect(startRefusal(selection, id)).resolves.toBeNull();
    const read = await options(selection, id);
    expect(read).toMatchObject({ modelListReadable: true, currentModel: { llmModelIdentifier: id } });
    expect(catalog.ensureProviderModelCatalog).toHaveBeenCalled();
  });

  it.each([
    ["LM Studio", lmstudio("retired-model"), { LMSTUDIO: { models: [lmstudio("other")] } }],
    ["Ollama", ollamaOn("localhost:11434", "retired"), { OLLAMA: { models: [ollamaOn("localhost:11434", "other")] } }],
  ])("%s: loaded but missing is not offered: the start is refused, and Settings has a readable list without it", async (_, id, providers) => {
    hosts();
    const { selection } = world(providers);
    await expect(selection.storedModelOffer({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: id })).resolves.toBe("not_offered");
    await expect(startRefusal(selection, id)).resolves.toMatchObject({ code: "RUN_MODEL_NOT_OFFERED" });
    await expect(options(selection, id)).resolves.toMatchObject({ modelListReadable: true, currentModel: null });
  });

  it.each([
    ["LM Studio, its host down", lmstudio("qwen3-coder"), { LMSTUDIO: { models: [], throws: "LMSTUDIO_MODEL_DISCOVERY_UNAVAILABLE" } }],
    ["Ollama, every host down", ollamaOn("localhost:11434", "llama3.2"), { OLLAMA: { models: [], throws: "OLLAMA_MODEL_DISCOVERY_UNAVAILABLE" } }],
    ["Ollama, the model's host down and the other up (AR-003)", ollamaOn("gpu-box:11434", "llama3.2"),
      { OLLAMA: { models: [ollamaOn("localhost:11434", "other")], source: { state: "PARTIAL", failedUnitCount: 1 } } }],
    ["a provider whose source failed", lmstudio("qwen3-coder"), { LMSTUDIO: { models: [], source: { state: "ERROR" } } }],
    ["an LM Studio host that isn't configured", "qwen3-coder:lmstudio@elsewhere:1234", { LMSTUDIO: { models: [] } }],
    ["a custom endpoint that was removed", "openai-compatible:gone_gateway:vendor:model", {}],
  ])("%s: unreadable, so the start proceeds as at base and Settings says the list couldn't be read", async (_, id, providers) => {
    hosts();
    const { selection } = world(providers);
    await expect(selection.storedModelOffer({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: id })).resolves.toBe("list_unreadable");
    await expect(startRefusal(selection, id)).resolves.toBeNull();
    const read = await options(selection, id);
    expect(read).toMatchObject({ modelListReadable: false, currentModel: null });
    expect(read.unavailableReason).toBeTruthy();
  });

  it("a load slower than the 8 s budget is unreadable at the budget, for the start check and for Settings", async () => {
    hosts();
    vi.useFakeTimers();
    const { selection } = world({ LMSTUDIO: { models: [], hangs: true } });
    const answers: unknown[] = [];
    void selection.storedModelOffer({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: lmstudio("m") }).then((value) => answers.push(value));
    void options(selection, lmstudio("m")).then((value) => answers.push(value.modelListReadable));
    await vi.advanceTimersByTimeAsync(MODEL_LIST_READ_MS - 1);
    expect(answers).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(answers).toEqual(["list_unreadable", false]);
  });

  it("a static AutoByteus model and another runtime read their list as before, with no on-demand load", async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn(),
      runtimeModelSelectionCatalog: vi.fn(async () => ({ offeredModels: [{ model_identifier: "gpt-5" }] })) };
    const availability = new ModelAvailabilityService(catalog as never, { getProviderById: vi.fn() } as never);
    const selection = new RunModelSelectionService(catalog as never, availability);
    await expect(selection.storedModelOffer({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "gpt-5" })).resolves.toBe("offered");
    await expect(selection.storedModelOffer({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gone" })).resolves.toBe("not_offered");
    expect(catalog.ensureProviderModelCatalog).not.toHaveBeenCalled();
  });
});

describe("G-5 speaks only for an agent that exists (SR-015 R2)", () => {
  it("a missing definition, or a failed read, skips the check: the path's own not-found answer stands", async () => {
    const storedModels = { storedModelOffer: vi.fn(async () => "not_offered" as const) };
    const input = { agentDefinitionId: "retired-def", agentName: "pm", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "gone" };
    await expect(storedModelStartRefusal({ agentDefinitions: { getAgentDefinitionById: async () => null }, storedModels }, input)).resolves.toBeNull();
    await expect(storedModelStartRefusal({ agentDefinitions: { getAgentDefinitionById: async () => { throw new Error("unreadable"); } },
      storedModels }, input)).resolves.toBeNull();
    expect(storedModels.storedModelOffer).not.toHaveBeenCalled();
    await expect(storedModelStartRefusal({ agentDefinitions: EXISTING_AGENT_DEFINITIONS, storedModels }, input))
      .resolves.toMatchObject({ code: "RUN_MODEL_NOT_OFFERED" });
  });
});
