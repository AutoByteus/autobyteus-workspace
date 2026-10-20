import { describe, expect, it } from "vitest";
import {
  parseTaskExecution,
  validateCopyLayouts,
} from "../../../../src/run-history/store/run-execution-tree-shared-record-schemas.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null };
const startedAt = "2026-10-01T00:00:00.000Z";
const teamSource = {
  kind: "agent_team", teamDefinitionId: "product", coordinatorAddress: "/product_team/lead",
  members: [
    { address: "/product_team/lead", agentDefinitionId: "lead", launchConfiguration: launch, followsTeam: true },
    { address: "/product_team/designer", agentDefinitionId: "designer", launchConfiguration: launch, followsTeam: true },
  ],
  handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["UI work"] }],
  defaultLaunchConfiguration: launch,
};
const teamCopy = (source: unknown = teamSource) => ({
  address: "/product_team", teamRunId: "copy", startedAt, taskExecutions: [], delegatorAgentRunId: "pm",
  members: [
    { address: "/product_team/lead", agentRunId: "copy-lead", platformAgentRunId: null },
    { address: "/product_team/designer", agentRunId: "copy-designer", platformAgentRunId: null },
  ],
  source,
});

describe("task execution source (every copy records its snapshot)", () => {
  it("parses a source exactly (unknown fields dropped)", () => {
    const agent = parseTaskExecution({
      address: "/writer", agentRunId: "w", platformAgentRunId: null, startedAt,
      source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch, extra: "dropped" },
    }, "task");
    expect(agent).toEqual({
      address: "/writer", agentRunId: "w", platformAgentRunId: null, startedAt,
      source: { kind: "agent", agentDefinitionId: "writer", launchConfiguration: launch },
    });
    expect(parseTaskExecution(teamCopy(), "task")).toEqual(teamCopy());
  });

  it("requires a source on every copy", () => {
    const { source: _source, ...sourceless } = teamCopy();
    expect(() => parseTaskExecution(sourceless, "task")).toThrow("missing required field(s): source");
    expect(() => parseTaskExecution({ address: "/writer", agentRunId: "w", platformAgentRunId: null, startedAt }, "task"))
      .toThrow("missing required field(s): source");
  });

  it("rejects a malformed source", () => {
    expect(() => parseTaskExecution(teamCopy({ ...teamSource, kind: "agent" }), "task")).toThrow("source.kind");
    expect(() => parseTaskExecution(teamCopy({ ...teamSource, coordinatorAddress: "/product_team/nobody" }), "task")).toThrow("coordinatorAddress");
    expect(() => parseTaskExecution(teamCopy({
      ...teamSource, members: [...teamSource.members, { address: "/elsewhere/x", agentDefinitionId: "x", launchConfiguration: launch, followsTeam: true }],
    }), "task")).toThrow("is not a direct member");
  });

  it("validates a Team copy's layout against its own source", () => {
    const copy = parseTaskExecution(teamCopy(), "task");
    expect(() => validateCopyLayouts([{ taskExecutions: [copy] }])).not.toThrow();
    const mismatched = { ...copy, members: copy.members.slice(0, 1) };
    expect(() => validateCopyLayouts([{ taskExecutions: [mismatched as typeof copy] }])).toThrow("does not match its source");
  });
});
