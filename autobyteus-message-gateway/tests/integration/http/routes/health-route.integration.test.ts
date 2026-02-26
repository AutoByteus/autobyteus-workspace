import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerHealthRoutes } from "../../../../src/http/routes/health-route.js";

describe("health-route", () => {
  it("returns service health payload", async () => {
    const app = fastify();
    registerHealthRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.service).toBe("autobyteus-message-gateway");
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");

    await app.close();
  });
});
