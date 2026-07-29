import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationLaunchConfigurationService } from "../launch-configuration/application-launch-configuration-service.js";
import type { ApplicationExecutionResourceResolver } from "../../application-orchestration/services/application-execution-resource-resolver.js";
import type { SkillService } from "../../skills/services/skill-service.js";
import { ApplicationRuntimeDefinitionValidator } from "./application-runtime-definition-validator.js";

export class ApplicationSetupRequiredError extends Error {
  readonly code = "APPLICATION_SETUP_REQUIRED";

  constructor(readonly diagnostics: string[]) {
    super(`Application setup is required: ${diagnostics.join("; ")}`);
    this.name = "ApplicationSetupRequiredError";
  }
}

export class ApplicationDefinitionRuntimeReadiness {
  private readonly diagnosticsByApplicationId = new Map<string, string[]>();

  constructor(private readonly dependencies: {
    bundleService: ApplicationBundleService;
    agentDefinitionService: AgentDefinitionService;
    agentTeamDefinitionService: AgentTeamDefinitionService;
    configurationService: ApplicationLaunchConfigurationService;
    executionResourceResolver: ApplicationExecutionResourceResolver;
    skillService: Pick<SkillService, "resolveConfiguredSkillsForAgent">;
    activeApplicationIds?: ReadonlySet<string> | null;
  }) {}

  async prepare(): Promise<void> {
    await Promise.all([
      this.dependencies.agentDefinitionService.refreshCache(),
      this.dependencies.agentTeamDefinitionService.refreshCache(),
    ]);

    const applications = await this.dependencies.bundleService.listApplications();
    const activeApplications = this.dependencies.activeApplicationIds
      ? applications.filter((application) =>
          this.dependencies.activeApplicationIds!.has(application.id))
      : applications;
    const validator = new ApplicationRuntimeDefinitionValidator(this.dependencies);
    this.diagnosticsByApplicationId.clear();

    for (const application of activeApplications) {
      const diagnostics: string[] = [];
      for (const resource of application.bundleResources) {
        await validator.validateResource(
          resource.kind,
          resource.definitionId,
          `${application.localApplicationId}/${resource.localId}`,
          diagnostics,
        );
      }

      try {
        const launchView = await this.dependencies.configurationService
          .getApplicationLaunchConfigurationView(application.id);
        if (launchView.readiness.status !== "RUNNABLE") {
          diagnostics.push(...launchView.readiness.issues.map((entry) =>
            `${application.localApplicationId}/slot:${entry.slotKey}: ${entry.message}`));
        }
        for (const view of launchView.slots) {
          if (!view.effectiveConfiguration) continue;
          const resolved = await this.dependencies.executionResourceResolver
            .resolveExecutionResource(
              application.id,
              view.effectiveConfiguration.executionResourceRef,
            );
          await validator.validateResource(
            resolved.kind,
            resolved.definitionId,
            `${application.localApplicationId}/slot:${view.slot.slotKey}`,
            diagnostics,
          );
          validator.validateEffectiveLaunchConfiguration(
            view.effectiveConfiguration,
            `${application.localApplicationId}/slot:${view.slot.slotKey}`,
            diagnostics,
          );
        }
      } catch (error) {
        diagnostics.push(
          `${application.localApplicationId}: execution-resource readiness failed: `
          + `${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (diagnostics.length > 0) {
        this.diagnosticsByApplicationId.set(application.id, diagnostics);
      }
    }

    if (this.dependencies.activeApplicationIds && this.diagnosticsByApplicationId.size > 0) {
      throw new ApplicationSetupRequiredError(
        Array.from(this.diagnosticsByApplicationId.values()).flat(),
      );
    }
  }

  isApplicationReady(applicationId: string): boolean {
    return !this.diagnosticsByApplicationId.has(applicationId);
  }

  getDiagnosticsByApplicationId(): ReadonlyMap<string, readonly string[]> {
    return new Map(this.diagnosticsByApplicationId);
  }
}
