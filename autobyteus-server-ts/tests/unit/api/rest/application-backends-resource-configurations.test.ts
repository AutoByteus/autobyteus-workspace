import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../../src/api/fastify-runtime-config.js";
import { LaunchProfileValidationError } from "../../../../src/application-orchestration/services/application-resource-configuration-launch-profile.js";

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
  getConfiguredResource: vi.fn(),
  upsertConfiguration: vi.fn(),
}));

vi.mock("../../../../src/application-backend-gateway/services/application-backend-gateway-service.js", () => ({
  getApplicationBackendGatewayService: () => applicationBackendGatewayMock,
}));

vi.mock("../../../../src/application-orchestration/services/application-resource-configuration-service.js", () => ({
  ApplicationResourceConfigurationService: class ApplicationResourceConfigurationService {
    listConfigurations = resourceConfigurationServiceMock.listConfigurations;
    getConfiguredResource = resourceConfigurationServiceMock.getConfiguredResource;
    upsertConfiguration = resourceConfigurationServiceMock.upsertConfiguration;
  },
}));

import { registerApplicationBackendRoutes } from "../../../../src/api/rest/application-backends.js";

describe("application resource-configuration REST routes", () => {
  afterEach(async () => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    resourceConfigurationServiceMock.listConfigurations.mockReset();
    resourceConfigurationServiceMock.getConfiguredResource.mockReset();
    resourceConfigurationServiceMock.upsertConfiguration.mockReset();
  });

  it("returns HTTP 400 for unresolved inherited-model save validation failures", async () => {
    resourceConfigurationServiceMock.upsertConfiguration.mockRejectedValueOnce(
      new LaunchProfileValidationError(
        "PROFILE_MALFORMED",
        "Application resource slot 'draftingTeam' requires an effective llmModelIdentifier for team member 'writer'. Add a team default or a member override before saving.",
      ),
    );

    const app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
    await app.register(async (restApp) => {
      await registerApplicationBackendRoutes(restApp);
    }, { prefix: "/rest" });

    const payload = {
      resourceRef: {
        owner: "shared",
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

    try {
      const response = await app.inject({
        method: "PUT",
        url: "/rest/applications/app-1/resource-configurations/draftingTeam",
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        detail: "Application resource slot 'draftingTeam' requires an effective llmModelIdentifier for team member 'writer'. Add a team default or a member override before saving.",
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
