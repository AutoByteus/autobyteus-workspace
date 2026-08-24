import { parseHostScopedLlmModelIdentifier } from "autobyteus-ts/llm/models.js";
import { parseOpenAICompatibleEndpointModelIdentifier } from "autobyteus-ts/llm/openai-compatible-endpoint-model.js";
import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";

export type RequireCurrentAutoByteusModelIdentifier = (
  modelIdentifier: string,
) => Promise<void>;
export type EnsureAutoByteusModelAvailable = (
  modelIdentifier: string,
) => Promise<void>;

export class ApplicationModelAvailabilityError extends Error {
  constructor(readonly modelIdentifier: string) {
    super(`Model '${modelIdentifier}' is unavailable for the AutoByteus runtime.`);
    this.name = "ApplicationModelAvailabilityError";
  }
}

export class ApplicationCurrentModelSelectionPolicy {
  constructor(private readonly dependencies: {
    requireCurrentAutoByteusModelIdentifier: RequireCurrentAutoByteusModelIdentifier;
    ensureAutoByteusModelAvailable: EnsureAutoByteusModelAvailable;
  }) {}

  normalizeRuntimeKind(value: unknown): RuntimeKind | null {
    const hasExplicitValue = typeof value === "string" && value.trim().length > 0;
    return runtimeKindFromString(
      value,
      hasExplicitValue ? null : RuntimeKind.AUTOBYTEUS,
    );
  }

  async requireCurrentSelection(input: {
    runtimeKind: unknown;
    llmModelIdentifier: string;
  }): Promise<RuntimeKind> {
    const runtimeKind = this.normalizeRuntimeKind(input.runtimeKind);
    if (!runtimeKind) {
      throw new Error(`Unsupported application runtimeKind '${String(input.runtimeKind)}'.`);
    }
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
      const modelIdentifier = input.llmModelIdentifier.trim();
      const isDynamic = parseOpenAICompatibleEndpointModelIdentifier(modelIdentifier) !== null
        || parseHostScopedLlmModelIdentifier(modelIdentifier) !== null;
      if (isDynamic) {
        try {
          await this.dependencies.ensureAutoByteusModelAvailable(modelIdentifier);
        } catch {
          throw new ApplicationModelAvailabilityError(modelIdentifier);
        }
      } else {
        await this.dependencies.requireCurrentAutoByteusModelIdentifier(modelIdentifier);
      }
    }
    return runtimeKind;
  }
}
