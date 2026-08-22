import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationLaunchIssue,
} from "@autobyteus/application-sdk-contracts";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { ModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import { runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import type {
  ApplicationProviderCredentialReadinessPort,
} from "./application-provider-credential-readiness-adapter.js";

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
  }) {}

  async validate(
    configuration: ApplicationEffectiveLaunchConfiguration,
  ): Promise<ApplicationLaunchIssue[]> {
    const issues: ApplicationLaunchIssue[] = [];
    const modelsByRuntime = new Map<string, ModelInfo[] | Error>();
    const credentialByRuntimeAndProvider = new Map<
      string,
      Awaited<ReturnType<ApplicationProviderCredentialReadinessPort["getReadiness"]>>
    >();
    for (const leaf of configuration.leaves) {
      const runtimeKind = runtimeKindFromString(leaf.runtimeKind);
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

      let models = modelsByRuntime.get(runtimeKind);
      if (!models) {
        try {
          models = await this.dependencies.modelCatalogService.listLlmModels(runtimeKind);
        } catch (error) {
          models = error instanceof Error ? error : new Error(String(error));
        }
        modelsByRuntime.set(runtimeKind, models);
      }
      if (models instanceof Error) {
        issues.push(issue(
          configuration,
          leaf,
          "RUNTIME_AUTHENTICATION_UNAVAILABLE",
          `Runtime '${runtimeKind}' could not provide its authenticated model catalog: ${models.message}`,
        ));
        continue;
      }
      const model = models.find((candidate) =>
        candidate.model_identifier === leaf.llmModelIdentifier);
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
      const credentialKey =
        `${runtimeKind}:${model.provider_id}:${workspaceRootPath}`;
      let credential = credentialByRuntimeAndProvider.get(credentialKey);
      if (!credential) {
        credential = await this.dependencies.providerCredentialReadiness.getReadiness({
          runtimeKind,
          model,
          workspaceRootPath,
        });
        credentialByRuntimeAndProvider.set(credentialKey, credential);
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
