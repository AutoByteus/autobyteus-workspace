import fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../../../src/api/fastify-runtime-config.js";

const applicationBackendGatewayMock = vi.hoisted(() => ({
  getApplicationEngineStatus: vi.fn(),
  invokeApplicationQuery: vi.fn(),
}));

vi.mock("../../../../src/application-backend-gateway/services/application-backend-gateway-service.js", () => ({
  getApplicationBackendGatewayService: () => applicationBackendGatewayMock,
}));

import { registerApplicationBackendRoutes } from "../../../../src/api/rest/application-backends.js";

const LONG_APPLICATION_ID =
  "bundle-app__6170706c69636174696f6e2d6c6f63616c3a25324655736572732532466e6f726d792532466175746f6279746575735f6f72672532466175746f6279746575732d776f726b74726565732532466170706c69636174696f6e2d62756e646c652d6167656e742d6172636869746563747572652d616e616c797369732d696d706c656d656e746174696f6e2532466170706c69636174696f6e7325324662726965662d73747564696f25324664697374253246696d706f727461626c652d7061636b616765__62726965662d73747564696f";

describe("application backend REST routes under /rest prefix", () => {
  beforeEach(() => {
    applicationBackendGatewayMock.getApplicationEngineStatus.mockReset();
    applicationBackendGatewayMock.invokeApplicationQuery.mockReset();
  });

  it("serves status for long imported application ids through the parent /rest prefix", async () => {
    applicationBackendGatewayMock.getApplicationEngineStatus.mockResolvedValue({
      applicationId: LONG_APPLICATION_ID,
      state: "ready",
    });

    const app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
    await app.register(async (restApp) => {
      await registerApplicationBackendRoutes(restApp);
    }, { prefix: "/rest" });

    const response = await app.inject({
      method: "GET",
      url: `/rest/applications/${LONG_APPLICATION_ID}/backend/status`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      applicationId: LONG_APPLICATION_ID,
      state: "ready",
    });
    expect(applicationBackendGatewayMock.getApplicationEngineStatus).toHaveBeenCalledWith(LONG_APPLICATION_ID);
  });

  it("serves query calls for long imported application ids through the parent /rest prefix", async () => {
    applicationBackendGatewayMock.invokeApplicationQuery.mockResolvedValue({
      briefs: [{ briefId: "brief::session-1" }],
    });

    const app = fastify({ maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH });
    await app.register(async (restApp) => {
      await registerApplicationBackendRoutes(restApp);
    }, { prefix: "/rest" });

    const response = await app.inject({
      method: "POST",
      url: `/rest/applications/${LONG_APPLICATION_ID}/backend/queries/briefs.list`,
      payload: {
        requestContext: {
          applicationId: LONG_APPLICATION_ID,
        },
        input: { includeArchived: false },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      result: {
        briefs: [{ briefId: "brief::session-1" }],
      },
    });
    expect(applicationBackendGatewayMock.invokeApplicationQuery).toHaveBeenCalledWith(
      LONG_APPLICATION_ID,
      "briefs.list",
      {
        applicationId: LONG_APPLICATION_ID,
      },
      { includeArchived: false },
    );
  });
});
