import { describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RunParts, RunStanding } from "../../../../src/agent-collaboration/delegation/run-parts.js";
import { createCollaborationMemberExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-461 contract §2.3 (`model.py` `resolve`), the address cases B-1 … B-5, C-1 … C-4, A-5, A-6, and §2.5
 * (`reaching_address`), from the run's collaboration tree (SR-060). The sender's root resolves steps 1 and 3; this is
 * what follows its miss: step 2 (the standing
 * agents of the runs that assigned the sender run's Tasks) and, before it, the old-address correction (SR-036; SR-081 reversed
 * ARCH-REV-011's order: contract state O9).
 * M assigned T1 to the engineering team E (delegated as /software_engineering_team); E's designer handed sub-work of T1
 * to the product team P; the org assigned T4 to the study group S; a member of the user's team U assigned T3 to H;
 * the org also assigned T5 to a team X it delegated at /dev_team, which is an address of the org's own.
 */
const run = (rootSubjectKind: RootExecutionIdentity["rootSubjectKind"], rootRunId: string) => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const M = run("agent", "manager"), E = run("agent_team", "eng"), P = run("agent_team", "product"), ORG = run("agent_org", "org");
const S = run("agent_team", "study"), U = run("agent_team", "uteam"), H = run("agent", "helper"), X = run("agent_team", "xteam");
const STANDING: Record<string, RunStanding> = {
  manager: { agents: new Map([["/project_task_manager", "manager"]]), coordinatorAddress: null },
  eng: { agents: new Map([["/solution_designer", "designer"], ["/code_reviewer", "coder"]]), coordinatorAddress: "/solution_designer" },
  product: { agents: new Map([["/product_designer", "pd"]]), coordinatorAddress: "/product_designer" },
  org: { agents: new Map([["/ceo_agent", "ceo"], ["/Teacher", "teacher"], ["/dev_team/dev_lead", "dev_lead"], ["/dev_team", "dev_lead"]]), coordinatorAddress: null },
  study: { agents: new Map([["/tutor", "tutor"]]), coordinatorAddress: "/tutor" },
  uteam: { agents: new Map([["/solution_designer", "u_designer"]]), coordinatorAddress: "/solution_designer" },
  helper: { agents: new Map([["/helper", "helper"]]), coordinatorAddress: null },
  xteam: { agents: new Map([["/x_lead", "x_lead"]]), coordinatorAddress: "/x_lead" },
};
/**
 * Each run's parts as its own file says them, from its standing: an address whose agent also stands under it is an org's
 * mounted team (its coordinator); the rest are agents.
 */
const partsOf = (standing: RunStanding): RunParts => {
  const entries = [...standing.agents];
  const mounted = entries.filter(([address, id]) => entries.some(([other, otherId]) => otherId === id && other.startsWith(`${address}/`)));
  return { agents: entries.filter((entry) => !mounted.includes(entry)).map(([address, agentRunId]) => ({ agentRunId, address, agentDefinitionId: null })),
    coordinatorAddress: standing.coordinatorAddress, mountedTeams: mounted.map(([address, coordinatorAgentRunId]) => ({ address, coordinatorAgentRunId })) };
};
const sender = (root: RootExecutionIdentity, memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({ root, memberAddress: memberAddress as never, agentRunId });

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const reads: string[] = [];
  const tree = new DelegationIndex(() => tasks, { orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true, partsOf: async (r) => {
    reads.push(r.rootRunId);
    return STANDING[r.rootRunId] ? partsOf(STANDING[r.rootRunId]!) : null;
  } });
  tree.build();
  tasks.setEntriesListener(tree);
  for (const taskId of ["T1", "T3", "T4", "T5"]) tasks.addTask(taskId);
  const from = (delegatingRun: RootExecutionIdentity, by: string) => ({ delegatingRun, delegatorAgentRunId: by });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/software_engineering_team", delegatedFrom: from(M, "manager"),
    execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "designer" });
  await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/product_team", delegatedFrom: from(E, "designer"), execution: { teamRunId: "product" }, teamCoordinatorAgentRunId: "pd" });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T4", recipientAddress: "/study_group", delegatedFrom: from(ORG, "ceo"), execution: { teamRunId: "study" }, teamCoordinatorAgentRunId: "tutor" });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T3", recipientAddress: "/helper", delegatedFrom: from(U, "u_designer"), execution: { agentRunId: "helper" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T5", recipientAddress: "/dev_team", delegatedFrom: from(ORG, "ceo"), execution: { teamRunId: "xteam" }, teamCoordinatorAgentRunId: "x_lead" });
  // Step 2 and the correction: the sender's map; the sender address shown: the receiver's map.
  const resolution = {
    resolve: (sender: CollaborationMemberExecutionIdentity, address: string) => tree.collaborationTreeOf(sender.root).resolve(address),
    reachingAddress: (sender: CollaborationMemberExecutionIdentity, receiver: RootExecutionIdentity) => tree.collaborationTreeOf(receiver).reachingAddressOf(sender),
  };
  return { tasks, resolution, reads };
};

describe("CrossRunAddressResolution (contract §2.3 step 2, the correction, §2.5)", () => {
  it.each([
    ["B-1: a delegated team's member reaches its Task's assigner", E, "/code_reviewer", "coder", "/project_task_manager", "manager"],
    ["B-2: a sub-work run reaches its Task's assigner, not its delegator", P, "/product_designer", "pd", "/project_task_manager", "manager"],
    ["B-3: a run delegated by a team member reaches the assigning team's member", H, "/helper", "helper", "/solution_designer", "u_designer"],
    ["B-4: a run delegated by an org reaches the org's agent", S, "/tutor", "tutor", "/ceo_agent", "ceo"],
    ["B-4: … and the org's mounted team's member", S, "/tutor", "tutor", "/dev_team/dev_lead", "dev_lead"],
    ["B-5: … and its handoff target outside the team, kept as written", S, "/tutor", "tutor", "/Teacher", "teacher"],
    ["SR-081: the org's own mounted team member under the copy's old name, not one of the copy's own members, is reached", X, "/x_lead", "x_lead", "/dev_team/dev_lead", "dev_lead"],
  ])("%s (step 2)", async (_case, root, address, agentRunId, target, expected) => {
    const h = await harness();
    await expect(h.resolution.resolve(sender(root, address, agentRunId), target)).resolves.toBe(expected);
  });

  it("O9 (SR-081, CR-461-081): the copy's old name, and a member of its own under it, are corrected before step 2, never delivered to the assigner's namesake agents", async () => {
    const h = await harness();
    // The org stands at /dev_team (its mounted team's coordinator) and /dev_team/x_lead (its mounted team's own lead).
    const orgAgents = STANDING.org!.agents as Map<string, string>;
    orgAgents.set("/dev_team/x_lead", "org_x_lead");
    try {
      await expect(h.resolution.resolve(sender(X, "/x_lead", "x_lead"), "/dev_team")).rejects.toMatchObject({
        code: "COLLABORATION_TARGET_NOT_FOUND",
        message: "/dev_team is no longer an address: your team is addressed from its own root. Your team as a whole has no address; its coordinator is /x_lead.",
      });
      await expect(h.resolution.resolve(sender(X, "/x_lead", "x_lead"), "/dev_team/x_lead")).rejects.toMatchObject({
        code: "COLLABORATION_TARGET_NOT_FOUND",
        message: "/dev_team/x_lead is no longer an address: your team is addressed from its own root. Use /x_lead.",
      });
      // A run delegated under another name is not corrected: the study group's tutor reaches the org's agent there.
      await expect(h.resolution.resolve(sender(S, "/tutor", "tutor"), "/dev_team/x_lead")).resolves.toBe("org_x_lead");
    } finally { orgAgents.delete("/dev_team/x_lead"); }
  });

  it("step 2 takes the run's open Tasks; when none is open, all its Tasks", async () => {
    const h = await harness();
    h.tasks.close("T1");
    await expect(h.resolution.resolve(sender(E, "/code_reviewer", "coder"), "/project_task_manager")).resolves.toBe("manager");
  });

  it("C-1, C-3: a run that works on no Task (an assigner) is not this resolution's", async () => {
    const h = await harness();
    await expect(h.resolution.resolve(sender(M, "/project_task_manager", "manager"), "/software_engineering_team")).resolves.toBeNull();
    await expect(h.resolution.resolve(sender(ORG, "/ceo_agent", "ceo"), "/study_group")).resolves.toBeNull();
  });

  it("C-2, C-4: an address no step finds stays not found (null: the root's refusal stands)", async () => {
    const h = await harness();
    await expect(h.resolution.resolve(sender(P, "/product_designer", "pd"), "/solution_designer")).resolves.toBeNull();
    await expect(h.resolution.resolve(sender(H, "/helper", "helper"), "/nobody")).resolves.toBeNull();
  });

  it("A-5: the team as a whole, under its old name, is refused with a correction naming the coordinator", async () => {
    const h = await harness();
    await expect(h.resolution.resolve(sender(E, "/code_reviewer", "coder"), "/software_engineering_team")).rejects.toMatchObject({
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: "/software_engineering_team is no longer an address: your team is addressed from its own root. Your team as a whole has no address; its coordinator is /solution_designer.",
    });
  });

  it("A-6: a teammate under the old prefix is refused with the address to use; an unknown name under it is not found", async () => {
    const h = await harness();
    await expect(h.resolution.resolve(sender(E, "/solution_designer", "designer"), "/software_engineering_team/code_reviewer")).rejects.toMatchObject({
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: "/software_engineering_team/code_reviewer is no longer an address: your team is addressed from its own root. Use /code_reviewer.",
    });
    await expect(h.resolution.resolve(sender(E, "/solution_designer", "designer"), "/software_engineering_team/nobody")).resolves.toBeNull();
    // A delegated agent run has no team: nothing to correct.
    await expect(h.resolution.resolve(sender(H, "/helper", "helper"), "/helper/x")).resolves.toBeNull();
  });

  it("reads each run's own file once: a later message reads none (CR-461-024, the tree is the one owner)", async () => {
    const h = await harness();
    await expect(h.resolution.resolve(sender(S, "/tutor", "tutor"), "/dev_team/dev_lead")).resolves.toBe("dev_lead");
    await expect(h.resolution.reachingAddress(sender(ORG, "/ceo_agent", "ceo"), S)).resolves.toBe("/ceo_agent");
    const after = h.reads.length;
    await expect(h.resolution.resolve(sender(S, "/tutor", "tutor"), "/dev_team")).resolves.toBe("dev_lead");
    await expect(h.resolution.reachingAddress(sender(ORG, "/ceo_agent", "ceo"), S)).resolves.toBe("/ceo_agent");
    expect(h.reads).toHaveLength(after);
    expect(new Set(h.reads).size).toBe(h.reads.length);
  });

  describe("§2.5: the sender's address the receiver is shown", () => {
    it("the assigner's address reaches it from its Task's run: shown", async () => {
      const h = await harness();
      await expect(h.resolution.reachingAddress(sender(M, "/project_task_manager", "manager"), E)).resolves.toBe("/project_task_manager");
      await expect(h.resolution.reachingAddress(sender(M, "/project_task_manager", "manager"), P)).resolves.toBe("/project_task_manager");
      await expect(h.resolution.reachingAddress(sender(ORG, "/ceo_agent", "ceo"), S)).resolves.toBe("/ceo_agent");
      await expect(h.resolution.reachingAddress(sender(U, "/solution_designer", "u_designer"), H)).resolves.toBe("/solution_designer");
    });

    it("an address the receiver's run cannot use for the sender: run ID only", async () => {
      const h = await harness();
      // The assigner works on no Task: it reaches the delegated run by its run ID only.
      await expect(h.resolution.reachingAddress(sender(E, "/code_reviewer", "coder"), M)).resolves.toBeNull();
      // A delegator that is not the assigner (E → P), and a delegated run's member → its own sub-work's delegator.
      await expect(h.resolution.reachingAddress(sender(E, "/solution_designer", "designer"), P)).resolves.toBeNull();
      await expect(h.resolution.reachingAddress(sender(P, "/product_designer", "pd"), E)).resolves.toBeNull();
      // The receiver's own run has the address (its own teammate there): never the sender.
      await expect(h.resolution.reachingAddress(sender(U, "/solution_designer", "u_designer"), E)).resolves.toBeNull();
    });
  });
});
