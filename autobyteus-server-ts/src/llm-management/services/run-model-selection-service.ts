import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { RunModelConfigFieldError } from "../../run-history/domain/run-model-config.js";
import type { RunModelOptions, RunModelSelection, RunModelSelectionContext } from "../domain/run-model-selection.js";
import type { ModelCatalogService } from "./model-catalog-service.js";
import { validateModelConfigSchema } from "./model-config-schema-validation.js";
import { NativeModelCapacityService } from "./native-model-capacity.js";
import { RuntimeKind, isExternalProviderRuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { toAgyDiscoveryDiagnostic, type AgyDiscoveryDiagnostic } from "../../runtime-management/antigravity-cli-capability.js";

export type RunModelSelectionValidationResult =
  | Readonly<{ kind: "valid"; selection: RunModelSelection }>
  | Readonly<{ kind: "model_unavailable"; catalogDiagnostic?: AgyDiscoveryDiagnostic }>
  | Readonly<{ kind: "schema_unavailable" }>
  | Readonly<{ kind: "invalid"; errors: readonly RunModelConfigFieldError[] }>;
type SelectionInput = { context: RunModelSelectionContext; selection: { llmModelIdentifier: string; llmConfig: unknown } };
type SelectionEvidence = {
  catalog: Pick<ModelCatalogService, "listLlmModels">;
  nativeCapacity: Pick<NativeModelCapacityService, "resolveMany">;
};
export type RunModelSelectionValidator = Pick<RunModelSelectionService, "validate" | "validateMany">;

const supportedRuntime = (kind: RuntimeKind): boolean => kind === RuntimeKind.AUTOBYTEUS || isExternalProviderRuntimeKind(kind);
const invalid = (message: string): RunModelSelectionValidationResult =>
  ({ kind: "invalid", errors: [{ path: "llmModelIdentifier", message }] });

export class RunModelSelectionService {
  constructor(
    private readonly catalog: Pick<ModelCatalogService, "listLlmModels">,
    private readonly nativeCapacity: Pick<NativeModelCapacityService, "resolveMany"> = new NativeModelCapacityService(),
  ) {
    if (!catalog || typeof catalog.listLlmModels !== "function") throw new Error("Model catalog is required.");
  }

  async validate(input: SelectionInput): Promise<RunModelSelectionValidationResult> {
    return this.validateWithEvidence(input, { catalog: this.catalog, nativeCapacity: this.nativeCapacity });
  }

  private async validateWithEvidence(input: SelectionInput, evidence: SelectionEvidence): Promise<RunModelSelectionValidationResult> {
    const { context, selection } = input;
    if (!supportedRuntime(context.runtimeKind)) return invalid("This runtime does not support stopped-run model replacement.");
    if (typeof selection.llmModelIdentifier !== "string" || !selection.llmModelIdentifier.trim()) return invalid("Select a model.");
    let models: ModelInfo[];
    try { models = await evidence.catalog.listLlmModels(context.runtimeKind, context.workspaceRootPath); }
    catch (error) { return context.runtimeKind === RuntimeKind.ANTIGRAVITY_CLI
      ? { kind: "model_unavailable", catalogDiagnostic: toAgyDiscoveryDiagnostic(error) }
      : { kind: "model_unavailable" }; }
    const model = models.find((row) => row.model_identifier === selection.llmModelIdentifier);
    if (!model) return { kind: "model_unavailable" };
    if (context.runtimeKind === RuntimeKind.AUTOBYTEUS && selection.llmModelIdentifier !== context.currentModelIdentifier) {
      const capacities = evidence.nativeCapacity.resolveMany(models);
      const current = capacities[context.currentModelIdentifier];
      const target = capacities[selection.llmModelIdentifier];
      if (current == null || target == null) return invalid("Both models need verified context capacities before replacement.");
      if (target < current) return invalid("The replacement model must have at least the current model's context capacity.");
    }
    const result = validateModelConfigSchema(model, selection.llmConfig);
    return result.kind === "valid" ? { kind: "valid", selection: { llmModelIdentifier: model.model_identifier, llmConfig: result.config } } : result;
  }

  /** Fresh, request-local catalog evidence shared across configured scopes, never across Saves. */
  async validateMany(inputs: readonly SelectionInput[]): Promise<RunModelSelectionValidationResult[]> {
    const evidence = this.withSharedCatalog();
    return Promise.all(inputs.map((input) => this.validateWithEvidence(input, evidence)));
  }

  async listOptionsMany(contexts: readonly RunModelSelectionContext[]): Promise<RunModelOptions[]> {
    const evidence = this.withSharedCatalog();
    return Promise.all(contexts.map((context) => this.optionsWithEvidence(context, evidence)));
  }

  private contextKey(runtime: string | null | undefined, cwd: string | undefined): string {
    return JSON.stringify([runtime ?? "", cwd ?? ""]);
  }

  private withSharedCatalog(): SelectionEvidence {
    const catalogs = new Map<string, Promise<ModelInfo[]>>();
    return { catalog: {
      listLlmModels: (runtime, cwd) => {
        const key = this.contextKey(runtime, cwd);
        if (!catalogs.has(key)) catalogs.set(key, this.catalog.listLlmModels(runtime, cwd));
        return catalogs.get(key)!;
      },
    }, nativeCapacity: this.nativeCapacity };
  }

  async listOptions(context: RunModelSelectionContext): Promise<RunModelOptions> {
    return this.optionsWithEvidence(context, { catalog: this.catalog, nativeCapacity: this.nativeCapacity });
  }

  private async optionsWithEvidence(context: RunModelSelectionContext, evidence: SelectionEvidence): Promise<RunModelOptions> {
    const unavailable = (reason: string): RunModelOptions => ({ currentModelIdentifier: context.currentModelIdentifier,
      replacements: [], unavailableReason: reason });
    if (!supportedRuntime(context.runtimeKind)) return unavailable("This runtime does not support stopped-run model replacement.");
    let models: ModelInfo[];
    try { models = await evidence.catalog.listLlmModels(context.runtimeKind, context.workspaceRootPath); }
    catch { return unavailable("Runtime model catalog is unavailable. Retry to load replacements; current-model settings remain available."); }
    if (isExternalProviderRuntimeKind(context.runtimeKind)) return {
      currentModelIdentifier: context.currentModelIdentifier,
      replacements: models.filter((model) => model.model_identifier !== context.currentModelIdentifier)
        .map((model) => ({ llmModelIdentifier: model.model_identifier })),
      unavailableReason: null,
    };
    const capacities = evidence.nativeCapacity.resolveMany(models);
    const current = capacities[context.currentModelIdentifier];
    if (current == null) return unavailable("The current model's context capacity could not be verified. Its settings can still be edited.");
    return { currentModelIdentifier: context.currentModelIdentifier,
      replacements: models.filter((model) => model.model_identifier !== context.currentModelIdentifier &&
        capacities[model.model_identifier] != null && capacities[model.model_identifier]! >= current)
        .map((model) => ({ llmModelIdentifier: model.model_identifier })),
      unavailableReason: null };
  }
}
