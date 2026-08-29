import fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../../src/api/fastify-runtime-config.js";
import { registerApplicationExecutionResourceRoutes } from "../../../../src/api/rest/application-execution-resources.js";
import { ApplicationLaunchConfigurationError } from "../../../../src/application-platform/launch-configuration/application-launch-configuration-diagnostics.js";

const orchestration = {
  getApplicationLaunchConfigurationView: vi.fn(),
  previewSelectedApplicationResource: vi.fn(),
  listAvailableExecutionResources: vi.fn(),
  upsertApplicationLaunchOverride: vi.fn(),
  removeApplicationLaunchOverride: vi.fn(),
};

const buildRestApp = async () => {
  const app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
  await app.register(async (restApp) => {
    await registerApplicationExecutionResourceRoutes(restApp, orchestration as never);
  }, { prefix: "/rest" });
  return app;
};

const runnableView = {
  applicationId: "app-1",
  slots: [],
  readiness: { status: "RUNNABLE", issues: [] },
};

describe("application launch-configuration REST routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current four-meaning launch view through GET", async () => {
    const responseBody = {
      applicationId: "app-1",
      slots: [{
        slot: { slotKey: "draftingTeam" },
        packageBaseline: { resourceDefinitionId: "package-team" },
        selectedResourceBaseline: { resourceDefinitionId: "shared-team" },
        savedOverride: { slotKey: "draftingTeam" },
        savedOverrideState: "VALID",
        effectiveConfiguration: { resourceDefinitionId: "shared-team" },
        issues: [],
        canResetToPackageDefaults: true,
        updatedAt: "2026-07-29T12:00:00.000Z",
      }],
      readiness: { status: "RUNNABLE", issues: [] },
    };
    orchestration.getApplicationLaunchConfigurationView.mockResolvedValueOnce(responseBody);
    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/rest/applications/app-1/execution-resource-configurations",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(responseBody);
      expect(orchestration.getApplicationLaunchConfigurationView).toHaveBeenCalledWith("app-1");
    } finally {
      await app.close();
    }
  });

  it("previews one exact selected resource without changing its request identity", async () => {
    const executionResourceRef = {
      source: "shared",
      kind: "AGENT_TEAM",
      definitionId: "shared-writing-team",
    };
    const responseBody = {
      status: "RESOLVED",
      applicationId: "app-1",
      slotKey: "draftingTeam",
      executionResourceRef,
      selectedResourceBaseline: { executionResourceRef },
      issues: [],
    };
    orchestration.previewSelectedApplicationResource.mockResolvedValueOnce(responseBody);
    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/rest/applications/app-1/execution-resource-configurations/draftingTeam/selection-preview",
        payload: { executionResourceRef },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(responseBody);
      expect(orchestration.previewSelectedApplicationResource).toHaveBeenCalledWith(
        "app-1",
        "draftingTeam",
        executionResourceRef,
      );
    } finally {
      await app.close();
    }
  });

  it("lists available execution-resource identities through the current host service", async () => {
    const responseBody = [{
      source: "shared",
      kind: "AGENT_TEAM",
      localId: null,
      definitionId: "shared-writing-team",
      name: "Shared Writing Team",
      applicationId: null,
    }];
    orchestration.listAvailableExecutionResources.mockResolvedValueOnce(responseBody);
    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/rest/applications/app-1/available-execution-resources",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(responseBody);
      expect(orchestration.listAvailableExecutionResources).toHaveBeenCalledWith("app-1");
    } finally {
      await app.close();
    }
  });

  it("forwards the sparse execution-resource ref and launch override through PUT", async () => {
    const payload = {
      executionResourceRef: {
        source: "shared",
        kind: "AGENT_TEAM",
        definitionId: "shared-writing-team",
      },
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: null,
        memberProfiles: [{
          memberRouteKey: "writer",
          memberName: "writer",
          agentDefinitionId: "shared-writer",
          llmModelIdentifier: "host-writer-model",
        }],
      },
    };
    orchestration.upsertApplicationLaunchOverride.mockResolvedValueOnce(runnableView);
    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "PUT",
        url: "/rest/applications/app-1/execution-resource-configurations/draftingTeam",
        payload,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(runnableView);
      expect(orchestration.upsertApplicationLaunchOverride).toHaveBeenCalledWith(
        "app-1",
        "draftingTeam",
        payload,
      );
    } finally {
      await app.close();
    }
  });

  it("maps PUT-time topology re-resolution failure to the structured readiness conflict", async () => {
    const readiness = {
      status: "HOST_REQUIREMENT_MISSING" as const,
      issues: [{
        severity: "blocking" as const,
        scope: "HOST_OVERRIDE" as const,
        code: "SAVED_MEMBER_TOPOLOGY_STALE" as const,
        slotKey: "draftingTeam",
        message: "Selected team topology changed after preview.",
      }],
    };
    orchestration.upsertApplicationLaunchOverride.mockRejectedValueOnce(
      new ApplicationLaunchConfigurationError(readiness),
    );
    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "PUT",
        url: "/rest/applications/app-1/execution-resource-configurations/draftingTeam",
        payload: {
          executionResourceRef: {
            source: "shared",
            kind: "AGENT_TEAM",
            definitionId: "shared-writing-team",
          },
          launchOverride: null,
        },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        detail: "Selected team topology changed after preview.",
        readiness,
      });
    } finally {
      await app.close();
    }
  });

  it("uses DELETE as the only package-default Reset action", async () => {
    orchestration.removeApplicationLaunchOverride.mockResolvedValueOnce(runnableView);
    const app = await buildRestApp();
    try {
      const response = await app.inject({
        method: "DELETE",
        url: "/rest/applications/app-1/execution-resource-configurations/draftingTeam",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(runnableView);
      expect(orchestration.removeApplicationLaunchOverride).toHaveBeenCalledWith(
        "app-1",
        "draftingTeam",
      );
    } finally {
      await app.close();
    }
  });
});
