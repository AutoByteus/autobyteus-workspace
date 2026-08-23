import type { ApplicationEffectiveLaunchConfiguration } from "@autobyteus/application-sdk-contracts";
import { CurrentModelSelectionRequiredError } from "autobyteus-ts/llm/index.js";
import { describe, expect, it, vi } from "vitest";
import { ApplicationCurrentModelSelectionPolicy } from "../../../src/application-platform/launch-configuration/application-current-model-selection-policy.js";
import { ApplicationLaunchHostCapabilityValidator } from "../../../src/application-platform/launch-configuration/application-launch-host-capability-validator.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const configuration = (runtimeKind: string, llmModelIdentifier: string): ApplicationEffectiveLaunchConfiguration => ({
  slotKey: "draftingTeam",
  executionResourceRef: { source: "bundle", kind: "AGENT", localId: "researcher" },
  resourceDefinitionId: "agent-definition-1",
  resourceKind: "AGENT",
  leaves: [{
    memberAddress: null,
    displayName: "Researcher",
    agentDefinitionId: "agent-definition-1",
    runtimeKind,
    llmModelIdentifier,
    llmConfig: null,
    workspaceRootPath: "/runtime/app",
    provenance: {
      runtimeKind: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: "agent-definition-1" },
      llmModelIdentifier: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: "agent-definition-1" },
      llmConfig: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: "agent-definition-1" },
      workspaceRootPath: "APPLICATION_RUNTIME",
    },
  }],
});

describe("ApplicationLaunchHostCapabilityValidator current model readiness", () => {
  it("retains a stale AutoByteus leaf and returns the exact blocking readiness issue before catalog or credential checks", async () => {
    const listLlmModels = vi.fn(async () => []);
    const getReadiness = vi.fn(async () => ({ configured: true, reason: null }));
    const policy = new ApplicationCurrentModelSelectionPolicy({
      requireCurrentAutoByteusModelIdentifier: async (modelIdentifier) => {
        throw new CurrentModelSelectionRequiredError(modelIdentifier);
      },
    });
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: policy,
      runtimeAvailabilityService: {
        getRuntimeAvailability: (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }),
      },
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: { getReadiness },
    });

    await expect(validator.validate(configuration("autobyteus", "removed-model")))
      .resolves.toEqual([{
        severity: "blocking",
        scope: "HOST_CAPABILITY",
        code: "CURRENT_MODEL_SELECTION_REQUIRED",
        slotKey: "draftingTeam",
        memberAddress: null,
        message: "The selected model is no longer supported. Select a current supported model.",
      }]);
    expect(listLlmModels).not.toHaveBeenCalled();
    expect(getReadiness).not.toHaveBeenCalled();
  });

  it.each([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK])(
    "keeps %s model ownership in the existing runtime catalog and credential checks",
    async (runtimeKind) => {
      const requireCurrentAutoByteusModelIdentifier = vi.fn(async () => undefined);
      const listLlmModels = vi.fn(async () => [{
        model_identifier: "provider-owned-model",
        provider_id: "provider-1",
      }] as never);
      const getReadiness = vi.fn(async () => ({ configured: true, reason: null }));
      const validator = new ApplicationLaunchHostCapabilityValidator({
        currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
          requireCurrentAutoByteusModelIdentifier,
        }),
        runtimeAvailabilityService: {
          getRuntimeAvailability: (kind) => ({ runtimeKind: kind, enabled: true, reason: null }),
        },
        modelCatalogService: { listLlmModels },
        providerCredentialReadiness: { getReadiness },
      });

      await expect(validator.validate(configuration(runtimeKind, "provider-owned-model")))
        .resolves.toEqual([]);
      expect(requireCurrentAutoByteusModelIdentifier).not.toHaveBeenCalled();
      expect(listLlmModels).toHaveBeenCalledWith(runtimeKind);
      expect(getReadiness).toHaveBeenCalledOnce();
    },
  );
});
