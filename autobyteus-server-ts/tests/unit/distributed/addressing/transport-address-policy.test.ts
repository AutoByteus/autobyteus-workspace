import { describe, expect, it } from "vitest";
import { NodeDirectoryService } from "../../../../src/distributed/node-directory/node-directory-service.js";
import {
  normalizeDistributedBaseUrl,
  resolveRemoteTargetForCommandDispatch,
  resolveRemoteTargetForEventUplink,
} from "../../../../src/distributed/addressing/transport-address-policy.js";

describe("transport address policy", () => {
  it("normalizes distributed base URLs and strips trailing /rest", () => {
    expect(normalizeDistributedBaseUrl("http://host.docker.internal:8000/rest/")).toBe(
      "http://host.docker.internal:8000",
    );
    expect(normalizeDistributedBaseUrl("http://localhost:8000")).toBe("http://localhost:8000");
    expect(normalizeDistributedBaseUrl("not-a-url")).toBeNull();
  });

  it("uses bootstrap fallback when event target node is missing", () => {
    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-worker-8001",
        baseUrl: "http://localhost:8001",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const outcome = resolveRemoteTargetForEventUplink({
      localNodeId: "node-worker-8001",
      targetNodeId: "node-host-8000",
      nodeDirectoryService,
      discoveryRegistryUrl: "http://host.docker.internal:8000/rest/",
    });

    expect(outcome).toMatchObject({
      resolved: true,
      source: "bootstrap_fallback",
      baseUrl: "http://host.docker.internal:8000",
      rewritten: false,
    });
    expect(nodeDirectoryService.getRequiredEntry("node-host-8000").baseUrl).toBe(
      "http://host.docker.internal:8000",
    );
  });

  it("rewrites loopback event target entry for remote nodes", () => {
    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-worker-8001",
        baseUrl: "http://localhost:8001",
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-host-8000",
        baseUrl: "http://localhost:8000",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const outcome = resolveRemoteTargetForEventUplink({
      localNodeId: "node-worker-8001",
      targetNodeId: "node-host-8000",
      nodeDirectoryService,
      distributedUplinkBaseUrl: "http://host.docker.internal:8000",
    });

    expect(outcome).toMatchObject({
      resolved: true,
      source: "directory_rewritten_loopback",
      baseUrl: "http://host.docker.internal:8000",
      rewritten: true,
    });
    expect(nodeDirectoryService.getRequiredEntry("node-host-8000").baseUrl).toBe(
      "http://host.docker.internal:8000",
    );
  });

  it("fails event target resolution when neither directory entry nor fallback exists", () => {
    const nodeDirectoryService = new NodeDirectoryService([]);
    const outcome = resolveRemoteTargetForEventUplink({
      localNodeId: "node-worker-8001",
      targetNodeId: "node-host-8000",
      nodeDirectoryService,
    });
    expect(outcome).toMatchObject({
      resolved: false,
      source: "unresolved",
      reason: "TARGET_NODE_MISSING_NO_FALLBACK",
    });
  });

  it("fails event target resolution when target node is local", () => {
    const nodeDirectoryService = new NodeDirectoryService([]);
    const outcome = resolveRemoteTargetForEventUplink({
      localNodeId: "node-worker-8001",
      targetNodeId: "node-worker-8001",
      nodeDirectoryService,
      discoveryRegistryUrl: "http://host.docker.internal:8000",
    });
    expect(outcome).toMatchObject({
      resolved: false,
      source: "unresolved",
      reason: "TARGET_NODE_IS_LOCAL",
    });
  });

  it("resolves command dispatch target from directory", () => {
    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-worker-8001",
        baseUrl: "http://localhost:8001",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);
    const outcome = resolveRemoteTargetForCommandDispatch({
      targetNodeId: "node-worker-8001",
      nodeDirectoryService,
    });
    expect(outcome).toMatchObject({
      resolved: true,
      source: "directory",
      baseUrl: "http://localhost:8001",
    });
  });

  it("fails command dispatch target resolution for unknown node", () => {
    const nodeDirectoryService = new NodeDirectoryService([]);
    const outcome = resolveRemoteTargetForCommandDispatch({
      targetNodeId: "missing",
      nodeDirectoryService,
    });
    expect(outcome).toMatchObject({
      resolved: false,
      source: "unresolved",
      reason: "TARGET_NODE_MISSING",
    });
  });
});
