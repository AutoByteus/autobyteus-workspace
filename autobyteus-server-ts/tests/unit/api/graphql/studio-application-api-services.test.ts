import { afterEach, describe, expect, it } from "vitest";
import {
  configureStudioApplicationApiServices,
  getStudioAgentDefinitionService,
  getStudioAgentRunService,
  getStudioAgentTeamDefinitionService,
  getStudioApplicationBundleService,
  getStudioApplicationCapabilityService,
  getStudioApplicationPackageCommands,
  getStudioApplicationPackageQueries,
  getStudioRunModelConfigService,
  getStudioTeamRunService,
} from "../../../../src/api/graphql/studio-application-api-services.js";

type Registration = ReturnType<typeof configureStudioApplicationApiServices>;

let registration: Registration | null = null;

const buildServices = () => ({
  agentDefinitionService: { subject: "agent-definition" },
  agentTeamDefinitionService: { subject: "team-definition" },
  agentRunService: { subject: "agent-run" },
  teamRunService: { subject: "team-run" },
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
    "agentRunService",
    "teamRunService",
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
