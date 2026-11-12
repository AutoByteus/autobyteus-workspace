import type { DelegationTree } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import { RunCollaborationContext } from "../../src/agent-collaboration/delegation/run-collaboration-context.js";
import { ReachableAgents } from "../../src/agent-collaboration/communication/reachable-agents.js";

/** A run's collaboration context over a test's tree, with no org files (SR-058). */
export const runCollaborationOf = (tree: Pick<DelegationTree, "currentTaskOf" | "assignersOfTasksOf">): RunCollaborationContext =>
  new RunCollaborationContext({ tree, orgs: { orgPlacementsOf: async () => null }, orgInstruction: async () => null });

/** For a test whose runs no Task names: no run is delegated, none is in an organization. */
export const NOT_DELEGATED = Object.freeze({
  inOrganization: () => false,
  ofAgentRun: async () => Object.freeze({ role: "standalone_agent" as const, placement: null }),
});

/** What a run reaches by address step 2 over a test's tree (SR-059); no configured placement files are read. */
export const reachableAgentsOf = (tree: Pick<DelegationTree, "tasksOf" | "assignersOfTasksOf" | "standingOf" | "agentsOf">): ReachableAgents =>
  new ReachableAgents({ tree: () => tree, placements: { configuredPlacementOf: async () => null } });
