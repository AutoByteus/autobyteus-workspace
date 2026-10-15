import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import type { TaskAgentExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { getAgentConversationActivityInspector } from "../../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { ROOT, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

/**
 * DS-001 / DS-002 / AR-005 on a live Team root (real root, flat TeamRuns, task registries and
 * persistence; fake agent runtimes): Stop and model choice of a delegated catalog copy; later
 * copies still start on the started values.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const validator = (): RunModelSelectionValidator => ({
  validate: vi.fn(),
  validateMany: vi.fn(async (inputs) => inputs.map((input) => ({ kind: "valid" as const, selection: input.selection as never }))),
}) as unknown as RunModelSelectionValidator;

const choice = { llmModelIdentifier: "bigger-model", llmConfig: { thinking: "high" } };

describe("Team root delegated copy Stop and model choice", () => {
  it("stops a copy restorably, resumes it on the choice, and starts later copies on the started values (AR-005)", async () => {
    const f = await harness();
    const coordinator = { identity: f.identity("/coordinator", "run-coordinator") };
    const first = await f.root.delegateToNewCopy(coordinator, { recipient_address: "/code_reviewer", description: "Review it" });
    if (!first.delegated || first.copy.kind !== "agent") throw new Error("copy did not start");
    const copyRunId = first.copy.agentRunId;
    // The fake runtime writes no memory; the stopped copy's saved conversation is taken as present.
    vi.spyOn(getAgentConversationActivityInspector(), "inspect").mockReturnValue({ kind: "present" } as never);
    await flushMicrotasks();
    const copy = f.handles.get(copyRunId)!;
    expect(copy.handle.isActive()).toBe(true);

    await expect(f.root.updateDelegatedLaunchSelections([{ agentRunId: copyRunId, selection: choice }], validator()))
      .resolves.toMatchObject({ outcome: "COPY_RUNNING" });
    await expect(f.root.stopDelegatedExecution({ agentRunId: copyRunId })).resolves.toMatchObject({ outcome: "STOPPED" });
    expect(copy.finish).toHaveBeenCalled();
    expect(f.root.isActive()).toBe(true);

    const events: TeamRunEvent[] = [];
    const unsubscribe = f.root.subscribeToEvents(({ event }) => { events.push(event); });
    await expect(f.root.updateDelegatedLaunchSelections([{ agentRunId: copyRunId, selection: choice }], validator()))
      .resolves.toMatchObject({ outcome: "UPDATED" });
    unsubscribe();
    const durable = (await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!;
    const recorded = durable.rootTeam.taskExecutions.find((task) => "agentRunId" in task && task.agentRunId === copyRunId) as TaskAgentExecution;
    expect(recorded.userLaunchSelection).toMatchObject(choice);
    // The live view learns the committed choice like any other tree mutation (CR-002).
    expect(events.filter((event) => event.eventSourceType === TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS)).toEqual([
      { eventSourceType: TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS, selections: [{ reference: { agentRunId: copyRunId }, selection: recorded.userLaunchSelection }] },
    ]);
    // The copy keeps its started catalog source; the selection is per instance.
    expect(recorded.source).toMatchObject({ kind: "agent", agentDefinitionId: "code-reviewer" });

    const resumed = await f.root.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinator.identity, displayName: "coordinator" }, targetAgentRunId: copyRunId, content: "Continue",
    });
    expect(resumed).toMatchObject({ accepted: true });
    expect(copy.handle.replaceModelChoice).toHaveBeenCalledWith(expect.objectContaining(choice));

    const second = await f.root.delegateToNewCopy(coordinator, { recipient_address: "/code_reviewer", description: "Review again" });
    if (!second.delegated || second.copy.kind !== "agent") throw new Error("second copy did not start");
    expect(f.handles.get(second.copy.agentRunId)!.input.execution).toMatchObject({ llmModelIdentifier: recorded.source!.launchConfiguration.llmModelIdentifier });
  });
});
