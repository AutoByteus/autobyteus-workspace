import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerRuntimeReliabilityRoutes } from "../../../../src/http/routes/runtime-reliability-route.js";

describe("runtime-reliability-route", () => {
  it("returns runtime snapshot and queue counters", async () => {
    const app = fastify();
    registerRuntimeReliabilityRoutes(app, {
      inboundInboxService: {
        listByStatus: vi.fn(async (statuses: string[]) => {
          if (statuses.includes("DEAD_LETTER")) {
            return [{ id: "in-1", status: "DEAD_LETTER" }];
          }
          if (statuses.includes("COMPLETED_UNBOUND")) {
            return [{ id: "in-2", status: "COMPLETED_UNBOUND" }];
          }
          return [];
        }),
        replayFromStatus: vi.fn(),
      } as any,
      outboundOutboxService: {
        listByStatus: vi.fn(async () => [{ id: "out-1", status: "DEAD_LETTER" }]),
        replayFromStatus: vi.fn(),
      } as any,
      reliabilityStatusService: {
        getSnapshot: vi.fn(() => ({
          state: "HEALTHY",
          criticalCode: null,
          updatedAt: "2026-02-12T00:00:00.000Z",
          workers: {
            inboundForwarder: {
              running: true,
              lastError: null,
              lastErrorAt: null,
            },
            outboundSender: {
              running: true,
              lastError: null,
              lastErrorAt: null,
            },
          },
          locks: {
            inbox: {
              ownerId: "owner-1",
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-02-12T00:00:00.000Z",
              lastError: null,
            },
            outbox: {
              ownerId: "owner-2",
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-02-12T00:00:00.000Z",
              lastError: null,
            },
          },
        })),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/runtime-reliability/v1/status",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      runtime: {
        state: "HEALTHY",
      },
      queue: {
        inboundDeadLetterCount: 1,
        inboundCompletedUnboundCount: 1,
        outboundDeadLetterCount: 1,
      },
    });
    await app.close();
  });

  it("replays inbound and outbound dead-letter records through split endpoints", async () => {
    const inboundReplay = vi.fn(async (recordId: string) => ({
      id: recordId,
      status: "RECEIVED",
    }));
    const outboundReplay = vi.fn(async (recordId: string) => ({
      id: recordId,
      status: "PENDING",
    }));

    const app = fastify();
    registerRuntimeReliabilityRoutes(app, {
      inboundInboxService: {
        listByStatus: vi.fn(async () => []),
        replayFromStatus: inboundReplay,
      } as any,
      outboundOutboxService: {
        listByStatus: vi.fn(async () => []),
        replayFromStatus: outboundReplay,
      } as any,
      reliabilityStatusService: {
        getSnapshot: vi.fn(() => ({
          state: "HEALTHY",
          criticalCode: null,
          updatedAt: "2026-02-12T00:00:00.000Z",
          workers: {
            inboundForwarder: { running: true, lastError: null, lastErrorAt: null },
            outboundSender: { running: true, lastError: null, lastErrorAt: null },
          },
          locks: {
            inbox: {
              ownerId: "owner-1",
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-02-12T00:00:00.000Z",
              lastError: null,
            },
            outbox: {
              ownerId: "owner-2",
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-02-12T00:00:00.000Z",
              lastError: null,
            },
          },
        })),
      } as any,
    });

    const inboundResponse = await app.inject({
      method: "POST",
      url: "/api/runtime-reliability/v1/inbound/dead-letters/in-1/replay",
    });
    expect(inboundResponse.statusCode).toBe(202);
    expect(inboundReplay).toHaveBeenCalledWith("in-1", "DEAD_LETTER");

    const outboundResponse = await app.inject({
      method: "POST",
      url: "/api/runtime-reliability/v1/outbound/dead-letters/out-1/replay",
    });
    expect(outboundResponse.statusCode).toBe(202);
    expect(outboundReplay).toHaveBeenCalledWith("out-1", "DEAD_LETTER");

    await app.close();
  });

  it("returns 409 on replay status mismatch", async () => {
    const app = fastify();
    registerRuntimeReliabilityRoutes(app, {
      inboundInboxService: {
        listByStatus: vi.fn(async () => []),
        replayFromStatus: vi.fn(async () => {
          throw new Error(
            "Inbound record in-1 status mismatch: expected COMPLETED_UNBOUND, got DEAD_LETTER.",
          );
        }),
      } as any,
      outboundOutboxService: {
        listByStatus: vi.fn(async () => []),
        replayFromStatus: vi.fn(),
      } as any,
      reliabilityStatusService: {
        getSnapshot: vi.fn(() => ({
          state: "HEALTHY",
          criticalCode: null,
          updatedAt: "2026-02-12T00:00:00.000Z",
          workers: {
            inboundForwarder: { running: true, lastError: null, lastErrorAt: null },
            outboundSender: { running: true, lastError: null, lastErrorAt: null },
          },
          locks: {
            inbox: {
              ownerId: "owner-1",
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-02-12T00:00:00.000Z",
              lastError: null,
            },
            outbox: {
              ownerId: "owner-2",
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-02-12T00:00:00.000Z",
              lastError: null,
            },
          },
        })),
      } as any,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/runtime-reliability/v1/inbound/completed-unbound/in-1/replay",
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("REPLAY_STATUS_MISMATCH");

    await app.close();
  });
});
