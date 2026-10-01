import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntryPlan } from "./collaborator-entry-builder.js";
import { CollaboratorAddError } from "./collaborator-errors.js";

type Placement = Readonly<{ plan: CollaboratorEntryPlan; launch: AgentLaunchConfiguration }>;

const placementsOf = (plan: CollaboratorEntryPlan): Placement[] => plan.kind === "agent"
  ? [{ plan, launch: plan.launchConfiguration }]
  : plan.members.map(() => ({ plan, launch: plan.defaultLaunchConfiguration }));

/**
 * Checks, before anything is committed, that every new collaborator placement (an Agent, or
 * each Team member) can run with the run's root settings: its runtime, model and model
 * settings in its workspace (REQ-008). One batch shares the catalog evidence.
 */
export class CollaboratorRunnabilityValidator {
  constructor(private readonly validator: RunModelSelectionValidator) {}

  async validate(plans: readonly CollaboratorEntryPlan[]): Promise<void> {
    const placements = plans.flatMap(placementsOf);
    if (placements.length === 0) return;
    let results;
    try {
      results = await this.validator.validateMany(placements.map(({ launch }) => ({
        context: {
          runtimeKind: launch.runtimeKind,
          currentModelIdentifier: launch.llmModelIdentifier,
          workspaceRootPath: launch.workspaceRootPath ?? process.cwd(),
        },
        selection: { llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig },
      })));
    } catch (error) {
      throw new CollaboratorAddError(placements[0]!.plan.name, `Its model could not be checked: ${error instanceof Error ? error.message : String(error)}`);
    }
    placements.forEach(({ plan, launch }, index) => {
      const result = results[index];
      if (!result) throw new CollaboratorAddError(plan.name, "Its model could not be checked.");
      if (result.kind === "valid") return;
      throw new CollaboratorAddError(plan.name, result.kind === "model_unavailable"
        ? `The model '${launch.llmModelIdentifier}' is not available on ${launch.runtimeKind}.`
        : result.kind === "schema_unavailable"
          ? `The settings of model '${launch.llmModelIdentifier}' could not be checked.`
          : `Its model settings are invalid: ${result.errors.map((error) => error.message).join("; ")}`);
    });
  }
}
