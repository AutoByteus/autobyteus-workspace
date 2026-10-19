import { describe, expect, it } from "vitest";
import {
  catalogCopyExecutionSource,
  projectTaskExecutionSource,
  taskExecutionListsOf,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import {
  effectiveMemberLaunchConfiguration,
  effectiveMemberLaunchSource,
  type TaskExecution,
  type TaskTeamExecutionSource,
} from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { parseTaskExecution } from "../../../../src/run-history/store/run-execution-tree-shared-record-schemas.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * DS-005 / REQ-005 / REQ-006: a recorded catalog-Team-copy member runs on its own recorded launch,
 * else its Team's; every projection reads it through `effectiveMemberLaunchConfiguration`. Records
 * written before per-member values existed (no member launch, no sources) read unchanged and
 * restore on the Team's value.
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" };
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/work" };
const inherited = { origin: "inherited" as const, fallbacks: [] };
const fromAgent = { origin: "agent_default" as const, fallbacks: [] };
const startedAt = "2026-10-12T00:00:00.000Z";

const copySource: TaskTeamExecutionSource = {
  kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead" as never, handoffs: [],
  defaultLaunchConfiguration: claude, defaultLaunchSource: inherited,
  members: [
    { address: "/se/lead" as never, agentDefinitionId: "lead" },
    { address: "/se/ie" as never, agentDefinitionId: "ie", launchConfiguration: codex, launchSource: fromAgent },
  ],
};
const teamCopy = {
  address: "/se", teamRunId: "copy", startedAt, taskExecutions: [], delegatorAgentRunId: "pm",
  members: [
    { address: "/se/lead", agentRunId: "copy-lead", platformAgentRunId: null },
    { address: "/se/ie", agentRunId: "copy-ie", platformAgentRunId: null },
  ],
  source: copySource,
} as unknown as TaskExecution;

describe("effective member launch (server records)", () => {
  it("is the member's own launch and source, else the Team's; null source when not recorded", () => {
    expect(effectiveMemberLaunchConfiguration(copySource, copySource.members[1]!)).toBe(codex);
    expect(effectiveMemberLaunchConfiguration(copySource, copySource.members[0]!)).toBe(claude);
    expect(effectiveMemberLaunchSource(copySource, copySource.members[1]!)).toBe(fromAgent);
    expect(effectiveMemberLaunchSource(copySource, copySource.members[0]!)).toBe(inherited);
    expect(effectiveMemberLaunchSource({}, {})).toBeNull();
  });

  it("AC-007: a catalog Team copy restores and reports each member on its recorded launch", () => {
    const projected = projectTaskExecutionSource("/se" as never, copySource);
    expect(projected.kind === "agent_team" && projected.node.children.map((child) => child.kind === "agent" && child.llmModelIdentifier))
      .toEqual(["opus", "sol-6.1"]);
    expect(projected.kind === "agent_team" && projected.node.defaultLaunchConfiguration).toBe(claude);
    const lists = taskExecutionListsOf({ taskExecutions: [teamCopy] });
    expect(catalogCopyExecutionSource(lists, "copy-ie")).toEqual({ agentDefinitionId: "ie", launchConfiguration: codex });
    expect(catalogCopyExecutionSource(lists, "copy-lead")).toEqual({ agentDefinitionId: "lead", launchConfiguration: claude });
  });
});

describe("recorded per-member launch (Directly Usable — No Migration)", () => {
  it("reads and writes the optional fields exactly", () => {
    expect(parseTaskExecution(JSON.parse(JSON.stringify(teamCopy)), "task")).toEqual(teamCopy);
  });

  it("AC-009: a record of the shape written before this change reads unchanged; members restore on the Team value, source not recorded", () => {
    const oldCopy = {
      address: "/se", teamRunId: "copy", startedAt, taskExecutions: [],
      members: [{ address: "/se/lead", agentRunId: "copy-lead", platformAgentRunId: null }],
      source: { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead",
        members: [{ address: "/se/lead", agentDefinitionId: "lead" }], handoffs: [], defaultLaunchConfiguration: claude },
    };
    expect(parseTaskExecution(oldCopy, "task")).toEqual(oldCopy);
    const projected = projectTaskExecutionSource("/se" as never, oldCopy.source as never);
    expect(projected.kind === "agent_team" && projected.node.children.map((child) => child.kind === "agent" && child.llmModelIdentifier)).toEqual(["opus"]);
  });

  it("rejects a malformed recorded source", () => {
    const bad = (launchSource: unknown) => ({ ...JSON.parse(JSON.stringify(teamCopy)), source: { ...copySource, defaultLaunchSource: launchSource } });
    expect(() => parseTaskExecution(bad({ origin: "somewhere", fallbacks: [] }), "c")).toThrow("c.source.defaultLaunchSource.origin");
    expect(() => parseTaskExecution(bad({ origin: "inherited" }), "c")).toThrow("missing required field(s): fallbacks");
    expect(() => parseTaskExecution(bad({ origin: "inherited", fallbacks: [{ layer: "inherited", runtimeKind: null, llmModelIdentifier: null, reason: "incomplete", detail: "x" }] }), "c"))
      .toThrow("fallbacks[0].layer");
  });
});
