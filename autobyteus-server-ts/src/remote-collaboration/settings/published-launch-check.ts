import fs from "node:fs/promises";
import path from "node:path";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import type { PublishedAgentLaunchSettings } from "../domain/published-agent.js";

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * Whether a published Agent's launch settings can run on this node now (REQ-103, REQ-109 "cannot run there"):
 * the workspace is an existing absolute directory, the runtime is available and the model with its settings
 * is offered there (the existing runtime availability and model selection checks). `null` when it can run,
 * otherwise the reason.
 */
export class PublishedLaunchCheck {
  constructor(private readonly dependencies: Readonly<{
    availability: Pick<RuntimeAvailabilityService, "getRuntimeAvailability">;
    validator: Pick<RunModelSelectionValidator, "validate">;
  }>) {}

  async reasonItCannotRun(launch: PublishedAgentLaunchSettings): Promise<string | null> {
    const workspace = launch.workspaceRootPath;
    if (!path.isAbsolute(workspace)) return `The workspace '${workspace}' is not an absolute path.`;
    const stat = await fs.stat(workspace).catch(() => null);
    if (!stat?.isDirectory()) return `The workspace '${workspace}' is not a folder on this node.`;
    try {
      const availability = await this.dependencies.availability.getRuntimeAvailability(launch.runtimeKind);
      if (!availability.enabled) return availability.reason ?? `The runtime '${launch.runtimeKind}' is not available.`;
    } catch (error) {
      return `The runtime '${launch.runtimeKind}' could not be checked: ${messageOf(error)}`;
    }
    let result;
    try {
      result = await this.dependencies.validator.validate({
        context: { runtimeKind: launch.runtimeKind, currentModelIdentifier: launch.llmModelIdentifier, workspaceRootPath: workspace },
        selection: { llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig },
      });
    } catch (error) {
      return `The model could not be checked: ${messageOf(error)}`;
    }
    switch (result.kind) {
      case "valid": return null;
      case "model_unavailable": return `The model '${launch.llmModelIdentifier}' is not available on ${launch.runtimeKind}.`;
      case "schema_unavailable": return `The settings of model '${launch.llmModelIdentifier}' could not be checked.`;
      case "invalid": return `The model settings are invalid: ${result.errors.map((error) => error.message).join("; ")}`;
    }
  }
}
