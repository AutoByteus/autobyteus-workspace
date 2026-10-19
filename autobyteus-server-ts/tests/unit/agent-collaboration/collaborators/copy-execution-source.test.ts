import { describe, expect, it } from "vitest";
import {
  copyExecutionSource,
  taskExecutionListsOf,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecution } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const own = { ...launch, llmModelIdentifier: "own" };
const startedAt = "2026-10-01T00:00:00.000Z";
const nestedAgentCopy = {
  address: "/writer", agentRunId: "writer-copy", platformAgentRunId: null, startedAt,
  source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch },
} as unknown as TaskExecution;
const teamCopy = {
  address: "/product_team", teamRunId: "copy", startedAt,
  members: [
    { address: "/product_team/lead", agentRunId: "copy-lead", platformAgentRunId: null },
    { address: "/product_team/designer", agentRunId: "copy-designer", platformAgentRunId: null },
  ],
  taskExecutions: [nestedAgentCopy],
  source: {
    kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
    members: [
      { address: "/product_team/lead", agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true },
      { address: "/product_team/designer", agentDefinitionId: "designer", launchConfiguration: own, followsTeam: false },
    ],
    handoffs: [], defaultLaunchConfiguration: launch,
  },
} as unknown as TaskExecution;
/** A copy of a configured placement: its own recorded snapshot, with the configured origin. */
const configuredCopy = {
  address: "/code_reviewer", agentRunId: "reviewer-copy", platformAgentRunId: null, startedAt,
  source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: own, launchSource: { origin: "configured", fallbacks: [] } },
} as unknown as TaskExecution;

describe("copyExecutionSource (REQ-001, REQ-004 read side)", () => {
  it("finds a copied Agent, a Team copy's member with its own complete launch, and a copy nested in a copy", () => {
    const lists = taskExecutionListsOf({ taskExecutions: [configuredCopy, teamCopy] });
    expect(copyExecutionSource(lists, "copy-lead")).toEqual({ agentDefinitionId: "lead", launchConfiguration: launch });
    expect(copyExecutionSource(lists, "copy-designer")).toEqual({ agentDefinitionId: "designer", launchConfiguration: own });
    expect(copyExecutionSource(lists, "writer-copy")).toEqual({ agentDefinitionId: "writer", launchConfiguration: launch });
  });

  it("reads a copy of a configured placement from its own source; unknown runs are null", () => {
    const lists = taskExecutionListsOf({ taskExecutions: [configuredCopy, teamCopy] });
    expect(copyExecutionSource(lists, "reviewer-copy")).toEqual({ agentDefinitionId: "reviewer", launchConfiguration: own });
    expect(copyExecutionSource(lists, "nobody")).toBeNull();
  });
});
