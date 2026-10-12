import { describe, expect, it } from "vitest";
import {
  catalogCopyExecutionSource,
  collaboratorExecutionSource,
  projectCollaboratorTeamNode,
  projectTaskExecutionSource,
  projectTaskSourceMember,
  resolveCollaboratorCopySource,
  taskExecutionListsOf,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import {
  effectiveMemberLaunchConfiguration,
  effectiveMemberLaunchSource,
  type CollaboratorEntry,
  type CollaboratorTeamEntry,
  type TaskExecution,
  type TaskTeamExecutionSource,
} from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import {
  parseCollaboratorEntry,
  parseTaskExecution,
} from "../../../../src/run-history/store/run-execution-tree-shared-record-schemas.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * DS-005 / REQ-005 / REQ-006: a recorded collaborator-Team or catalog-Team-copy member runs on its
 * own recorded launch, else its Team's; every projection reads it through
 * `effectiveMemberLaunchConfiguration`. Records written before per-member values existed (no
 * member launch, no sources) read unchanged and restore on the Team's value.
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" };
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/work" };
const inherited = { origin: "inherited" as const, fallbacks: [] };
const fromAgent = { origin: "agent_default" as const, fallbacks: [] };
const startedAt = "2026-10-12T00:00:00.000Z";

const collaboratorTeam: CollaboratorTeamEntry = {
  kind: "agent_team", address: "/se" as never, teamDefinitionId: "se", teamRunId: "se-run",
  coordinatorAddress: "/se/lead" as never, handoffs: [], taskExecutions: [],
  defaultLaunchConfiguration: claude, defaultLaunchSource: inherited,
  members: [
    { address: "/se/lead" as never, agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null },
    { address: "/se/ie" as never, agentDefinitionId: "ie", agentRunId: "ie-run", platformAgentRunId: null, launchConfiguration: codex, launchSource: fromAgent },
  ],
  addedAt: startedAt, addedViaAgentRunId: "pm",
};
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
    expect(effectiveMemberLaunchConfiguration(collaboratorTeam, collaboratorTeam.members[1]!)).toBe(codex);
    expect(effectiveMemberLaunchConfiguration(collaboratorTeam, collaboratorTeam.members[0]!)).toBe(claude);
    expect(effectiveMemberLaunchSource(collaboratorTeam, collaboratorTeam.members[1]!)).toBe(fromAgent);
    expect(effectiveMemberLaunchSource(collaboratorTeam, collaboratorTeam.members[0]!)).toBe(inherited);
    expect(effectiveMemberLaunchSource({}, {})).toBeNull();
  });

  it("AC-007: hosting, extra copies and teammate delegation of a collaborator Team use each member's recorded launch", () => {
    const children = projectCollaboratorTeamNode(collaboratorTeam).children;
    expect(children.map((child) => child.kind === "agent" && child.llmModelIdentifier)).toEqual(["opus", "sol-6.1"]);
    const copy = resolveCollaboratorCopySource([collaboratorTeam], "/se");
    expect(copy?.kind === "agent_team" && copy.node.children.map((child) => child.kind === "agent" && child.runtimeKind))
      .toEqual([RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER]);
    expect(resolveCollaboratorCopySource([collaboratorTeam], "/se/ie")?.node).toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" } });
    expect(resolveCollaboratorCopySource([collaboratorTeam], "/se/lead")?.node).toMatchObject({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
    expect(collaboratorExecutionSource([collaboratorTeam], "/se/ie")).toEqual({ agentDefinitionId: "ie", launchConfiguration: codex });
    expect(collaboratorExecutionSource([collaboratorTeam], "/se/lead")).toEqual({ agentDefinitionId: "lead", launchConfiguration: claude });
  });

  it("AC-007: a catalog Team copy restores, delegates teammates and reports each member on its recorded launch", () => {
    const projected = projectTaskExecutionSource("/se" as never, copySource);
    expect(projected.kind === "agent_team" && projected.node.children.map((child) => child.kind === "agent" && child.llmModelIdentifier))
      .toEqual(["opus", "sol-6.1"]);
    expect(projected.kind === "agent_team" && projected.node.defaultLaunchConfiguration).toBe(claude);
    expect(projectTaskSourceMember(copySource, "/se/ie" as never)).toEqual({ kind: "agent", agentDefinitionId: "ie", launchConfiguration: codex });
    expect(projectTaskSourceMember(copySource, "/se/lead" as never)).toEqual({ kind: "agent", agentDefinitionId: "lead", launchConfiguration: claude });
    const lists = taskExecutionListsOf({ taskExecutions: [teamCopy], collaborators: [] });
    expect(catalogCopyExecutionSource(lists, "copy-ie")).toEqual({ agentDefinitionId: "ie", launchConfiguration: codex });
    expect(catalogCopyExecutionSource(lists, "copy-lead")).toEqual({ agentDefinitionId: "lead", launchConfiguration: claude });
  });
});

describe("recorded per-member launch (Directly Usable — No Migration)", () => {
  it("reads and writes the new optional fields exactly", () => {
    const written = JSON.parse(JSON.stringify(collaboratorTeam));
    expect(parseCollaboratorEntry(written, "collaborators[0]")).toEqual(collaboratorTeam);
    // A member that runs on the Team's launch writes no launch keys.
    expect(Object.keys(written.members[0])).toEqual(["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"]);
    expect(Object.keys(written.members[1])).toEqual(["address", "agentDefinitionId", "agentRunId", "platformAgentRunId", "launchConfiguration", "launchSource"]);
    const fallback = { layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: null, reason: "incomplete", detail: "It names no model." };
    const agentEntry = {
      kind: "agent", address: "/writer", agentDefinitionId: "writer", agentRunId: "w", platformAgentRunId: null,
      launchConfiguration: claude, launchSource: { origin: "inherited", fallbacks: [fallback] }, addedAt: startedAt, addedViaAgentRunId: "pm",
    };
    expect(parseCollaboratorEntry(agentEntry, "collaborators[1]")).toEqual(agentEntry);
    expect(parseTaskExecution(JSON.parse(JSON.stringify(teamCopy)), "task")).toEqual(teamCopy);
  });

  it("AC-009: a record of the shape written before this change reads unchanged; members restore on the Team value, source not recorded", () => {
    const before = {
      kind: "agent_team", address: "/se", teamDefinitionId: "se", teamRunId: "se-run", coordinatorAddress: "/se/lead",
      members: [
        { address: "/se/lead", agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null },
        { address: "/se/ie", agentDefinitionId: "ie", agentRunId: "ie-run", platformAgentRunId: null },
      ],
      handoffs: [], defaultLaunchConfiguration: claude, taskExecutions: [], addedAt: startedAt, addedViaAgentRunId: "pm",
    };
    const entry = parseCollaboratorEntry(before, "collaborators[0]") as CollaboratorTeamEntry;
    expect(entry).toEqual(before);
    expect(entry.members.map((member) => effectiveMemberLaunchConfiguration(entry, member))).toEqual([claude, claude]);
    expect(entry.members.map((member) => effectiveMemberLaunchSource(entry, member))).toEqual([null, null]);
    expect(projectCollaboratorTeamNode(entry).children.map((child) => child.kind === "agent" && child.llmModelIdentifier)).toEqual(["opus", "opus"]);
    const oldCopy = {
      address: "/se", teamRunId: "copy", startedAt, taskExecutions: [],
      members: [{ address: "/se/lead", agentRunId: "copy-lead", platformAgentRunId: null }],
      source: { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead",
        members: [{ address: "/se/lead", agentDefinitionId: "lead" }], handoffs: [], defaultLaunchConfiguration: claude },
    };
    const parsedCopy = parseTaskExecution(oldCopy, "task");
    expect(parsedCopy).toEqual(oldCopy);
    const oldAgent = { kind: "agent", address: "/w", agentDefinitionId: "w", agentRunId: "w", platformAgentRunId: null, launchConfiguration: claude, addedAt: startedAt, addedViaAgentRunId: "pm" };
    expect(parseCollaboratorEntry(oldAgent, "c") as CollaboratorEntry).toEqual(oldAgent);
  });

  it("rejects a malformed recorded source", () => {
    const bad = (launchSource: unknown) => ({ ...JSON.parse(JSON.stringify(collaboratorTeam)), defaultLaunchSource: launchSource });
    expect(() => parseCollaboratorEntry(bad({ origin: "somewhere", fallbacks: [] }), "c")).toThrow("c.defaultLaunchSource.origin");
    expect(() => parseCollaboratorEntry(bad({ origin: "inherited" }), "c")).toThrow("missing required field(s): fallbacks");
    expect(() => parseCollaboratorEntry(bad({ origin: "inherited", fallbacks: [{ layer: "inherited", runtimeKind: null, llmModelIdentifier: null, reason: "incomplete", detail: "x" }] }), "c"))
      .toThrow("fallbacks[0].layer");
  });
});
