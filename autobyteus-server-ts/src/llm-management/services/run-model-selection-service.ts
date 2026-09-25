import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { RunModelConfigFieldError } from "../../run-history/domain/run-model-config.js";
import type { RunModelOptions, RunModelSelection, RunModelSelectionContext } from "../domain/run-model-selection.js";
import { isContextCapacity, type RuntimeModelCapacities } from "../domain/runtime-model-capacity.js";
import type { ModelCatalogService } from "./model-catalog-service.js";
import { validateModelConfigSchema } from "./model-config-schema-validation.js";
import { RuntimeModelCapacityService } from "./runtime-model-capacity-service.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { toAgyDiscoveryDiagnostic, type AgyDiscoveryDiagnostic } from "../../runtime-management/antigravity-cli-capability.js";

export type RunModelSelectionValidationResult =
  | Readonly<{ kind: "valid"; selection: RunModelSelection }>
  | Readonly<{ kind: "model_unavailable"; catalogDiagnostic?: AgyDiscoveryDiagnostic }>
  | Readonly<{ kind: "schema_unavailable" }>
  | Readonly<{ kind: "invalid"; errors: readonly RunModelConfigFieldError[] }>;
type SelectionInput = { context: RunModelSelectionContext; selection: { llmModelIdentifier: string; llmConfig: unknown } };
type SelectionEvidence = {
  catalog: Pick<ModelCatalogService, "listLlmModels">;
  capacity: Pick<RuntimeModelCapacityService, "resolveMany">;
};
export type RunModelSelectionValidator = Pick<RunModelSelectionService, "validate" | "validateMany">;
const tokens = (capacities: RuntimeModelCapacities, id: string): number | null => {
  const value = capacities[id];
  return value?.kind === "known" && isContextCapacity(value.tokens) ? value.tokens : null;
};
export class RunModelSelectionService {
  constructor(
    private readonly catalog: Pick<ModelCatalogService, "listLlmModels">,
    private readonly capacity: Pick<RuntimeModelCapacityService, "resolveMany"> = new RuntimeModelCapacityService(),
  ) {
    if (!catalog || typeof catalog.listLlmModels !== "function") throw new Error("Model catalog is required.");
  }
  async validate(input: SelectionInput): Promise<RunModelSelectionValidationResult> {
    return this.validateWithEvidence(input, { catalog: this.catalog, capacity: this.capacity });
  }
  private async validateWithEvidence(input: SelectionInput, evidence: SelectionEvidence): Promise<RunModelSelectionValidationResult> {
    const { context, selection } = input;
    const invalid = (message: string): RunModelSelectionValidationResult =>
      ({ kind: "invalid", errors: [{ path: "llmModelIdentifier", message }] });
    if (typeof selection.llmModelIdentifier !== "string" || !selection.llmModelIdentifier.trim()) return invalid("Select a model.");
    let models: ModelInfo[];
    try { models = await evidence.catalog.listLlmModels(context.runtimeKind, context.workspaceRootPath); }
    catch (error) { return context.runtimeKind === RuntimeKind.ANTIGRAVITY_CLI
      ? { kind: "model_unavailable", catalogDiagnostic: toAgyDiscoveryDiagnostic(error) }
      : { kind: "model_unavailable" }; }
    const model = models.find((row) => row.model_identifier === selection.llmModelIdentifier);
    if (!model) return { kind: "model_unavailable" };
    if (selection.llmModelIdentifier !== context.currentModelIdentifier) {
      let capacities: RuntimeModelCapacities;
      try { capacities = await evidence.capacity.resolveMany(context, models.filter((row) =>
        row.model_identifier === context.currentModelIdentifier || row.model_identifier === selection.llmModelIdentifier)); }
      catch { return invalid("Runtime context capacity lookup unavailable."); }
      const current = tokens(capacities, context.currentModelIdentifier);
      const target = tokens(capacities, selection.llmModelIdentifier);
      if (current === null || target === null) return invalid("Both models need verified context capacities before replacement.");
      if (target < current) return invalid("The replacement model must have at least the current model's context capacity.");
    }
    const result = validateModelConfigSchema(model, selection.llmConfig);
    return result.kind === "valid" ? { kind: "valid", selection: { llmModelIdentifier: model.model_identifier, llmConfig: result.config } } : result;
  }
  /** Fresh, request-local evidence shared across configured scopes, never across Saves. */
  async validateMany(inputs: readonly Parameters<RunModelSelectionService["validate"]>[0][]): Promise<RunModelSelectionValidationResult[]> {
    const idsByContext = new Map<string, Set<string>>();
    for (const { context, selection } of inputs) {
      if (context.currentModelIdentifier === selection.llmModelIdentifier) continue;
      const key = this.contextKey(context.runtimeKind, context.workspaceRootPath);
      if (!idsByContext.has(key)) idsByContext.set(key, new Set());
      idsByContext.get(key)!.add(context.currentModelIdentifier).add(selection.llmModelIdentifier);
    }
    const operation = this.withSharedEvidence(idsByContext);
    return Promise.all(inputs.map((input) => this.validateWithEvidence(input, operation)));
  }

  async listOptionsMany(contexts: readonly RunModelSelectionContext[]): Promise<RunModelOptions[]> {
    const operation = this.withSharedEvidence();
    return Promise.all(contexts.map((context) => this.optionsWithEvidence(context, operation)));
  }

  private contextKey(runtime: string | null | undefined, cwd: string | undefined): string {
    return JSON.stringify([runtime ?? "", cwd ?? ""]);
  }

  private withSharedEvidence(idsByContext?: ReadonlyMap<string, ReadonlySet<string>>): SelectionEvidence {
    const catalogs = new Map<string, Promise<ModelInfo[]>>();
    const capacities = new Map<string, Promise<RuntimeModelCapacities>>();
    return { catalog: {
      listLlmModels: (runtime, cwd) => {
        const key = this.contextKey(runtime, cwd);
        if (!catalogs.has(key)) catalogs.set(key, this.catalog.listLlmModels(runtime, cwd));
        return catalogs.get(key)!;
      },
    }, capacity: {
      resolveMany: async (context) => {
        const key = this.contextKey(context.runtimeKind, context.workspaceRootPath);
        if (!capacities.has(key)) {
          capacities.set(key, (async () => {
            const models = await catalogs.get(key)!;
            const ids = idsByContext?.get(key);
            return this.capacity.resolveMany(context, ids ? models.filter((model) => ids.has(model.model_identifier)) : models);
          })());
        }
        return capacities.get(key)!;
      },
    } };
  }

  async listOptions(context: RunModelSelectionContext): Promise<RunModelOptions> {
    return this.optionsWithEvidence(context, { catalog: this.catalog, capacity: this.capacity });
  }
  private async optionsWithEvidence(context: RunModelSelectionContext, evidence: SelectionEvidence): Promise<RunModelOptions> {
    const unavailable = (reason: string): RunModelOptions => ({ currentModelIdentifier: context.currentModelIdentifier,
      currentContextTokens: null, replacements: [], unavailableReason: reason });
    try {
      const models = await evidence.catalog.listLlmModels(context.runtimeKind, context.workspaceRootPath);
      const capacities = await evidence.capacity.resolveMany(context, models);
      const current = tokens(capacities, context.currentModelIdentifier);
      if (current === null) return unavailable("The current model's context capacity could not be verified. Its settings can still be edited.");
      return { currentModelIdentifier: context.currentModelIdentifier, currentContextTokens: current,
        replacements: models.flatMap((model) => {
          const capacity = tokens(capacities, model.model_identifier);
          return model.model_identifier !== context.currentModelIdentifier && capacity !== null && capacity >= current
            ? [{ llmModelIdentifier: model.model_identifier, contextTokens: capacity }] : [];
        }), unavailableReason: null };
    } catch { return unavailable("Runtime context capacity lookup unavailable. Current-model settings remain available."); }
  }
}
