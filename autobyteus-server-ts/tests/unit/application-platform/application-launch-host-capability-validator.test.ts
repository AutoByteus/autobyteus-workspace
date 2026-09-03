import type { ApplicationEffectiveLaunchConfiguration } from "@autobyteus/application-sdk-contracts";
import { CurrentModelSelectionRequiredError } from "autobyteus-ts/llm/index.js";
import { LLMFactory } from "autobyteus-ts";
import { buildOpenAICompatibleEndpointModelIdentifier } from "autobyteus-ts/llm/openai-compatible-endpoint-model.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { describe, expect, it, vi } from "vitest";
import {
  ApplicationCurrentModelSelectionPolicy,
} from "../../../src/application-platform/launch-configuration/application-current-model-selection-policy.js";
import { ApplicationLaunchHostCapabilityValidator } from "../../../src/application-platform/launch-configuration/application-launch-host-capability-validator.js";
import type {
  ApplicationCredentialAuthority,
  ApplicationProviderCredentialReadinessPort,
} from "../../../src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const configuration = (
  leaves: Array<Readonly<{ runtimeKind: string; llmModelIdentifier: string; memberAddress?: string | null }>>,
): ApplicationEffectiveLaunchConfiguration => ({
  slotKey: "draftingTeam",
  executionResourceRef: { source: "bundle", kind: "AGENT", localId: "researcher" },
  resourceDefinitionId: "agent-definition-1",
  resourceKind: leaves.length === 1 ? "AGENT" : "AGENT_TEAM",
  ...(leaves.length === 1 ? {} : { teamScopes: [] }),
  leaves: leaves.map((leaf, index) => ({
    memberAddress: leaf.memberAddress ?? null,
    displayName: `Leaf ${index + 1}`,
    agentDefinitionId: `agent-definition-${index + 1}`,
    runtimeKind: leaf.runtimeKind,
    llmModelIdentifier: leaf.llmModelIdentifier,
    llmConfig: null,
    workspaceRootPath: "/runtime/app",
    provenance: {
      runtimeKind: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: `agent-definition-${index + 1}` },
      llmModelIdentifier: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: `agent-definition-${index + 1}` },
      llmConfig: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: `agent-definition-${index + 1}` },
      workspaceRootPath: "APPLICATION_RUNTIME",
    },
  })),
});

const credentialPort = (input?: {
  resolveAuthority?: ApplicationProviderCredentialReadinessPort["resolveAuthority"];
  getAuthorityCacheKey?: ApplicationProviderCredentialReadinessPort["getAuthorityCacheKey"];
}) => {
  const resolveAuthority = vi.fn(input?.resolveAuthority ?? (({ model }) => ({
    kind: "provider",
    providerId: model.provider_id,
  } as const)));
  const getAuthorityCacheKey = vi.fn(input?.getAuthorityCacheKey ?? ((authority) =>
    authority.kind === "provider" ? JSON.stringify([authority.kind, authority.providerId]) : null));
  const getReadiness = vi.fn(async () => ({ configured: true, reason: null }));
  return { resolveAuthority, getAuthorityCacheKey, getReadiness };
};

const enabledRuntimeAvailability = {
  getRuntimeAvailability: (runtimeKind: RuntimeKind) => ({
    runtimeKind,
    enabled: true,
    reason: null,
  }),
};

const model = (modelIdentifier: string, providerId: string, runtime: LLMRuntime) => ({
  model_identifier: modelIdentifier,
  provider_id: providerId,
  runtime,
}) as never;

describe("ApplicationLaunchHostCapabilityValidator current model readiness", () => {
  it("rejects exact stale Gemini 3.7 through the production current-model registry", async () => {
    const listLlmModels = vi.fn(async () => []);
    const credentials = credentialPort();
    LLMFactory.resetForTests();
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
        ensureAutoByteusModelAvailable: async () => undefined,
        requireCurrentAutoByteusModelIdentifier: (modelIdentifier) =>
          LLMFactory.requireCurrentModelIdentifier(modelIdentifier),
      }),
      runtimeAvailabilityService: enabledRuntimeAvailability,
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: credentials,
    });

    try {
      await expect(validator.validate(configuration([{
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "gemini-3.7-flash",
      }]))).resolves.toEqual([expect.objectContaining({
        code: "CURRENT_MODEL_SELECTION_REQUIRED",
        message: "The selected model is no longer supported. Select a current supported model.",
      })]);
      expect(listLlmModels).not.toHaveBeenCalled();
      expect(credentials.getReadiness).not.toHaveBeenCalled();
    } finally {
      LLMFactory.resetForTests();
    }
  });

  it("retains a stale static AutoByteus leaf and blocks before catalog or credential checks", async () => {
    const listLlmModels = vi.fn(async () => []);
    const credentials = credentialPort();
    const policy = new ApplicationCurrentModelSelectionPolicy({
      ensureAutoByteusModelAvailable: async () => undefined,
      requireCurrentAutoByteusModelIdentifier: async (modelIdentifier) => {
        throw new CurrentModelSelectionRequiredError(modelIdentifier);
      },
    });
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: policy,
      runtimeAvailabilityService: enabledRuntimeAvailability,
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: credentials,
    });

    await expect(validator.validate(configuration([{
      runtimeKind: "autobyteus",
      llmModelIdentifier: "removed-model",
    }]))).resolves.toEqual([expect.objectContaining({
      code: "CURRENT_MODEL_SELECTION_REQUIRED",
      message: "The selected model is no longer supported. Select a current supported model.",
    })]);
    expect(listLlmModels).not.toHaveBeenCalled();
    expect(credentials.getReadiness).not.toHaveBeenCalled();
  });

  it("maps dynamic selected-provider failure to MODEL_UNAVAILABLE before catalog or credentials", async () => {
    const modelIdentifier = buildOpenAICompatibleEndpointModelIdentifier("provider-a", "missing");
    const listLlmModels = vi.fn(async () => []);
    const credentials = credentialPort();
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
        ensureAutoByteusModelAvailable: async () => { throw new Error("private endpoint failure"); },
        requireCurrentAutoByteusModelIdentifier: async () => undefined,
      }),
      runtimeAvailabilityService: enabledRuntimeAvailability,
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: credentials,
    });

    await expect(validator.validate(configuration([{
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: modelIdentifier,
    }]))).resolves.toEqual([expect.objectContaining({
      code: "MODEL_UNAVAILABLE",
      message: `Model '${modelIdentifier}' is unavailable for the AutoByteus runtime.`,
    })]);
    expect(listLlmModels).not.toHaveBeenCalled();
    expect(credentials.getReadiness).not.toHaveBeenCalled();
  });

  it.each([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK])(
    "keeps %s model ownership in its runtime catalog and credential checks",
    async (runtimeKind) => {
      const ensureAutoByteusModelAvailable = vi.fn(async () => undefined);
      const requireCurrentAutoByteusModelIdentifier = vi.fn(async () => undefined);
      const listLlmModels = vi.fn(async () => [
        model("provider-owned-model", "provider-1", LLMRuntime.API),
      ]);
      const credentials = credentialPort();
      const validator = new ApplicationLaunchHostCapabilityValidator({
        currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
          ensureAutoByteusModelAvailable,
          requireCurrentAutoByteusModelIdentifier,
        }),
        runtimeAvailabilityService: enabledRuntimeAvailability,
        modelCatalogService: { listLlmModels },
        providerCredentialReadiness: credentials,
      });

      await expect(validator.validate(configuration([{
        runtimeKind,
        llmModelIdentifier: "provider-owned-model",
      }]))).resolves.toEqual([]);
      expect(ensureAutoByteusModelAvailable).not.toHaveBeenCalled();
      expect(requireCurrentAutoByteusModelIdentifier).not.toHaveBeenCalled();
      expect(listLlmModels).toHaveBeenCalledExactlyOnceWith(runtimeKind);
      expect(credentials.resolveAuthority).toHaveBeenCalledOnce();
      expect(credentials.getReadiness).toHaveBeenCalledOnce();
    },
  );

  it("ensures and resolves each dynamic leaf against a fresh exact model before advancing", async () => {
    const identifierA = buildOpenAICompatibleEndpointModelIdentifier("provider-a", "model-a");
    const identifierB = buildOpenAICompatibleEndpointModelIdentifier("provider-b", "model-b");
    const order: string[] = [];
    const ensureAutoByteusModelAvailable = vi.fn(async (identifier: string) => {
      order.push(`ensure:${identifier}`);
    });
    let listCall = 0;
    const listLlmModels = vi.fn(async () => {
      listCall += 1;
      const identifier = listCall === 1 ? identifierA : identifierB;
      const providerId = listCall === 1 ? "provider-a" : "provider-b";
      order.push(`list:${providerId}`);
      return [model(identifier, providerId, LLMRuntime.OPENAI_COMPATIBLE)];
    });
    const credentials = credentialPort({
      resolveAuthority: ({ model: resolvedModel }) => {
        order.push(`authority:${resolvedModel.provider_id}`);
        return { kind: "provider", providerId: resolvedModel.provider_id };
      },
    });
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
        ensureAutoByteusModelAvailable,
        requireCurrentAutoByteusModelIdentifier: async () => undefined,
      }),
      runtimeAvailabilityService: enabledRuntimeAvailability,
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: credentials,
    });

    await expect(validator.validate(configuration([
      { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: identifierA, memberAddress: "/a" },
      { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: identifierB, memberAddress: "/b" },
    ]))).resolves.toEqual([]);
    expect(order).toEqual([
      `ensure:${identifierA}`,
      "list:provider-a",
      "authority:provider-a",
      `ensure:${identifierB}`,
      "list:provider-b",
      "authority:provider-b",
    ]);
    expect(listLlmModels).toHaveBeenCalledTimes(2);
    expect(credentials.getReadiness).toHaveBeenCalledTimes(2);
  });

  it("caches only identical non-null credential authority keys", async () => {
    const identifiers = ["static-a", "static-b", "static-c"];
    const listLlmModels = vi.fn(async () => [
      model("static-a", "shared", LLMRuntime.API),
      model("static-b", "shared", LLMRuntime.API),
      model("static-c", "unsupported", "future-runtime" as LLMRuntime),
    ]);
    const credentials = credentialPort({
      resolveAuthority: ({ model: resolvedModel }): ApplicationCredentialAuthority =>
        resolvedModel.provider_id === "unsupported"
          ? { kind: "unsupported", runtime: resolvedModel.runtime }
          : { kind: "provider", providerId: resolvedModel.provider_id },
      getAuthorityCacheKey: (authority) => authority.kind === "provider"
        ? JSON.stringify([authority.kind, authority.providerId])
        : null,
    });
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
        ensureAutoByteusModelAvailable: async () => undefined,
        requireCurrentAutoByteusModelIdentifier: async () => undefined,
      }),
      runtimeAvailabilityService: enabledRuntimeAvailability,
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: credentials,
    });

    await expect(validator.validate(configuration(identifiers.map((llmModelIdentifier) => ({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier,
    }))))).resolves.toEqual([]);
    expect(credentials.getReadiness).toHaveBeenCalledTimes(2);
  });

  it("evaluates a Team scope as a mandatory readiness subject", async () => {
    const listLlmModels = vi.fn(async () => []);
    const credentials = credentialPort();
    const validator = new ApplicationLaunchHostCapabilityValidator({
      currentModelSelectionPolicy: new ApplicationCurrentModelSelectionPolicy({
        ensureAutoByteusModelAvailable: async () => undefined,
        requireCurrentAutoByteusModelIdentifier: async (identifier) => {
          if (identifier === "removed-team-default") {
            throw new CurrentModelSelectionRequiredError(identifier);
          }
        },
      }),
      runtimeAvailabilityService: enabledRuntimeAvailability,
      modelCatalogService: { listLlmModels },
      providerCredentialReadiness: credentials,
    });
    const base = configuration([{
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "leaf-model",
      memberAddress: "/researcher",
    }]);
    const teamConfiguration = {
      ...base,
      executionResourceRef: { source: "bundle", kind: "AGENT_TEAM", localId: "team" } as const,
      resourceKind: "AGENT_TEAM" as const,
      teamScopes: [{
        teamAddress: "/",
        displayName: "Root Team",
        teamDefinitionId: "team-def-1",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "removed-team-default",
        llmConfig: null,
        workspaceRootPath: "/runtime/app",
        provenance: {
          runtimeKind: { kind: "PACKAGE_TEAM_DEFAULT" as const, teamDefinitionId: "team-def-1" },
          llmModelIdentifier: { kind: "PACKAGE_TEAM_DEFAULT" as const, teamDefinitionId: "team-def-1" },
          llmConfig: null,
          workspaceRootPath: "APPLICATION_RUNTIME" as const,
        },
      }],
    };

    const issues = await validator.validate(teamConfiguration);

    expect(issues).toContainEqual(expect.objectContaining({
      code: "CURRENT_MODEL_SELECTION_REQUIRED",
      memberAddress: "/",
    }));
  });
});
