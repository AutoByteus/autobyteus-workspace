import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../../src/api/fastify-runtime-config.js";
import { LaunchProfileValidationError } from "../../../../src/application-orchestration/services/application-execution-resource-configuration-launch-profile.js";

const applicationBackendGatewayMock = vi.hoisted(() => ({
  getApplicationEngineStatus: vi.fn(),
  invokeApplicationQuery: vi.fn(),
  ensureApplicationReady: vi.fn(),
  routeApplicationRequest: vi.fn(),
  invokeApplicationCommand: vi.fn(),
  executeApplicationGraphql: vi.fn(),
}));

const resourceConfigurationServiceMock = vi.hoisted(() => ({
  listConfigurations: vi.fn(),
  getConfiguredExecutionResource: vi.fn(),
  upsertConfiguration: vi.fn(),
}));

const orchestrationHostMock = vi.hoisted(() => ({
  listAvailableExecutionResources: vi.fn(),
}));

vi.mock("../../../../src/application-backend-gateway/services/application-backend-gateway-service.js", () => ({
  getApplicationBackendGatewayService: () => applicationBackendGatewayMock,
}));

vi.mock("../../../../src/application-orchestration/services/application-orchestration-host-service.js", () => ({
  ApplicationOrchestrationHostService: {
    getInstance: () => orchestrationHostMock,
  },
}));

vi.mock("../../../../src/application-orchestration/services/application-execution-resource-configuration-service.js", () => ({
  ApplicationExecutionResourceConfigurationService: class ApplicationExecutionResourceConfigurationService {
    listConfigurations = resourceConfigurationServiceMock.listConfigurations;
    getConfiguredExecutionResource = resourceConfigurationServiceMock.getConfiguredExecutionResource;
    upsertConfiguration = resourceConfigurationServiceMock.upsertConfiguration;
  },
}));

import { registerApplicationBackendRoutes } from "../../../../src/api/rest/application-backends.js";

const buildRestApp = async () => {
  const app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
  await app.register(async (restApp) => {
    await registerApplicationBackendRoutes(restApp);
  }, { prefix: "/rest" });
  return app;
};

describe("application resource-configuration REST routes", () => {
  afterEach(async () => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    resourceConfigurationServiceMock.listConfigurations.mockReset();
    resourceConfigurationServiceMock.getConfiguredExecutionResource.mockReset();
    resourceConfigurationServiceMock.upsertConfiguration.mockReset();
    orchestrationHostMock.listAvailableExecutionResources.mockReset();
  });

  it("lists execution-resource configuration views through the REST boundary", async () => {
    const responseBody = [
      {
        slot: {
          slotKey: "draftingTeam",
          name: "Drafting Team",
          allowedExecutionResourceKinds: ["AGENT_TEAM"],
          allowedExecutionResourceSources: ["bundle", "shared"],
          required: true,
          supportedLaunchConfig: null,
          defaultExecutionResourceRef: {
            source: "bundle",
            kind: "AGENT_TEAM",
            localId: "brief-studio-team",
          },
        },
        status: "READY",
        configuration: {
          slotKey: "draftingTeam",
          executionResourceRef: {
            source: "bundle",
            kind: "AGENT_TEAM",
            localId: "brief-studio-team",
          },
          launchProfile: null,
        },
        invalidSavedConfiguration: null,
        issue: null,
        updatedAt: null,
      },
    ];
    resourceConfigurationServiceMock.listConfigurations.mockResolvedValueOnce(responseBody);

    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/rest/applications/app-1/execution-resource-configurations",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(responseBody);
      expect(resourceConfigurationServiceMock.listConfigurations).toHaveBeenCalledWith("app-1");
    } finally {
      await app.close();
    }
  });

  it("lists available execution resources through the REST boundary", async () => {
    const responseBody = [
      {
        source: "bundle",
        kind: "AGENT_TEAM",
        localId: "brief-studio-team",
        definitionId: "bundle-team__brief-studio-team",
        name: "Brief Studio Team",
        applicationId: "app-1",
      },
      {
        source: "shared",
        kind: "AGENT",
        localId: null,
        definitionId: "shared-agent-1",
        name: "Shared Agent",
        applicationId: null,
      },
    ];
    orchestrationHostMock.listAvailableExecutionResources.mockResolvedValueOnce(responseBody);

    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/rest/applications/app-1/available-execution-resources",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(responseBody);
      expect(orchestrationHostMock.listAvailableExecutionResources).toHaveBeenCalledWith("app-1");
    } finally {
      await app.close();
    }
  });

  it("saves a selected executionResourceRef and launchProfile through the REST boundary", async () => {
    const payload = {
      executionResourceRef: {
        source: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launchProfile: null,
    };
    const responseBody = {
      slot: {
        slotKey: "draftingTeam",
        name: "Drafting Team",
        allowedExecutionResourceKinds: ["AGENT_TEAM"],
        allowedExecutionResourceSources: ["bundle", "shared"],
        required: true,
        supportedLaunchConfig: null,
        defaultExecutionResourceRef: null,
      },
      status: "READY",
      configuration: {
        slotKey: "draftingTeam",
        executionResourceRef: payload.executionResourceRef,
        launchProfile: null,
      },
      invalidSavedConfiguration: null,
      issue: null,
      updatedAt: "2026-05-08T12:00:00.000Z",
    };
    resourceConfigurationServiceMock.upsertConfiguration.mockResolvedValueOnce(responseBody);

    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "PUT",
        url: "/rest/applications/app-1/execution-resource-configurations/draftingTeam",
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(responseBody);
      expect(resourceConfigurationServiceMock.upsertConfiguration).toHaveBeenCalledWith(
        "app-1",
        "draftingTeam",
        payload,
      );
    } finally {
      await app.close();
    }
  });

  it("returns HTTP 400 for unresolved inherited-model save validation failures", async () => {
    resourceConfigurationServiceMock.upsertConfiguration.mockRejectedValueOnce(
      new LaunchProfileValidationError(
        "PROFILE_MALFORMED",
        "Application execution resource slot 'draftingTeam' requires an effective llmModelIdentifier for team member 'writer'. Add a team default or a member override before saving.",
      ),
    );

    const payload = {
      executionResourceRef: {
        source: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launchProfile: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: [
          {
            memberRouteKey: "researcher",
            memberName: "researcher",
            agentDefinitionId: "bundle-agent__researcher",
            runtimeKind: "autobyteus",
            llmModelIdentifier: "openai/gpt-5",
          },
          {
            memberRouteKey: "writer",
            memberName: "writer",
            agentDefinitionId: "bundle-agent__writer",
            runtimeKind: "lmstudio",
          },
        ],
      },
    };

    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "PUT",
        url: "/rest/applications/app-1/execution-resource-configurations/draftingTeam",
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        detail: "Application execution resource slot 'draftingTeam' requires an effective llmModelIdentifier for team member 'writer'. Add a team default or a member override before saving.",
      });
      expect(resourceConfigurationServiceMock.upsertConfiguration).toHaveBeenCalledWith(
        "app-1",
        "draftingTeam",
        payload,
      );
    } finally {
      await app.close();
    }
  });
});
