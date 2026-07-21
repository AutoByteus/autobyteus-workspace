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
    llmModelIdentifier: "gpt-test",
  },
});

const buildTeamInput = (): ApplicationStartAgentTeamInput => ({
  launchRequestId: "team-launch-request-1",
  executionResourceRef: teamResourceRef,
  launch: {
    kind: "AGENT_TEAM",
    mode: "memberConfigs",
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
    createTeamRun: vi.fn(async () => ({
      runId: "team-run-1",
      config: { memberConfigs: [] },
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
        runId: "agent-run-1",
        definitionId: "agent-def-1",
      },
    });
    expect(agentRunService.createAgentRun).toHaveBeenCalledOnce();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).toHaveBeenCalledOnce();
    expect(lookupStore.replaceBindingLookups).toHaveBeenCalledOnce();
  });

  it("routes a valid startAgentTeam request only through team creation", async () => {
    const { service, bindingStore, lookupStore, agentRunService, teamRunService } = buildService();

    const binding = await service.startAgentTeamRunBinding(applicationId, buildTeamInput());

    expect(binding).toMatchObject({
      applicationId,
      launchRequestId: "team-launch-request-1",
      runtime: {
        subject: "TEAM_RUN",
        runId: "team-run-1",
        definitionId: "team-def-1",
      },
    });
    expect(teamRunService.createTeamRun).toHaveBeenCalledOnce();
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).toHaveBeenCalledOnce();
    expect(lookupStore.replaceBindingLookups).toHaveBeenCalledOnce();
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
    ).rejects.toThrow("startAgent requires launch.kind 'AGENT'; received 'AGENT_TEAM'.");
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
    ).rejects.toThrow("startAgentTeam requires launch.kind 'AGENT_TEAM'; received 'AGENT'.");
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
    ).rejects.toThrow("startAgent requires an 'AGENT' execution resource; resolved 'AGENT_TEAM'.");
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
    ).rejects.toThrow("startAgentTeam requires an 'AGENT_TEAM' execution resource; resolved 'AGENT'.");
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(teamRunService.createTeamRun).not.toHaveBeenCalled();
    expect(bindingStore.persistBinding).not.toHaveBeenCalled();
    expect(lookupStore.replaceBindingLookups).not.toHaveBeenCalled();
  });
});
