import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";

export type RequireCurrentAutoByteusModelIdentifier = (
  modelIdentifier: string,
) => Promise<void>;

export class ApplicationCurrentModelSelectionPolicy {
  constructor(private readonly dependencies: {
    requireCurrentAutoByteusModelIdentifier: RequireCurrentAutoByteusModelIdentifier;
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
      await this.dependencies.requireCurrentAutoByteusModelIdentifier(
        input.llmModelIdentifier,
      );
    }
    return runtimeKind;
  }
}
