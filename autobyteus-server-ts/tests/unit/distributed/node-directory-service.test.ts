import { describe, expect, it } from "vitest";
import {
  NodeDirectoryService,
  UnknownNodeDirectoryEntryError,
} from "../../../src/distributed/node-directory/node-directory-service.js";

describe("NodeDirectoryService", () => {
  it("resolves distributed command/event URLs by nodeId", () => {
    const service = new NodeDirectoryService([
      {
        nodeId: "node-host",
        baseUrl: "http://localhost:8000/",
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-worker",
        baseUrl: "http://192.168.1.15:8000",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    expect(service.resolveDistributedCommandUrl("node-worker")).toBe(
      "http://192.168.1.15:8000/internal/distributed/v1/commands",
    );
    expect(service.resolveDistributedEventUrl("node-host")).toBe(
      "http://localhost:8000/internal/distributed/v1/events",
    );
    expect(service.resolveTeamHistoryCleanupUrl("node-worker")).toBe(
      "http://192.168.1.15:8000/internal/distributed/v1/team-history/cleanup",
    );
    expect(service.resolveTeamHistoryRuntimeStateProbeUrl("node-host")).toBe(
      "http://localhost:8000/internal/distributed/v1/team-history/runtime-state",
    );
  });

  it("throws for unknown node ids", () => {
    const service = new NodeDirectoryService([
      {
        nodeId: "node-host",
        baseUrl: "http://localhost:8000",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    expect(() => service.resolveDistributedCommandUrl("missing")).toThrowError(
      UnknownNodeDirectoryEntryError,
    );
  });

  it("removes non-protected entries", () => {
    const service = new NodeDirectoryService([
      {
        nodeId: "node-host",
        baseUrl: "http://localhost:8000",
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-worker",
        baseUrl: "http://localhost:8100",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    expect(service.removeEntry("node-worker")).toBe(true);
    expect(service.getEntry("node-worker")).toBeNull();
  });

  it("does not remove protected entries", () => {
    const service = new NodeDirectoryService(
      [
        {
          nodeId: "node-host",
          baseUrl: "http://localhost:8000",
          isHealthy: true,
          supportsAgentExecution: true,
        },
      ],
      { protectedNodeIds: ["node-host"] },
    );

    expect(service.removeEntry("node-host")).toBe(false);
    expect(service.getEntry("node-host")).not.toBeNull();
  });
});
