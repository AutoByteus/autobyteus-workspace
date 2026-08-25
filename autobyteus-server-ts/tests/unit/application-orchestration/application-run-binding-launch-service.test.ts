import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationStartAgentInput,
  ApplicationStartAgentTeamInput,
} from "@autobyteus/application-sdk-contracts";
import { CurrentModelSelectionRequiredError } from "autobyteus-ts/llm/index.js";
import { buildOpenAICompatibleEndpointModelIdentifier } from "autobyteus-ts/llm/openai-compatible-endpoint-model.js";
import { ApplicationRunBindingLaunchService } from "../../../src/application-orchestration/services/application-run-binding-launch-service.js";
import { ApplicationCurrentModelSelectionPolicy } from "../../../src/application-platform/launch-configuration/application-current-model-selection-policy.js";

const applicationId = "app-1";

const agentResourceRef = {
  source: "bundle",
  kind: "AGENT",
  localId: "sample-agent",
} as const satisfies ApplicationExecutionResourceRef;

const teamResourceRef = {
  source: "bundle",
  kind: "AGENT_TEAM",
  localId: "sample-team",
} as const satisfies ApplicationExecutionResourceRef;

const buildResolvedResource = (
  executionResourceRef: ApplicationExecutionResourceRef,
): ApplicationExecutionResourceSummary => ({
  source: executionResourceRef.source,
  kind: executionResourceRef.kind,
  localId: executionResourceRef.source === "bundle" ? executionResourceRef.localId : null,
  definitionId: executionResourceRef.kind === "AGENT" ? "agent-def-1" : "team-def-1",
  name: executionResourceRef.kind === "AGENT" ? "Sample Agent" : "Sample Team",
  applicationId,
});

const buildAgentInput = (): ApplicationStartAgentInput => ({
  launchRequestId: "agent-launch-request-1",
  executionResourceRef: agentResourceRef,
  launch: {
    kind: "AGENT",
    workspaceRootPath: "/tmp/agent-workspace",
    llmModelIdentifier: "grok-4.6",
  },
});

const buildTeamInput = (): ApplicationStartAgentTeamInput => ({
  launchRequestId: "team-launch-request-1",
  executionResourceRef: teamResourceRef,
  launch: {
    kind: "AGENT_TEAM",
    mode: "memberConfigs",
    teamConfigs: [{
      teamAddress: "/",
      workspaceRootPath: "/tmp/team-workspace",
      llmModelIdentifier: "grok-4.6",
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      runtimeKind: "autobyteus",
    }],
    memberConfigs: [{
      memberAddress: "/researcher",
      displayName: "Researcher",
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/team-workspace",
      llmModelIdentifier: "grok-4.6",
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      runtimeKind: "autobyteus",
    }],
  },
});

const buildService = (input: {
  ensureAutoByteusModelAvailable?: (modelIdentifier: string) => Promise<void>;
} = {}) => {
  const executionResourceResolver = {
    resolveExecutionResource: vi.fn(async (
      _applicationId: string,
      executionResourceRef: ApplicationExecutionResourceRef,
    ) => buildResolvedResource(executionResourceRef)),
  };
  const bindingStore = {
    persistBinding: vi.fn(async (binding: ApplicationAgentBindingRecord) => binding),
  };
  const lookupStore = {
    replaceBindingLookups: vi.fn(),
  };
  const agentRunService = {
    createAgentRun: vi.fn(async () => ({ runId: "agent-run-1" })),
  };
  const teamRunService = {
    createTeamRun: vi.fn(async (input: { memberConfigs: Array<{ memberAddress: string }> }) => ({
      teamRunId: "team-run-1",
      getExecutionTreeSnapshot: () => ({
        rootTeam: {
          address: "/",
          members: input.memberConfigs.map((member) => ({
            address: member.memberAddress,
            agentRunId: `team-run-1::${member.memberAddress.slice(1)}`,
          })),
        },
      }),
    })),
    createTeamRunFromRootConfig: vi.fn(async () => ({
      teamRunId: "team-run-1",
      getExecutionTreeSnapshot: () => ({ rootTeam: { address: "/", members: [] } }),
    })),
  };
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(async () => ({ name: "Sample Agent" })),
  };
  const requireCurrentAutoByteusModelIdentifier = vi.fn(async (modelIdentifier: string) => {
    if (modelIdentifier === "grok-4.5") {
      throw new CurrentModelSelectionRequiredError(modelIdentifier);
    }
  });
  const ensureAutoByteusModelAvailable = vi.fn(
    input.ensureAutoByteusModelAvailable ?? (async () => undefined),
  );
  const currentModelSelectionPolicy = new ApplicationCurrentModelSelectionPolicy({
    ensureAutoByteusModelAvailable,
    requireCurrentAutoByteusModelIdentifier,
  });

  return {
    service: new ApplicationRunBindingLaunchService({
      executionResourceResolver: executionResourceResolver as never,
      bindingStore: bindingStore as never,
      lookupStore: lookupStore as never,
      agentRunService: agentRunService as never,
      teamRunService: teamRunService as never,
      agentDefinitionService: agentDefinitionService as never,
      currentModelSelectionPolicy,
    }),
    executionResourceResolver,
    bindingStore,
    lookupStore,
    agentRunService,
    teamRunService,
    ensureAutoByteusModelAvailable,
    requireCurrentAutoByteusModelIdentifier,
  };
};

describe("ApplicationRunBindingLaunchService explicit start kinds", () => {
  it("routes a valid startAgent request only through agent creation", async () => {
    const { service, bindingStore, lookupStore, agentRunService, teamRunService } = buildService();

    const binding = await service.startAgentRunBinding(applicationId, buildAgentInput());

    expect(binding).toMatchObject({
      applicationId,
      launchRequestId: "agent-launch-request-1",
      runtime: {
        subject: "AGENT_RUN",
        agentRunId: "agent-run-1",
        definitionId: "agent-def-1",
      },
    });
    expect(agentRunService.createAgentRun).toHaveBeenCalledOnce();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).toHaveBeenCalledOnce();
    expect(lookupStore.replaceBindingLookups).toHaveBeenCalledOnce();
  });

  it("rejects a stale AutoByteus model before agent creation", async () => {
    const { service, agentRunService, teamRunService } = buildService();

    await expect(service.startAgentRunBinding(applicationId, {
      ...buildAgentInput(),
      launch: { ...buildAgentInput().launch, llmModelIdentifier: "grok-4.5" },
    })).rejects.toMatchObject({
      code: "CURRENT_MODEL_SELECTION_REQUIRED",
      message: "The selected model is no longer supported. Select a current supported model.",
    });
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
  });

  it("leaves external runtime model ownership outside the AutoByteus catalog guard", async () => {
    const { service, agentRunService, requireCurrentAutoByteusModelIdentifier } = buildService();

    await service.startAgentRunBinding(applicationId, {
      ...buildAgentInput(),
      launch: {
        ...buildAgentInput().launch,
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "provider-owned-claude-model",
      },
    });

    expect(agentRunService.createAgentRun).toHaveBeenCalledOnce();
    expect(requireCurrentAutoByteusModelIdentifier).not.toHaveBeenCalled();
  });

  it("routes a valid startAgentTeam request only through team creation", async () => {
    const { service, bindingStore, lookupStore, agentRunService, teamRunService } = buildService();

    const binding = await service.startAgentTeamRunBinding(applicationId, buildTeamInput());

    expect(binding).toMatchObject({
      applicationId,
      launchRequestId: "team-launch-request-1",
      runtime: {
        subject: "TEAM_RUN",
        teamRunId: "team-run-1",
        definitionId: "team-def-1",
      },
    });
    expect(teamRunService.createTeamRun).toHaveBeenCalledOnce();
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).toHaveBeenCalledOnce();
    expect(lookupStore.replaceBindingLookups).toHaveBeenCalledOnce();
  });

  it("validates every Team scope and AutoByteus member before team creation", async () => {
    const { service, teamRunService } = buildService();

    await expect(service.startAgentTeamRunBinding(applicationId, {
      ...buildTeamInput(),
      launch: {
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        teamConfigs: buildTeamInput().launch.mode === "memberConfigs"
          ? buildTeamInput().launch.teamConfigs
          : [],
        memberConfigs: [
          {
            memberAddress: "/researcher",
            agentDefinitionId: "agent-def-1",
            displayName: "Researcher",
            workspaceRootPath: "/tmp/team-workspace",
            llmModelIdentifier: "grok-4.6",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY" as never,
          },
          {
            memberAddress: "/writer",
            agentDefinitionId: "agent-def-1",
            displayName: "Writer",
            workspaceRootPath: "/tmp/team-workspace",
            llmModelIdentifier: "grok-4.5",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY" as never,
          },
        ],
      },
    })).rejects.toMatchObject({ code: "CURRENT_MODEL_SELECTION_REQUIRED" });
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
  });

  it("rejects a second dynamic team leaf before allocation or creation", async () => {
    const identifierA = buildOpenAICompatibleEndpointModelIdentifier("provider-a", "model-a");
    const identifierB = buildOpenAICompatibleEndpointModelIdentifier("provider-b", "model-b");
    const { service, ensureAutoByteusModelAvailable, teamRunService } = buildService({
      ensureAutoByteusModelAvailable: async (modelIdentifier) => {
        if (modelIdentifier === identifierB) throw new Error("provider B unavailable");
      },
    });

    await expect(service.startAgentTeamRunBinding(applicationId, {
      ...buildTeamInput(),
      launch: {
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        teamConfigs: buildTeamInput().launch.mode === "memberConfigs"
          ? buildTeamInput().launch.teamConfigs
          : [],
        memberConfigs: [identifierA, identifierB].map((llmModelIdentifier, index) => ({
          memberAddress: index === 0 ? "/researcher" : "/writer",
          displayName: index === 0 ? "Researcher" : "Writer",
          agentDefinitionId: "agent-def-1",
          workspaceRootPath: "/tmp/team-workspace",
          llmModelIdentifier,
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as never,
        })),
      },
    })).rejects.toMatchObject({
      name: "ApplicationModelAvailabilityError",
      modelIdentifier: identifierB,
    });
    expect(ensureAutoByteusModelAvailable).toHaveBeenNthCalledWith(1, identifierA);
    expect(ensureAutoByteusModelAvailable).toHaveBeenNthCalledWith(2, identifierB);
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
  });

  it("uses the separate preset expansion path with the exact application binding", async () => {
    const { service, teamRunService } = buildService();

    await service.startAgentTeamRunBinding(applicationId, {
      ...buildTeamInput(),
      launch: {
        kind: "AGENT_TEAM",
        mode: "preset",
        launchPreset: {
          workspaceRootPath: "/tmp/team-workspace",
          llmModelIdentifier: "grok-4.6",
          runtimeKind: "autobyteus",
          skillAccessMode: "PRELOADED_ONLY",
        },
      },
    });

    expect(teamRunService.createTeamRunFromRootConfig).toHaveBeenCalledWith({
      teamDefinitionId: "team-def-1",
      rootConfig: expect.objectContaining({
        workspaceRootPath: "/tmp/team-workspace",
        llmModelIdentifier: "grok-4.6",
      }),
      applicationBinding: {
        applicationId,
        bindingId: expect.any(String),
      },
    });
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
  });

  it("rejects an AGENT_TEAM launch passed to startAgent before resolution or side effects", async () => {
    const {
      service,
      executionResourceResolver,
      bindingStore,
      lookupStore,
      agentRunService,
      teamRunService,
    } = buildService();

    await expect(
      service.startAgentRunBinding(applicationId, buildTeamInput() as never),
    ).rejects.toThrow("startAgent requires launch.kind 'AGENT'.");
    expect(executionResourceResolver.resolveExecutionResource).not.toHaveBeenCalled();
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).not.toHaveBeenCalled();
    expect(lookupStore.replaceBindingLookups).not.toHaveBeenCalled();
  });

  it("rejects an AGENT launch passed to startAgentTeam before resolution or side effects", async () => {
    const {
      service,
      executionResourceResolver,
      bindingStore,
      lookupStore,
      agentRunService,
      teamRunService,
    } = buildService();

    await expect(
      service.startAgentTeamRunBinding(applicationId, buildAgentInput() as never),
    ).rejects.toThrow("startAgentTeam requires launch.kind 'AGENT_TEAM'.");
    expect(executionResourceResolver.resolveExecutionResource).not.toHaveBeenCalled();
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).not.toHaveBeenCalled();
    expect(lookupStore.replaceBindingLookups).not.toHaveBeenCalled();
  });

  it("rejects an AGENT_TEAM resource resolved for startAgent before run creation", async () => {
    const { service, bindingStore, lookupStore, agentRunService, teamRunService } = buildService();

    await expect(
      service.startAgentRunBinding(applicationId, {
        ...buildAgentInput(),
        executionResourceRef: teamResourceRef,
      }),
    ).rejects.toThrow("startAgent requires an 'AGENT' execution resource.");
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).not.toHaveBeenCalled();
    expect(lookupStore.replaceBindingLookups).not.toHaveBeenCalled();
  });

  it("rejects an AGENT resource resolved for startAgentTeam before run creation", async () => {
    const { service, bindingStore, lookupStore, agentRunService, teamRunService } = buildService();

    await expect(
      service.startAgentTeamRunBinding(applicationId, {
        ...buildTeamInput(),
        executionResourceRef: agentResourceRef,
      }),
    ).rejects.toThrow("startAgentTeam requires an 'AGENT_TEAM' execution resource.");
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).not.toHaveBeenCalled();
    expect(lookupStore.replaceBindingLookups).not.toHaveBeenCalled();
  });
});
