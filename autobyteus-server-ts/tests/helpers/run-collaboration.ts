import type { DelegationTree } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import { RunCollaborationContext } from "../../src/agent-collaboration/delegation/run-collaboration-context.js";

/** A run's collaboration context over a test's tree, with no org files (SR-058). */
export const runCollaborationOf = (tree: Pick<DelegationTree, "currentTaskOf" | "assignersOfTasksOf">): RunCollaborationContext =>
  new RunCollaborationContext({ tree, orgs: { orgPlacementsOf: async () => null }, orgInstruction: async () => null });

/** For a test whose runs no Task names: no run is delegated, none is in an organization. */
export const NOT_DELEGATED = Object.freeze({
  inOrganization: () => false,
  ofAgentRun: async () => Object.freeze({ role: "standalone_agent" as const, placement: null }),
});
