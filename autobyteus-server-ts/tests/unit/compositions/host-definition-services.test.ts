import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { createHostDefinitionServices } from "../../../src/compositions/host-definition-services.js";

const appConfig = {
  getAgentsDir: () => "/tmp/host-definition-services/agents",
  getAgentTeamsDir: () => "/tmp/host-definition-services/agent-teams",
  getAdditionalAgentPackageRoots: () => [],
} as unknown as AppConfig;
const bundleService = {} as ApplicationBundleService;

const boundAgents: AgentDefinitionService[] = [];
const boundTeams: AgentTeamDefinitionService[] = [];

afterEach(() => {
  for (const service of boundTeams.splice(0)) {
    AgentTeamDefinitionService.releaseProcessInstance(service);
  }
  for (const service of boundAgents.splice(0)) {
    AgentDefinitionService.releaseProcessInstance(service);
  }
});

describe("HostDefinitionServices", () => {
  it("binds one exact Agent/Team pair, closes idempotently, and permits a second host", () => {
    const first = createHostDefinitionServices({ appConfig, bundleService });
    expect(AgentDefinitionService.getInstance()).toBe(first.agentDefinitionService);
    expect(AgentTeamDefinitionService.getInstance()).toBe(first.agentTeamDefinitionService);
    expect((first.agentTeamDefinitionService as unknown as {
      agentDefinitionService: AgentDefinitionService;
    }).agentDefinitionService).toBe(first.agentDefinitionService);

    first.close();
    first.close();

    const second = createHostDefinitionServices({ appConfig, bundleService });
    expect(second.agentDefinitionService).not.toBe(first.agentDefinitionService);
    expect(second.agentTeamDefinitionService).not.toBe(first.agentTeamDefinitionService);
    expect(AgentDefinitionService.getInstance()).toBe(second.agentDefinitionService);
    expect(AgentTeamDefinitionService.getInstance()).toBe(second.agentTeamDefinitionService);
    second.close();
  });

  it("fails on an early Agent definition singleton without replacing it", () => {
    const existing = new AgentDefinitionService();
    AgentDefinitionService.bindProcessInstance(existing);
    boundAgents.push(existing);

    expect(() => createHostDefinitionServices({ appConfig, bundleService })).toThrow(
      "The process AgentDefinitionService is already initialized.",
    );
    expect(AgentDefinitionService.getInstance()).toBe(existing);
  });

  it("unwinds the Agent binding when Team binding fails", () => {
    const existingAgent = new AgentDefinitionService();
    const existingTeam = new AgentTeamDefinitionService({
      agentDefinitionService: existingAgent,
    });
    AgentTeamDefinitionService.bindProcessInstance(existingTeam);
    boundTeams.push(existingTeam);

    expect(() => createHostDefinitionServices({ appConfig, bundleService })).toThrow(
      "The process AgentTeamDefinitionService is already initialized.",
    );

    const probe = new AgentDefinitionService();
    expect(() => AgentDefinitionService.bindProcessInstance(probe)).not.toThrow();
    boundAgents.push(probe);
  });
});
