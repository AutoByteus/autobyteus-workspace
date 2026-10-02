import { describe, expect, it } from "vitest";
import {
  catalogCopyExecutionSource,
  taskExecutionListsOf,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecution } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const startedAt = "2026-10-01T00:00:00.000Z";
const nestedAgentCopy = {
  address: "/writer", agentRunId: "writer-copy", platformAgentRunId: null, startedAt,
  source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch },
} as unknown as TaskExecution;
const teamCopy = {
  address: "/product_team", teamRunId: "copy", startedAt,
  members: [{ address: "/product_team/lead", agentRunId: "copy-lead", platformAgentRunId: null }],
  taskExecutions: [nestedAgentCopy],
  source: {
    kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
    members: [{ address: "/product_team/lead", agentDefinitionId: "lead" }], handoffs: [], defaultLaunchConfiguration: launch,
  },
} as unknown as TaskExecution;
const extraCopy = { address: "/code_reviewer", agentRunId: "reviewer-copy", platformAgentRunId: null, startedAt } as unknown as TaskExecution;

describe("catalogCopyExecutionSource (REQ-011 read side)", () => {
  it("finds a catalog copy's Agent, a catalog Team copy's member and a copy nested in a copy", () => {
    const lists = taskExecutionListsOf({ taskExecutions: [extraCopy, teamCopy], collaborators: [] });
    expect(catalogCopyExecutionSource(lists, "copy-lead")).toEqual({ agentDefinitionId: "lead", launchConfiguration: launch });
    expect(catalogCopyExecutionSource(lists, "writer-copy")).toEqual({ agentDefinitionId: "writer", launchConfiguration: launch });
  });

  it("returns null for copies without a recorded source and for unknown runs", () => {
    const lists = taskExecutionListsOf({ taskExecutions: [extraCopy, teamCopy], collaborators: [] });
    expect(catalogCopyExecutionSource(lists, "reviewer-copy")).toBeNull();
    expect(catalogCopyExecutionSource(lists, "nobody")).toBeNull();
  });
});
