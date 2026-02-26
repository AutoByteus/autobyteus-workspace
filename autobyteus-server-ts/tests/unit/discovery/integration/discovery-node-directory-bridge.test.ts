import { describe, expect, it } from "vitest";
import { NodeDirectoryService } from "../../../../src/distributed/node-directory/node-directory-service.js";
import { DiscoveryNodeDirectoryBridge } from "../../../../src/discovery/integration/discovery-node-directory-bridge.js";
import { NodeDiscoveryRegistryService } from "../../../../src/discovery/services/node-discovery-registry-service.js";

describe("DiscoveryNodeDirectoryBridge", () => {
  it("upserts discovered peers into node directory and prunes missing peers", () => {
    const nodeDirectoryService = new NodeDirectoryService(
      [
        {
          nodeId: "host-node",
          baseUrl: "http://127.0.0.1:8000",
          isHealthy: true,
          supportsAgentExecution: true,
        },
      ],
      { protectedNodeIds: ["host-node"] },
    );
    const discoveryRegistryService = new NodeDiscoveryRegistryService();
    const bridge = new DiscoveryNodeDirectoryBridge({
      hostNodeId: "host-node",
      nodeDirectoryService,
      discoveryRegistryService,
    });

    bridge.start();

    discoveryRegistryService.announce({
      nodeId: "worker-1",
      nodeName: "Worker One",
      baseUrl: "http://10.0.0.21:8000",
    });

    expect(nodeDirectoryService.getEntry("worker-1")).toMatchObject({
      nodeId: "worker-1",
      baseUrl: "http://10.0.0.21:8000",
      isHealthy: true,
      supportsAgentExecution: true,
    });

    discoveryRegistryService.mergePeers([]);

    expect(nodeDirectoryService.getEntry("worker-1")).toBeNull();
    expect(nodeDirectoryService.getEntry("host-node")).not.toBeNull();

    bridge.stop();
  });
});

