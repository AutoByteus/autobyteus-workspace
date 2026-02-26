import { afterEach, describe, expect, it } from "vitest";
import { createDistributedRuntimeCoreDependencies } from "../../../src/distributed/bootstrap/distributed-runtime-core-dependencies.js";

const previousNodeId = process.env.AUTOBYTEUS_NODE_ID;

afterEach(() => {
  if (typeof previousNodeId === "string") {
    process.env.AUTOBYTEUS_NODE_ID = previousNodeId;
    return;
  }
  delete process.env.AUTOBYTEUS_NODE_ID;
});

describe("createDistributedRuntimeCoreDependencies", () => {
  it("builds host-scoped runtime dependencies using node id env", () => {
    process.env.AUTOBYTEUS_NODE_ID = "node-host-test";

    const deps = createDistributedRuntimeCoreDependencies();

    expect(deps.hostNodeId).toBe("node-host-test");
    expect(deps.nodeDirectoryService.getRequiredEntry("node-host-test")).toMatchObject({
      nodeId: "node-host-test",
    });
    expect(deps.teamEventAggregator).toBeTruthy();
    expect(deps.runScopedTeamBindingRegistry).toBeTruthy();
  });
});
