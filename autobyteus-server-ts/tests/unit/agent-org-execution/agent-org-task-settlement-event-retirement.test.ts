import { describe, expect, it, vi } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskDelegationRecordV1 } from "../../../src/agent-collaboration/execution/task/task-delegation-record-v1.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

describe("AgentOrg accepted task settlement event retirement", () => {
  it("durably settles a mounted-Team task before local teardown without fail-stopping strict Org presentation", async () => {
    const orgRunId = "org-mounted-task-settlement";
    const root = createAgentOrgRootExecutionIdentity(orgRunId);
    const taskAgentRunId = "task-analyst-run";
    const analystAddress = assertAgentTeamAddress("/research-team/analyst");
    const configuredTeam = testOrgTeamNode({
      address: "/research-team",
      teamRunId: "research-team-run",
      coordinatorAddress: "/research-team/coordinator",
      members: [
        testOrgAgentNode("/research-team/coordinator", "research-coordinator-run"),
        testOrgAgentNode(analystAddress, "configured-analyst-run"),
      ],
    });
    const tree = testAgentOrgExecutionTree({
      orgRunId,
      members: [
        testOrgAgentNode("/delegator", "delegator-run"),
        {
          ...configuredTeam,
          taskExecutions: Object.freeze([{
            address: analystAddress,
            agentRunId: taskAgentRunId,
            platformAgentRunId: "provider-task-analyst",
            startedAt: "2026-09-01T00:00:01.000Z",
            settledAt: null,
          }]),
        },
      ],
    });
    const task: TaskDelegationRecordV1 = Object.freeze({
      taskId: "task-mounted-accepted",
      delegatorAgentRunId: "delegator-run",
      recipientAddress: analystAddress,
      taskExecution: Object.freeze({ agentRunId: taskAgentRunId }),
      description: "Complete the mounted-Team analysis.",
      referenceFiles: Object.freeze([]),
      status: "accepted",
      updates: Object.freeze([{
        submissionId: "submission-one",
        message: "Analysis complete.",
        referenceFiles: Object.freeze([]),
        createdAt: "2026-09-01T00:00:02.000Z",
      }, {
        reviewId: "review-one",
        reviewedSubmissionId: "submission-one",
        decision: "accept",
        comment: null,
        referenceFiles: Object.freeze([]),
        createdAt: "2026-09-01T00:00:03.000Z",
      }]),
      createdAt: "2026-09-01T00:00:01.000Z",
    });
    const publisher = new RootEventPublisher<AgentOrgRunEvent>();
    const published: AgentOrgRunEvent[] = [];
    publisher.subscribe(({ event }) => published.push(event));
    const persistenceFailStop = vi.fn();
    let locallyRegistered = true;
    let teardownFinished = false;
    let durableTree = tree;
    let run!: AgentOrgRun;
    const taskIdentity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: analystAddress,
      agentRunId: taskAgentRunId,
    });
    const preparedSettlement = {
      taskId: task.taskId,
      binding: Object.freeze({ kind: "agent" as const, address: analystAddress, agentRunId: taskAgentRunId }),
      cancelBeforeDurability: vi.fn(),
      commitAfterDurability: vi.fn(() => {
        locallyRegistered = false;
        return Object.freeze({
          finishLocalTeardown: async () => {
            teardownFinished = true;
            run.onAgentExecutionEvent(taskIdentity, {
              kind: "agent_run",
              event: {
                eventType: AgentRunEventType.AGENT_STATUS,
                runId: taskAgentRunId,
                payload: { status: "offline" },
                statusHint: "IDLE",
              },
            });
            return { accepted: true as const };
          },
        });
      }),
    };
    const mountedTeam = {
      prepareDirectTaskSettlement: vi.fn(async () => preparedSettlement),
      isActive: vi.fn(() => true),
    };
    const teams = {
      require: vi.fn((teamRunId: string) => {
        expect(teamRunId).toBe(configuredTeam.teamRunId);
        return mountedTeam;
      }),
      get: vi.fn(() => mountedTeam),
      list: vi.fn(() => []),
      freezeForRootTermination: vi.fn(() => []),
    };
    const rootAgents = {
      listHandles: vi.fn(() => []),
      isActive: vi.fn(() => true),
      freezeForRootTermination: vi.fn(() => []),
    };
    const persistence = {
      commitTreeMutation: vi.fn(async (input: {
        prepareAgainstCurrent(): {
          nextTree: typeof tree;
          commitAfterDurability(): void;
        };
      }) => {
        const prepared = input.prepareAgainstCurrent();
        durableTree = prepared.nextTree;
        prepared.commitAfterDurability();
      }),
      enterRootFailStop: persistenceFailStop,
      drain: vi.fn(async () => undefined),
    };
    run = new AgentOrgRun({
      root,
      tree,
      tasks: Object.freeze({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        records: Object.freeze([task]),
      }),
      messages: Object.freeze({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        messages: Object.freeze([]),
      }),
      rootAgents: rootAgents as never,
      teams: teams as never,
      callbacks: {} as never,
      persistence: persistence as never,
      publisher,
      taskExecutionIdentity: {} as never,
    });
    run.activate();

    const taskEngine = (run as unknown as { taskEngine: { settle(taskId: string): Promise<void> } }).taskEngine;
    await expect(taskEngine.settle(task.taskId)).resolves.toBeUndefined();

    const settledExecution = run.getExecutionTreeSnapshot().rootOrg.members
      .find((member) => "teamRunId" in member && member.teamRunId === configuredTeam.teamRunId);
    expect(settledExecution && "teamRunId" in settledExecution
      ? settledExecution.taskExecutions[0]?.settledAt
      : null).toEqual(expect.any(String));
    expect(durableTree).toEqual(run.getExecutionTreeSnapshot());
    expect(locallyRegistered).toBe(false);
    expect(teardownFinished).toBe(true);
    expect(preparedSettlement.commitAfterDurability).toHaveBeenCalledOnce();
    expect(persistenceFailStop).not.toHaveBeenCalled();
    expect(run.isActive()).toBe(true);
    expect(published.some((event) => event.kind === "task" && event.event.kind === "settled")).toBe(true);
    expect(published.some((event) => event.kind === "agent_presentation"
      && event.execution.agentRunId === taskAgentRunId)).toBe(false);
  });
});
