import { afterEach, describe, expect, it } from "vitest";
import {
  configureStudioApplicationApiServices,
  getStudioAgentDefinitionService,
  getStudioAgentOrgDefinitionService,
  getStudioAgentOrgRunService,
  getStudioAgentRunService,
  getStudioAgentTeamDefinitionService,
  getStudioApplicationBundleService,
  getStudioApplicationCapabilityService,
  getStudioApplicationPackageCommands,
  getStudioApplicationPackageQueries,
  getStudioCollaborationRootHistoryService,
  getStudioDefinitionAdmissionService,
  getStudioRunModelConfigService,
  getStudioTeamRunService,
} from "../../../../src/api/graphql/studio-application-api-services.js";

type Registration = ReturnType<typeof configureStudioApplicationApiServices>;

let registration: Registration | null = null;

const buildServices = () => ({
  agentDefinitionService: { subject: "agent-definition" },
  agentTeamDefinitionService: { subject: "team-definition" },
  agentOrgDefinitionService: { subject: "org-definition" },
  agentRunService: { subject: "agent-run" },
  teamRunService: { subject: "team-run" },
  agentOrgRunService: { subject: "org-run" },
  definitionAdmissionService: { subject: "definition-admission" },
  collaborationRootHistoryService: { subject: "collaboration-root-history" },
  runModelConfigService: { subject: "run-model-config" },
  bundleService: { subject: "bundle" },
  capabilityService: { subject: "capability" },
  packageQueries: { subject: "package-queries" },
  packageCommands: { subject: "package-commands" },
});

afterEach(() => {
  registration?.close();
  registration = null;
});

describe("Studio application API service registration", () => {
  it("publishes one exact service set and releases it idempotently", () => {
    const services = buildServices();
    registration = configureStudioApplicationApiServices(services as never);

    expect(getStudioAgentDefinitionService()).toBe(services.agentDefinitionService);
    expect(getStudioAgentTeamDefinitionService()).toBe(services.agentTeamDefinitionService);
    expect(getStudioAgentRunService()).toBe(services.agentRunService);
    expect(getStudioTeamRunService()).toBe(services.teamRunService);
    expect(getStudioAgentOrgDefinitionService()).toBe(services.agentOrgDefinitionService);
    expect(getStudioAgentOrgRunService()).toBe(services.agentOrgRunService);
    expect(getStudioDefinitionAdmissionService()).toBe(services.definitionAdmissionService);
    expect(getStudioCollaborationRootHistoryService()).toBe(services.collaborationRootHistoryService);
    expect(getStudioRunModelConfigService()).toBe(services.runModelConfigService);
    expect(getStudioApplicationBundleService()).toBe(services.bundleService);
    expect(getStudioApplicationCapabilityService()).toBe(services.capabilityService);
    expect(getStudioApplicationPackageQueries()).toBe(services.packageQueries);
    expect(getStudioApplicationPackageCommands()).toBe(services.packageCommands);

    expect(() => configureStudioApplicationApiServices(buildServices() as never))
      .toThrow("already configured");

    registration.close();
    registration.close();
    registration = null;
    expect(() => getStudioAgentRunService()).toThrow("not configured");

    registration = configureStudioApplicationApiServices(buildServices() as never);
    expect(getStudioTeamRunService()).toBeDefined();
  });

  it.each([
    "agentDefinitionService",
    "agentTeamDefinitionService",
    "agentOrgDefinitionService",
    "agentRunService",
    "teamRunService",
    "agentOrgRunService",
    "definitionAdmissionService",
    "collaborationRootHistoryService",
    "runModelConfigService",
    "bundleService",
    "capabilityService",
    "packageQueries",
    "packageCommands",
  ] as const)("rejects a missing %s before publishing any service", (field) => {
    const services = buildServices();
    delete (services as Partial<typeof services>)[field];

    expect(() => configureStudioApplicationApiServices(services as never))
      .toThrow("Complete Studio application API services are required");
    expect(() => getStudioAgentDefinitionService()).toThrow("not configured");
  });
});
