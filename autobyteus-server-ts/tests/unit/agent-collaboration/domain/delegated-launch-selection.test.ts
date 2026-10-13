import { describe, expect, it } from "vitest";
import {
  applyDelegatedLaunchSelectionsToCollaborators,
  applyDelegatedLaunchSelectionsToTaskExecutions,
  delegatedLaunchSelections,
  recordedDelegatedLaunchSelections,
  resolveDelegatedLaunchTargets,
  type DelegatedLaunchForest,
  type DelegatedTaskSourceReader,
} from "../../../../src/agent-collaboration/domain/delegated-launch-selection.js";
import { delegatedStopSet } from "../../../../src/agent-collaboration/domain/delegated-stop-set.js";
import type {
  CollaboratorEntry,
  TaskExecution,
  TaskTeamExecution,
} from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentTeamNode } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" };
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/work" };
const at = "2026-10-13T00:00:00.000Z";
const agentNode = (address: string, launch = claude) => ({ kind: "agent" as const, address: address as never, agentDefinitionId: address, agentRunId: "pending", platformAgentRunId: null, role: null, description: null, ...launch });
const seTeam: TeamRunAgentTeamNode = {
  kind: "agent_team", address: "/se" as never, teamDefinitionId: "se", teamRunId: "pending", coordinatorAddress: "/se/lead" as never,
  defaultLaunchConfiguration: claude,
  children: [agentNode("/se/lead"), agentNode("/se/ie", codex)],
};
const readTaskSource: DelegatedTaskSourceReader = (address) => address === "/se"
  ? { kind: "agent_team", node: seTeam, followerAddresses: ["/se/lead"] as never }
  : address === "/writer" || address === "/se/ie" ? { kind: "agent", node: codex } : null;

const helper: TaskExecution = { address: "/writer" as never, agentRunId: "helper", platformAgentRunId: null, delegatorAgentRunId: "copy-ie", startedAt: at };
const nestedHelper: TaskExecution = { address: "/writer" as never, agentRunId: "helper-2", platformAgentRunId: null, delegatorAgentRunId: "helper", startedAt: at };
const hosted: TaskExecution = { address: "/se/ie" as never, agentRunId: "hosted", platformAgentRunId: null, startedAt: at };
const seCopy: TaskTeamExecution = {
  address: "/se" as never, teamRunId: "se-copy", startedAt: at, delegatorAgentRunId: "pm",
  members: [
    { address: "/se/lead" as never, agentRunId: "copy-lead", platformAgentRunId: null },
    { address: "/se/ie" as never, agentRunId: "copy-ie", platformAgentRunId: null, userLaunchSelection: { llmModelIdentifier: "sol-6.1-mini", llmConfig: null, selectedAt: at } },
  ],
  taskExecutions: [hosted],
};
const older: TaskExecution = { address: "/writer" as never, agentRunId: "older", platformAgentRunId: null, startedAt: at };
const unrelated: TaskExecution = { address: "/writer" as never, agentRunId: "unrelated", platformAgentRunId: null, delegatorAgentRunId: "pm", startedAt: at };
const reviewer: CollaboratorEntry = {
  kind: "agent", address: "/reviewer" as never, agentDefinitionId: "reviewer", agentRunId: "reviewer-run", platformAgentRunId: null,
  launchConfiguration: claude, addedAt: at, addedViaAgentRunId: "pm",
};
const reviewerCopy: TaskExecution = { address: "/writer" as never, agentRunId: "reviewer-helper", platformAgentRunId: null, delegatorAgentRunId: "reviewer-run", startedAt: at };
const rootTasks = [seCopy, helper, nestedHelper, older, unrelated, reviewerCopy];
const forest: DelegatedLaunchForest = { collaborators: [reviewer], taskExecutionLists: [rootTasks] };
const choice = { llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" } };

describe("resolveDelegatedLaunchTargets", () => {
  it("resolves an agent copy, a Team copy, a Team copy member and a collaborator with their stop units and current launches", () => {
    const targets = resolveDelegatedLaunchTargets({ forest, readTaskSource, changes: [
      { agentRunId: "helper", selection: choice },
      { teamRunId: "se-copy", selection: choice },
      { agentRunId: "copy-ie", selection: choice },
      { agentRunId: "copy-lead", selection: choice },
      { agentRunId: "reviewer-run", selection: choice },
    ] });
    expect(targets.map((target) => [target.scope, target.runId, target.stopUnit])).toEqual([
      ["agent", "helper", { kind: "task_execution", reference: { agentRunId: "helper" } }],
      ["team", "se-copy", { kind: "task_execution", reference: { teamRunId: "se-copy" } }],
      ["agent", "copy-ie", { kind: "task_execution", reference: { teamRunId: "se-copy" } }],
      ["agent", "copy-lead", { kind: "task_execution", reference: { teamRunId: "se-copy" } }],
      ["agent", "reviewer-run", { kind: "collaborator", address: "/reviewer", agentRunIds: ["reviewer-run"] }],
    ]);
    // The current model is the effective one (an existing selection counts); the runtime is the started one.
    expect(targets[2]!.current).toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1-mini" });
    expect(targets[0]!.current).toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" });
    expect(targets[1]!.current).toMatchObject({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" });
  });

  it("refuses configured members, unknown runs, ambiguous or repeated changes and closed copies", () => {
    const resolve = (changes: Parameters<typeof resolveDelegatedLaunchTargets>[0]["changes"], isClosed?: () => boolean) =>
      () => resolveDelegatedLaunchTargets({ forest, readTaskSource, changes, isClosed });
    expect(resolve([{ agentRunId: "pm", selection: choice }])).toThrow(/not an open delegated copy/);
    expect(resolve([{ agentRunId: "helper", teamRunId: "se-copy", selection: choice }])).toThrow(/exactly one/);
    expect(resolve([{ selection: choice }])).toThrow(/exactly one/);
    expect(resolve([{ agentRunId: "helper", selection: choice }, { agentRunId: "helper", selection: choice }])).toThrow(/repeated/);
    expect(resolve([{ agentRunId: "helper", selection: choice }], () => true)).toThrow(/closed Task work/);
  });
});

describe("applyDelegatedLaunchSelections", () => {
  it("records only the selection fields and leaves started values and unrelated records untouched", () => {
    const targets = resolveDelegatedLaunchTargets({ forest, readTaskSource, changes: [
      { teamRunId: "se-copy", selection: choice }, { agentRunId: "hosted", selection: { llmModelIdentifier: "x", llmConfig: null } },
      { agentRunId: "reviewer-run", selection: choice },
    ] });
    const selections = delegatedLaunchSelections(targets, at);
    const tasks = applyDelegatedLaunchSelectionsToTaskExecutions(rootTasks, selections);
    const team = tasks[0] as TaskTeamExecution;
    expect(team.userTeamLaunchSelection).toEqual({ ...choice, selectedAt: at });
    expect(team.members).toEqual(seCopy.members);
    expect(team.taskExecutions[0]).toEqual({ ...hosted, userLaunchSelection: { llmModelIdentifier: "x", llmConfig: null, selectedAt: at } });
    expect(tasks.slice(1)).toEqual(rootTasks.slice(1));
    expect(tasks[1]).toBe(rootTasks[1]);
    const [entry] = applyDelegatedLaunchSelectionsToCollaborators([reviewer], selections);
    expect(entry).toEqual({ ...reviewer, userLaunchSelection: { ...choice, selectedAt: at } });
  });

  it("keeps a record unchanged when the same model and settings are chosen again", () => {
    const same = delegatedLaunchSelections([{ scope: "agent", runId: "copy-ie", selection: { llmModelIdentifier: "sol-6.1-mini", llmConfig: null } }], "2026-10-14T00:00:00.000Z");
    expect(applyDelegatedLaunchSelectionsToTaskExecutions(rootTasks, same)).toStrictEqual(rootTasks);
  });

  it("reads the committed choices back for the live view: an equal choice keeps its earlier recorded time", () => {
    const later = "2026-10-14T00:00:00.000Z";
    const selections = delegatedLaunchSelections([
      { scope: "team", runId: "se-copy", selection: choice },
      { scope: "agent", runId: "copy-ie", selection: { llmModelIdentifier: "sol-6.1-mini", llmConfig: null } },
      { scope: "agent", runId: "reviewer-run", selection: choice },
    ], later);
    const committed: DelegatedLaunchForest = {
      collaborators: applyDelegatedLaunchSelectionsToCollaborators([reviewer], selections),
      taskExecutionLists: [applyDelegatedLaunchSelectionsToTaskExecutions(rootTasks, selections)],
    };
    expect(recordedDelegatedLaunchSelections(committed, selections)).toEqual([
      { reference: { agentRunId: "reviewer-run" }, selection: { ...choice, selectedAt: later } },
      { reference: { teamRunId: "se-copy" }, selection: { ...choice, selectedAt: later } },
      { reference: { agentRunId: "copy-ie" }, selection: { llmModelIdentifier: "sol-6.1-mini", llmConfig: null, selectedAt: at } },
    ]);
    expect(recordedDelegatedLaunchSelections(forest, delegatedLaunchSelections([], later))).toEqual([]);
  });
});

describe("delegatedStopSet (AR-002)", () => {
  it("stops a Team copy with the copies its agents started and the copies it hosts, innermost first", () => {
    const set = delegatedStopSet(forest, { teamRunId: "se-copy" })!;
    expect(set.collaborator).toBeNull();
    expect(set.executions).toEqual([{ agentRunId: "helper-2" }, { agentRunId: "hosted" }, { agentRunId: "helper" }, { teamRunId: "se-copy" }]);
    expect([...set.agentRunIds].sort()).toEqual(["copy-ie", "copy-lead", "helper", "helper-2", "hosted"]);
    expect(set.unattributed).toEqual([{ agentRunId: "older" }]);
  });

  it("stops a collaborator with its own copies, never its delegator's other copies", () => {
    const set = delegatedStopSet(forest, { agentRunId: "reviewer-run" })!;
    expect(set.collaborator).toEqual({ address: "/reviewer", agentRunIds: ["reviewer-run"] });
    expect(set.executions).toEqual([{ agentRunId: "reviewer-helper" }]);
  });

  it("stops an agent copy alone when it started nothing; null for a run that is no copy or collaborator", () => {
    expect(delegatedStopSet(forest, { agentRunId: "unrelated" })!.executions).toEqual([{ agentRunId: "unrelated" }]);
    expect(delegatedStopSet(forest, { agentRunId: "pm" })).toBeNull();
    expect(delegatedStopSet(forest, { agentRunId: "copy-ie" })).toBeNull();
  });

  it("includes copies hosted by a collaborator Team", () => {
    const team: CollaboratorEntry = {
      kind: "agent_team", address: "/qa" as never, teamDefinitionId: "qa", teamRunId: "qa-run", coordinatorAddress: "/qa/lead" as never,
      defaultLaunchConfiguration: claude, handoffs: [], addedAt: at, addedViaAgentRunId: "pm",
      members: [{ address: "/qa/lead" as never, agentDefinitionId: "lead", agentRunId: "qa-lead", platformAgentRunId: null }],
      taskExecutions: [{ address: "/qa/lead" as never, agentRunId: "qa-extra", platformAgentRunId: null, startedAt: at }],
    };
    const set = delegatedStopSet({ collaborators: [team], taskExecutionLists: [[], team.taskExecutions] }, { teamRunId: "qa-run" })!;
    expect(set.collaborator?.agentRunIds).toEqual(["qa-lead"]);
    expect(set.executions).toEqual([{ agentRunId: "qa-extra" }]);
  });
});
