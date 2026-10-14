import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import type { TaskAgentExecution, TaskTeamExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { buildOrg } from "./helpers/org-task-root-harness.js";
import { bringIn, buildOrg as buildCollaboratorOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

/**
 * DS-001 / DS-002 on a live AgentOrg root (real tree, persistence, task lifecycle and root
 * registries; fake agent runtimes): the user stops a copy, chooses its model, and the next message
 * resumes it on that model. A running copy refuses the change (AR-001).
 */
const acceptingValidator = (gate?: Promise<void>): RunModelSelectionValidator => ({
  validate: vi.fn(),
  validateMany: vi.fn(async (inputs) => {
    await gate;
    return inputs.map((input) => ({ kind: "valid" as const, selection: { llmModelIdentifier: input.selection.llmModelIdentifier, llmConfig: input.selection.llmConfig as never } }));
  }),
}) as unknown as RunModelSelectionValidator;

const choice = { llmModelIdentifier: "bigger-model", llmConfig: { thinking: "high" } };

const startCopy = async (kind: "agent" | "team") => {
  const f = await buildOrg(kind);
  const director = { kind: "agent" as const, identity: f.handles.get("director")!.input.identity, displayName: "director" };
  await f.owner.delegateToNewCopy({ identity: director.identity }, { recipient_address: kind === "agent" ? "/worker" : "/target", description: "Complete the task" });
  await f.drain();
  const message = (targetAgentRunId: string) => f.owner.deliverExactAgentMessage({ sender: director, targetAgentRunId, content: "Continue" });
  const durable = async () => new AgentOrgExecutionIndex((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!);
  return { ...f, message, durable };
};

describe("AgentOrg delegated copy Stop and model choice", () => {
  it("refuses a running agent copy, stops it restorably, saves the choice and resumes it on the new model", async () => {
    const f = await startCopy("agent");
    const child = f.handles.get("task-agent-1")!;
    expect(f.rootAgents.isTaskLive("task-agent-1")).toBe(true);

    await expect(f.owner.updateDelegatedLaunchSelections([{ agentRunId: "task-agent-1", selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "COPY_RUNNING" });
    expect(((await f.durable()).getTaskExecution({ agentRunId: "task-agent-1" })!.source as TaskAgentExecution).userLaunchSelection).toBeUndefined();

    await expect(f.owner.stopDelegatedExecution({ agentRunId: "task-agent-1" })).resolves.toMatchObject({ outcome: "STOPPED", notStoppedUnattributed: 0 });
    expect(child.finish).toHaveBeenCalledOnce();
    expect(f.rootAgents.isTaskLive("task-agent-1")).toBe(false);
    // Restorable like idle shutdown: indexed, offline, its handle retained; the root and others keep running.
    expect(f.rootAgents.get("task-agent-1")).toBe(child.handle);
    expect(f.owner.isActive()).toBe(true);
    await expect(f.owner.stopDelegatedExecution({ agentRunId: "task-agent-1" })).resolves.toMatchObject({ outcome: "ALREADY_STOPPED" });

    const before = f.published.length;
    await expect(f.owner.updateDelegatedLaunchSelections([{ agentRunId: "task-agent-1", selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "UPDATED" });
    const recorded = (await f.durable()).getTaskExecution({ agentRunId: "task-agent-1" })!.source as TaskAgentExecution;
    expect(recorded.userLaunchSelection).toMatchObject(choice);
    // The live view learns the committed choice like any other tree mutation (CR-002).
    expect(f.published.slice(before).filter((event) => event.kind === "delegated_launch_selections_changed")).toEqual([
      { kind: "delegated_launch_selections_changed", selections: [{ reference: { agentRunId: "task-agent-1" }, selection: recorded.userLaunchSelection }] },
    ]);
    const afterSave = f.published.length;
    await expect(f.owner.updateDelegatedLaunchSelections([{ agentRunId: "task-agent-1", selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "UNCHANGED" });
    expect(f.published.slice(afterSave).some((event) => event.kind === "delegated_launch_selections_changed")).toBe(false);

    await expect(f.message("task-agent-1")).resolves.toMatchObject({ accepted: true });
    await f.drain();
    expect(child.handle.replaceModelChoice).toHaveBeenCalledWith(expect.objectContaining(choice));
    expect(f.rootAgents.isTaskLive("task-agent-1")).toBe(true);
    expect(f.failStop).not.toHaveBeenCalled();
  });

  it("stops a Team copy as one unit and restores its members on the Team's and their own choices", async () => {
    const f = await startCopy("team");
    expect(f.teams.get("task-team-1")).not.toBeNull();
    await expect(f.owner.updateDelegatedLaunchSelections([{ teamRunId: "task-team-1", selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "COPY_RUNNING" });

    await expect(f.owner.stopDelegatedExecution({ teamRunId: "task-team-1" })).resolves.toMatchObject({ outcome: "STOPPED" });
    expect(f.teams.get("task-team-1")).toBeNull();
    expect(f.owner.isActive()).toBe(true);

    await expect(f.owner.updateDelegatedLaunchSelections([{ teamRunId: "task-team-1", selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "UPDATED" });
    const team = (await f.durable()).getTaskExecution({ teamRunId: "task-team-1" })!.source as TaskTeamExecution;
    expect(team.userTeamLaunchSelection).toMatchObject(choice);

    const created = f.handles.size;
    await expect(f.message("task-team-1-lead")).resolves.toMatchObject({ accepted: true });
    await f.drain();
    expect(f.teams.get("task-team-1")).not.toBeNull();
    // The configured lead follows its Team's launch, so it restores on the Team's choice.
    const restored = f.handles.get("task-team-1-lead")!;
    expect(f.handles.size).toBeGreaterThanOrEqual(created);
    expect(restored.input.execution).toMatchObject(choice);
  });

  it("returns COPY_RUNNING and writes nothing when a message wakes the copy during validation (AC-011)", async () => {
    const f = await startCopy("agent");
    await f.owner.stopDelegatedExecution({ agentRunId: "task-agent-1" });
    let releaseValidation!: () => void;
    const gate = new Promise<void>((resolve) => { releaseValidation = resolve; });
    const saving = f.owner.updateDelegatedLaunchSelections([{ agentRunId: "task-agent-1", selection: choice }], acceptingValidator(gate));
    await expect(f.message("task-agent-1")).resolves.toMatchObject({ accepted: true });
    releaseValidation();
    await expect(saving).resolves.toMatchObject({ outcome: "COPY_RUNNING" });
    expect(((await f.durable()).getTaskExecution({ agentRunId: "task-agent-1" })!.source as TaskAgentExecution).userLaunchSelection).toBeUndefined();
  });

  it("refuses configured members, the root's own agents and unknown runs", async () => {
    const f = await startCopy("agent");
    await expect(f.owner.updateDelegatedLaunchSelections([{ agentRunId: "director", selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "VALIDATION_FAILED", fieldErrors: [expect.objectContaining({ path: "changes[0]" })] });
    await expect(f.owner.stopDelegatedExecution({ agentRunId: "director" })).resolves.toMatchObject({ outcome: "NOT_FOUND" });
    await expect(f.owner.stopDelegatedExecution({ teamRunId: "configured-team" })).resolves.toMatchObject({ outcome: "NOT_FOUND" });
  });
});

describe("AgentOrg collaborator Stop and model choice", () => {
  afterEach(cleanupDirectories);

  it("stops a running collaborator with the copies it started, then saves its choice for its next activation", async () => {
    const f = await buildCollaboratorOrg();
    await bringIn(f.owner, "/code_reviewer", "director");
    const [reviewer] = f.owner.getExecutionTreeSnapshot().rootOrg.collaborators;
    if (reviewer?.kind !== "agent") throw new Error("collaborator was not added");
    const hosted = f.handles.get(reviewer.agentRunId)!;
    await hosted.handle.getOrCreateAgentRun();
    const started = await f.owner.delegateToNewCopy({ identity: hosted.input.identity }, { recipient_address: "/target", description: "Draft it" });
    if (!started.delegated || started.copy.kind !== "team") throw new Error("the collaborator's Team copy did not start");
    const copyTeamRunId = started.copy.teamRunId;
    expect(f.teams.get(copyTeamRunId)).not.toBeNull();

    await expect(f.owner.updateDelegatedLaunchSelections([{ agentRunId: reviewer.agentRunId, selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "COPY_RUNNING" });

    await expect(f.owner.stopDelegatedExecution({ agentRunId: reviewer.agentRunId })).resolves.toMatchObject({ outcome: "STOPPED" });
    expect(hosted.finish).toHaveBeenCalled();
    expect(hosted.handle.withActivationFence).toHaveBeenCalled();
    // AR-002: the Team copy the collaborator started stops with it; the configured members keep running.
    expect(f.teams.get(copyTeamRunId)).toBeNull();
    expect(f.teams.get("configured-team")).not.toBeNull();

    await expect(f.owner.updateDelegatedLaunchSelections([{ agentRunId: reviewer.agentRunId, selection: choice }], acceptingValidator()))
      .resolves.toMatchObject({ outcome: "UPDATED" });
    expect(hosted.handle.replaceModelChoice).toHaveBeenCalledWith(expect.objectContaining(choice));
    const durable = (await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!;
    expect(durable.rootOrg.collaborators[0]).toMatchObject({ userLaunchSelection: choice, launchConfiguration: reviewer.launchConfiguration });
  });
});
