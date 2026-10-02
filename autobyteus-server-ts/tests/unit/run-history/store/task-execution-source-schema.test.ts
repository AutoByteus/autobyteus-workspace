import { describe, expect, it } from "vitest";
import {
  parseTaskExecution,
  validateCollaboratorInvariants,
} from "../../../../src/run-history/store/run-execution-tree-shared-record-schemas.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const startedAt = "2026-10-01T00:00:00.000Z";
const teamSource = {
  kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
  members: [{ address: "/product_team/lead", agentDefinitionId: "lead" }, { address: "/product_team/designer", agentDefinitionId: "designer" }],
  handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["UI work"] }],
  defaultLaunchConfiguration: launch,
};
const teamCopy = (source: unknown = teamSource, withSource = true) => ({
  address: "/product_team", teamRunId: "copy", startedAt, taskExecutions: [], delegatorAgentRunId: "pm",
  members: [
    { address: "/product_team/lead", agentRunId: "copy-lead", platformAgentRunId: null },
    { address: "/product_team/designer", agentRunId: "copy-designer", platformAgentRunId: null },
  ],
  ...(withSource ? { source } : {}),
});

describe("task execution source (Directly Usable — No Migration)", () => {
  it("parses an optional source exactly; a record without one reads unchanged", () => {
    const agent = parseTaskExecution({
      address: "/writer", agentRunId: "w", platformAgentRunId: null, startedAt,
      source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch, extra: "dropped" },
    }, "task");
    expect(agent).toEqual({
      address: "/writer", agentRunId: "w", platformAgentRunId: null, startedAt,
      source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch },
    });
    expect(parseTaskExecution(teamCopy(), "task")).toEqual(teamCopy());
    const legacy = parseTaskExecution(teamCopy(teamSource, false), "task");
    expect("source" in legacy).toBe(false);
  });

  it("rejects a malformed source", () => {
    expect(() => parseTaskExecution(teamCopy({ ...teamSource, kind: "agent" }), "task")).toThrow("source.kind");
    expect(() => parseTaskExecution(teamCopy({ ...teamSource, coordinatorAddress: "/product_team/nobody" }), "task")).toThrow("coordinatorAddress");
    expect(() => parseTaskExecution(teamCopy({
      ...teamSource, members: [...teamSource.members, { address: "/elsewhere/x", agentDefinitionId: "x" }],
    }), "task")).toThrow("is not a direct member");
  });

  it("validates a catalog copy's layout against its own source, not a collaborator at the same address", () => {
    const copy = parseTaskExecution(teamCopy(), "task");
    const collaborator = {
      kind: "agent_team" as const, address: "/product_team" as never, teamDefinitionId: "product", teamRunId: "collab",
      coordinatorAddress: "/product_team/lead" as never,
      members: [{ address: "/product_team/lead" as never, agentDefinitionId: "lead", agentRunId: "c-lead", platformAgentRunId: null }],
      handoffs: [], defaultLaunchConfiguration: launch, taskExecutions: [], addedAt: startedAt, addedViaAgentRunId: "pm",
    };
    expect(() => validateCollaboratorInvariants({
      collaborators: [collaborator], reservedAddresses: [], otherRunIds: [], owners: [{ taskExecutions: [copy] }],
    })).not.toThrow();
    const mismatched = { ...copy, members: copy.members.slice(0, 1) };
    expect(() => validateCollaboratorInvariants({
      collaborators: [], reservedAddresses: [], otherRunIds: [], owners: [{ taskExecutions: [mismatched as typeof copy] }],
    })).toThrow("does not match its catalog source");
  });
});
