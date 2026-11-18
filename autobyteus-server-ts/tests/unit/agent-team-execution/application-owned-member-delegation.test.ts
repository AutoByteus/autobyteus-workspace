import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemberTaskCapability } from "../../../src/agent-collaboration/execution/task/member-task-capability.js";
import { createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TaskDelegationToolService } from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import type { DelegateTaskToolInput } from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import { toTaskDelegationToolErrorPayload } from "../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";
import { ROOT, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

// A member of an application-owned team: the team's tree carries its application binding.
vi.mock("../../../src/agent-team-execution/services/team-run-execution-tree-builder.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../src/agent-team-execution/services/team-run-execution-tree-builder.js")>();
  return {
    ...original,
    buildInitialTeamRunExecutionTree: (...args: Parameters<typeof original.buildInitialTeamRunExecutionTree>) => ({
      ...original.buildInitialTeamRunExecutionTree(...args),
      applicationBinding: { applicationId: "app-1", bindingId: "binding-1" },
    }),
  };
});

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupDirectories();
});

const notAvailable = "'/code_reviewer' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use.";

/**
 * The answers `delegate_task` gave at base `827f1e68dc`, recorded by the characterization test run there (autobyteus-461
 * SR-052; evidence `sr052-base-characterization`). The branch answers with the same texts: the application-bound rule
 * refuses where it lives, in placement.
 */
const BASE_ANSWERS = {
  ownAddress: { error: { code: "COLLABORATION_SELF_TARGET_REJECTED",
    message: "/coordinator is your own address; you can't delegate to yourself. Do the work yourself, or delegate it to another agent or agent team." } },
  teammate: { error: { code: "COLLABORATION_SELF_TARGET_REJECTED",
    message: "/worker is in your own team; you can't delegate to it. Talk with it using send_message_to." } },
  catalogAddress: { delegated: false, message: notAvailable },
  withTaskId: { delegated: false, message: notAvailable },
};

describe("delegate_task by a member of an application-owned team (autobyteus-461 SR-052)", () => {
  it("answers with base's exact texts and starts nothing", async () => {
    const f = await harness({ withTeammate: true });
    expect(f.root.getExecutionTreeSnapshot().applicationBinding).toEqual({ applicationId: "app-1", bindingId: "binding-1" });
    f.dependencies.taskRecords.addTask("T1");
    // The tool path as production runs it: the member's capability (as `team-root-materializer` builds it) and the tool
    // service over the node's TaskDelegation; a thrown refusal reaches the agent as the tool's error payload.
    const tool = new TaskDelegationToolService({ delegation: f.taskSide.delegation, remote: f.taskSide.remote });
    const commands: MemberTaskCapability = {
      root: createTeamRootExecutionIdentity(ROOT),
      delegationSource: (caller) => f.root.delegationSource({ identity: caller }),
      ownedTaskOf: () => null,
    };
    const identity = f.identity("/coordinator", "run-coordinator");
    const answer = async (input: DelegateTaskToolInput["input"]) => {
      try { return await tool.delegateTask({ identity, commands }, { subject: "new_copy", input } as DelegateTaskToolInput); }
      catch (error) { return toTaskDelegationToolErrorPayload(error); }
    };

    expect({
      ownAddress: await answer({ recipient_address: "/coordinator", description: "Do it" }),
      teammate: await answer({ recipient_address: "/worker", description: "Do it" }),
      catalogAddress: await answer({ recipient_address: "/code_reviewer", description: "Review it" }),
      withTaskId: await answer({ recipient_address: "/code_reviewer", task_id: "T1" }),
    }).toEqual(BASE_ANSWERS);
    expect(f.handles.size).toBe(0);
  });
});
