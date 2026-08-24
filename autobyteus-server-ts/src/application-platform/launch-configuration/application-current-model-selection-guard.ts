import type { ApplicationEffectiveLaunchConfiguration } from "@autobyteus/application-sdk-contracts";
import { CurrentModelSelectionRequiredError } from "autobyteus-ts/llm/index.js";
import { ApplicationLaunchConfigurationError } from "./application-launch-configuration-diagnostics.js";
import {
  ApplicationModelAvailabilityError,
  type ApplicationCurrentModelSelectionPolicy,
} from "./application-current-model-selection-policy.js";

export const requireApplicationCurrentModelSelections = async (
  policy: ApplicationCurrentModelSelectionPolicy,
  configuration: ApplicationEffectiveLaunchConfiguration,
): Promise<void> => {
  const issues = [];
  for (const leaf of configuration.leaves) {
    const runtimeKind = policy.normalizeRuntimeKind(leaf.runtimeKind);
    if (!runtimeKind) continue;
    try {
      await policy.requireCurrentSelection({
        runtimeKind,
        llmModelIdentifier: leaf.llmModelIdentifier,
      });
    } catch (error) {
      if (
        !(error instanceof CurrentModelSelectionRequiredError)
        && !(error instanceof ApplicationModelAvailabilityError)
      ) {
        throw error;
      }
      issues.push({
        severity: "blocking" as const,
        scope: "HOST_CAPABILITY" as const,
        code: error instanceof CurrentModelSelectionRequiredError
          ? "CURRENT_MODEL_SELECTION_REQUIRED" as const
          : "MODEL_UNAVAILABLE" as const,
        slotKey: configuration.slotKey,
        memberAddress: leaf.memberAddress,
        message: error.message,
      });
    }
  }
  if (issues.length > 0) {
    throw new ApplicationLaunchConfigurationError({
      status: "HOST_REQUIREMENT_MISSING",
      issues,
    });
  }
};
