import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationLaunchIssue,
} from "@autobyteus/application-sdk-contracts";
import { CurrentModelSelectionRequiredError } from "autobyteus-ts/llm/index.js";
import type { ModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import type {
  ApplicationProviderCredentialReadinessPort,
} from "./application-provider-credential-readiness-adapter.js";
import type {
  ApplicationCurrentModelSelectionPolicy,
} from "./application-current-model-selection-policy.js";
import { ApplicationModelAvailabilityError } from "./application-current-model-selection-policy.js";

type RuntimeAvailabilityReader = Pick<
  RuntimeAvailabilityService,
  "getRuntimeAvailability"
>;
type ModelCatalogReader = Pick<ModelCatalogService, "listLlmModels">;

const issue = (
  configuration: ApplicationEffectiveLaunchConfiguration,
  leaf: ApplicationEffectiveLaunchConfiguration["leaves"][number],
  code: ApplicationLaunchIssue["code"],
  message: string,
): ApplicationLaunchIssue => ({
  severity: "blocking",
  scope: "HOST_CAPABILITY",
  code,
  slotKey: configuration.slotKey,
  memberAddress: leaf.memberAddress,
  message,
});

export class ApplicationLaunchHostCapabilityValidator {
  constructor(private readonly dependencies: {
    runtimeAvailabilityService: RuntimeAvailabilityReader;
    modelCatalogService: ModelCatalogReader;
    providerCredentialReadiness: ApplicationProviderCredentialReadinessPort;
    currentModelSelectionPolicy: ApplicationCurrentModelSelectionPolicy;
  }) {}

  async validate(
    configuration: ApplicationEffectiveLaunchConfiguration,
  ): Promise<ApplicationLaunchIssue[]> {
    const issues: ApplicationLaunchIssue[] = [];
    const credentialByAuthority = new Map<
      string,
      Awaited<ReturnType<ApplicationProviderCredentialReadinessPort["getReadiness"]>>
    >();
    for (const leaf of configuration.leaves) {
      const runtimeKind = this.dependencies.currentModelSelectionPolicy
        .normalizeRuntimeKind(leaf.runtimeKind);
      if (!runtimeKind) {
        issues.push(issue(
          configuration,
          leaf,
          "RUNTIME_UNAVAILABLE",
          `Runtime '${leaf.runtimeKind}' is not registered for '${this.describeLeaf(leaf)}'.`,
        ));
        continue;
      }
      const availability = this.dependencies.runtimeAvailabilityService
        .getRuntimeAvailability(runtimeKind);
      if (!availability.enabled) {
        issues.push(issue(
          configuration,
          leaf,
          "RUNTIME_UNAVAILABLE",
          availability.reason
            ?? `Runtime '${leaf.runtimeKind}' is unavailable for '${this.describeLeaf(leaf)}'.`,
        ));
        continue;
      }

      try {
        await this.dependencies.currentModelSelectionPolicy.requireCurrentSelection({
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
        issues.push(issue(
          configuration,
          leaf,
          error instanceof CurrentModelSelectionRequiredError
            ? "CURRENT_MODEL_SELECTION_REQUIRED"
            : "MODEL_UNAVAILABLE",
          error.message,
        ));
        continue;
      }

      let models;
      try {
        models = await this.dependencies.modelCatalogService.listLlmModels(runtimeKind);
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        issues.push(issue(
          configuration,
          leaf,
          "RUNTIME_AUTHENTICATION_UNAVAILABLE",
          `Runtime '${runtimeKind}' could not provide its authenticated model catalog: ${failure.message}`,
        ));
        continue;
      }
      const modelIdentifier = leaf.llmModelIdentifier.trim();
      const model = models.find((candidate) =>
        candidate.model_identifier === modelIdentifier);
      if (!model) {
        issues.push(issue(
          configuration,
          leaf,
          "MODEL_UNAVAILABLE",
          `Model '${leaf.llmModelIdentifier}' is unavailable for runtime '${runtimeKind}' and '${this.describeLeaf(leaf)}'.`,
        ));
        continue;
      }
      const workspaceRootPath = leaf.workspaceRootPath?.trim() ?? "";
      if (!workspaceRootPath) {
        issues.push(issue(
          configuration,
          leaf,
          "RUNTIME_UNAVAILABLE",
          `Application runtime workspace is unavailable for '${this.describeLeaf(leaf)}'.`,
        ));
        continue;
      }
      const authority = this.dependencies.providerCredentialReadiness.resolveAuthority({
        runtimeKind,
        model,
        workspaceRootPath,
      });
      const credentialKey = this.dependencies.providerCredentialReadiness
        .getAuthorityCacheKey(authority);
      let credential = credentialKey
        ? credentialByAuthority.get(credentialKey)
        : undefined;
      if (!credential) {
        credential = await this.dependencies.providerCredentialReadiness
          .getReadiness(authority);
        if (credentialKey) credentialByAuthority.set(credentialKey, credential);
      }
      if (!credential.configured) {
        issues.push(issue(
          configuration,
          leaf,
          "RUNTIME_AUTHENTICATION_UNAVAILABLE",
          credential.reason
            ?? `Authentication is unavailable for runtime '${runtimeKind}'.`,
        ));
      }
    }
    return issues;
  }

  private describeLeaf(
    leaf: ApplicationEffectiveLaunchConfiguration["leaves"][number],
  ): string {
    return leaf.memberAddress
      ? `team member ${leaf.memberAddress}`
      : `agent ${leaf.agentDefinitionId}`;
  }
}
