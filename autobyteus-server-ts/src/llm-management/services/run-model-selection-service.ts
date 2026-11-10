import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { RunModelConfigFieldError } from "../../run-history/domain/run-model-config.js";
import type { RunModelChoice, RunModelOptions, RunModelSelection, RunModelSelectionContext, RunModelValidationContext } from "../domain/run-model-selection.js";
import type { ModelCatalogService, RuntimeModelSelectionCatalog } from "./model-catalog-service.js";
import type { ModelInfoWithSelectionPresentation } from "../domain/model-selection-presentation.js";
import { validateModelConfigSchema } from "./model-config-schema-validation.js";
import { NativeModelCapacityService } from "./native-model-capacity.js";
import { RuntimeKind, isExternalProviderRuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { modelListUnreadableText } from "./run-model-selection-refusal.js";
import { toAgyDiscoveryDiagnostic, type AgyDiscoveryDiagnostic } from "../../runtime-management/antigravity-cli-capability.js";
import { toGrokBuildDiagnostic, type GrokBuildDiagnostic } from "../../runtime-management/grok/grok-build-capability.js";
import {
  toDeepSeekHarnessDiagnostic,
  type DeepSeekHarnessDiagnostic,
} from "../../runtime-management/deepseek-harness/deepseek-harness-capability.js";

type CatalogDiagnostic = AgyDiscoveryDiagnostic | GrokBuildDiagnostic | DeepSeekHarnessDiagnostic;

/**
 * `model_unavailable`: the runtime's current list does not contain the model. `model_list_unavailable`: the list could not
 * be read, so nothing is known about the model; `catalogDiagnostic` is the runtime's own reason where it has one.
 */
export type RunModelSelectionValidationResult =
  | Readonly<{ kind: "valid"; selection: RunModelSelection }>
  | Readonly<{ kind: "model_unavailable" }>
  | Readonly<{ kind: "model_list_unavailable"; catalogDiagnostic?: CatalogDiagnostic }>
  | Readonly<{ kind: "schema_unavailable" }>
  | Readonly<{ kind: "invalid"; errors: readonly RunModelConfigFieldError[] }>;
type SelectionInput = { context: RunModelValidationContext; selection: { llmModelIdentifier: string; llmConfig: unknown } };
type SelectionEvidence = {
  catalog: Pick<ModelCatalogService, "runtimeModelSelectionCatalog">;
  nativeCapacity: Pick<NativeModelCapacityService, "resolveMany">;
};
export type RunModelSelectionValidator = Pick<RunModelSelectionService, "validate" | "validateMany">;

const catalogDiagnosticOf = (runtimeKind: RuntimeKind, error: unknown): { catalogDiagnostic?: CatalogDiagnostic } =>
  runtimeKind === RuntimeKind.ANTIGRAVITY_CLI ? { catalogDiagnostic: toAgyDiscoveryDiagnostic(error) }
    : runtimeKind === RuntimeKind.GROK_BUILD ? { catalogDiagnostic: toGrokBuildDiagnostic(error) }
      : runtimeKind === RuntimeKind.DEEPSEEK_HARNESS ? { catalogDiagnostic: toDeepSeekHarnessDiagnostic(error) }
        : {};
type CatalogRead = Readonly<{ catalog: RuntimeModelSelectionCatalog }> | Readonly<{ catalogDiagnostic?: CatalogDiagnostic }>;
/** The one read-failure classification: validation and options both treat any thrown catalog read as "list unreadable". */
const readCatalog = async (
  evidence: SelectionEvidence,
  context: Pick<RunModelValidationContext, "runtimeKind" | "workspaceRootPath">,
): Promise<CatalogRead> => {
  try { return { catalog: await evidence.catalog.runtimeModelSelectionCatalog(context.runtimeKind, context.workspaceRootPath) }; }
  catch (error) { return catalogDiagnosticOf(context.runtimeKind, error); }
};
const invalid = (message: string): RunModelSelectionValidationResult =>
  ({ kind: "invalid", errors: [{ path: "llmModelIdentifier", message }] });
const toChoice = (model: ModelInfo): RunModelChoice => ({
  llmModelIdentifier: model.model_identifier,
  providerName: model.provider_name,
  displayName: model.display_name,
  canonicalName: model.canonical_name,
  description: model.description ?? null,
  configSchema: model.config_schema ?? null,
  recommended: (model as ModelInfoWithSelectionPresentation).selection_presentation?.recommended ?? false,
});

export class RunModelSelectionService {
  constructor(
    private readonly catalog: Pick<ModelCatalogService, "runtimeModelSelectionCatalog">,
    private readonly nativeCapacity: Pick<NativeModelCapacityService, "resolveMany"> = new NativeModelCapacityService(),
  ) {
    if (!catalog || typeof catalog.runtimeModelSelectionCatalog !== "function") throw new Error("Model catalog is required.");
  }

  async validate(input: SelectionInput): Promise<RunModelSelectionValidationResult> {
    return this.validateWithEvidence(input, { catalog: this.catalog, nativeCapacity: this.nativeCapacity });
  }

  private async validateWithEvidence(input: SelectionInput, evidence: SelectionEvidence): Promise<RunModelSelectionValidationResult> {
    const { context, selection } = input;
    if (typeof selection.llmModelIdentifier !== "string" || !selection.llmModelIdentifier.trim()) return invalid("Select a model.");
    const read = await readCatalog(evidence, context);
    if (!("catalog" in read)) return { kind: "model_list_unavailable", ...read };
    const { catalog } = read;
    const unchanged = context.currentModelIdentifier !== null && selection.llmModelIdentifier === context.currentModelIdentifier;
    const model = unchanged ? catalog.findExactCurrent(selection.llmModelIdentifier)
      : catalog.offeredModels.find((row) => row.model_identifier === selection.llmModelIdentifier);
    if (!model) return { kind: "model_unavailable" };
    if (context.runtimeKind === RuntimeKind.AUTOBYTEUS && !unchanged && context.currentModelIdentifier !== null) {
      const capacities = evidence.nativeCapacity.resolveMany(catalog.offeredModels);
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
    const catalogs = new Map<string, Promise<RuntimeModelSelectionCatalog>>();
    return { catalog: {
      runtimeModelSelectionCatalog: (runtime, cwd) => {
        const key = this.contextKey(runtime, cwd);
        if (!catalogs.has(key)) catalogs.set(key, this.catalog.runtimeModelSelectionCatalog(runtime, cwd));
        return catalogs.get(key)!;
      },
    }, nativeCapacity: this.nativeCapacity };
  }

  async listOptions(context: RunModelSelectionContext): Promise<RunModelOptions> {
    return this.optionsWithEvidence(context, { catalog: this.catalog, nativeCapacity: this.nativeCapacity });
  }

  private async optionsWithEvidence(context: RunModelSelectionContext, evidence: SelectionEvidence): Promise<RunModelOptions> {
    const read = await readCatalog(evidence, context);
    if (!("catalog" in read)) return { currentModelIdentifier: context.currentModelIdentifier, modelListReadable: false, currentModel: null,
      replacements: [], unavailableReason: modelListUnreadableText(context.runtimeKind, read.catalogDiagnostic?.message) };
    const { catalog } = read;
    const currentModel = catalog.findExactCurrent(context.currentModelIdentifier);
    const models = catalog.offeredModels;
    const answer = { currentModelIdentifier: context.currentModelIdentifier, modelListReadable: true,
      currentModel: currentModel ? toChoice(currentModel) : null };
    if (isExternalProviderRuntimeKind(context.runtimeKind)) return { ...answer,
      replacements: models.filter((model) => model.model_identifier !== context.currentModelIdentifier).map(toChoice),
      unavailableReason: null };
    const capacities = evidence.nativeCapacity.resolveMany(models);
    const current = capacities[context.currentModelIdentifier];
    if (current == null) return { ...answer, replacements: [],
      unavailableReason: "The current model's context capacity could not be verified. Its settings can still be edited." };
    return { ...answer,
      replacements: models.filter((model) => model.model_identifier !== context.currentModelIdentifier &&
        capacities[model.model_identifier] != null && capacities[model.model_identifier]! >= current).map(toChoice),
      unavailableReason: null };
  }
}
