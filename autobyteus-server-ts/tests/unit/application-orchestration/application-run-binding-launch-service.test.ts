import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationStartAgentInput,
  ApplicationStartAgentTeamInput,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationRunBindingLaunchService } from "../../../src/application-orchestration/services/application-run-binding-launch-service.js";

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
    teamDefaultConfig: {
      workspaceRootPath: "/tmp/team-workspace",
      llmModelIdentifier: "grok-4.6",
      runtimeKind: "claude_agent_sdk",
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY" as never,
      llmConfig: null,
    },
    memberConfigs: [],
  },
});

const buildService = () => {
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
    allocateTeamRunId: vi.fn(async () => "team-run-1"),
    createTeamRunFromRootConfig: vi.fn(async () => ({
      teamRunId: "team-run-1",
      getExecutionTreeSnapshot: () => ({ rootTeam: { members: [] } }),
    })),
  };
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(async () => ({ name: "Sample Agent" })),
  };
  const agentTeamDefinitionService = {
    getDefinitionById: vi.fn(async () => ({
      id: "team-def-1",
      ownershipScope: "shared",
      nodes: [],
    })),
  };

  return {
    service: new ApplicationRunBindingLaunchService({
      executionResourceResolver: executionResourceResolver as never,
      bindingStore: bindingStore as never,
      lookupStore: lookupStore as never,
      agentRunService: agentRunService as never,
      teamRunService: teamRunService as never,
      agentDefinitionService: agentDefinitionService as never,
      agentTeamDefinitionService: agentTeamDefinitionService as never,
    }),
    executionResourceResolver,
    bindingStore,
    lookupStore,
    agentRunService,
    teamRunService,
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
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
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
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
  });

  it("leaves external runtime model ownership outside the AutoByteus catalog guard", async () => {
    const { service, agentRunService } = buildService();

    await service.startAgentRunBinding(applicationId, {
      ...buildAgentInput(),
      launch: {
        ...buildAgentInput().launch,
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "provider-owned-claude-model",
      },
    });

    expect(agentRunService.createAgentRun).toHaveBeenCalledOnce();
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
    expect(teamRunService.createTeamRunFromRootConfig).toHaveBeenCalledOnce();
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).toHaveBeenCalledOnce();
    expect(lookupStore.replaceBindingLookups).toHaveBeenCalledOnce();
  });

  it("validates every AutoByteus team member before allocating a team run", async () => {
    const { service, teamRunService } = buildService();

    await expect(service.startAgentTeamRunBinding(applicationId, {
      ...buildTeamInput(),
      launch: {
        ...buildTeamInput().launch,
        memberConfigs: [{
          memberAddress: "/writer",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "grok-4.5",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as never,
        }],
      },
    })).rejects.toMatchObject({ code: "CURRENT_MODEL_SELECTION_REQUIRED" });
    expect(teamRunService.allocateTeamRunId).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
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
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
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
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
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
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
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
    expect(teamRunService.createTeamRunFromRootConfig).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).not.toHaveBeenCalled();
    expect(lookupStore.replaceBindingLookups).not.toHaveBeenCalled();
  });
});
