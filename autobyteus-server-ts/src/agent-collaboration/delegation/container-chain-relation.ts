import type { OrgContainerPort } from "../domain/org-container-port.js";
import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runReferenceOf } from "../execution/task/task-execution-resource-port.js";
import type { DelegationIndex } from "./delegation-index.js";

type ChainTree = Pick<DelegationIndex, "chainOf" | "tasksOf">;
type Containers = Pick<OrgContainerPort, "containedInOf">;

/**
 * design SR-014: the Org container whose units a delegated run is related to: that of a unit run (or the container itself,
 * for a converted delegation that named no delegator, contract §6) in its delegation chain (assigners upward, the run itself
 * not counted). Under the Task rule's own condition (as `canMessage` counts it): only while the run has an open Task entry;
 * a closed one is related to nobody but by its assigner's continuation. `null` otherwise.
 */
export const chainContainerOf = async (tree: ChainTree, containers: Containers, run: RootExecutionIdentity): Promise<string | null> => {
  const reference = runReferenceOf(run);
  if (!reference || !tree.tasksOf(reference).some((entry) => entry.open)) return null;
  for (const link of tree.chainOf(run).slice(1)) {
    if (link.rootSubjectKind === "agent_org") return link.rootRunId;
    const containedIn = await containers.containedInOf(link);
    if (containedIn) return containedIn.orgRunId;
  }
  return null;
};

/** design SR-014: the Task relation extended along the chain: one run is a unit of the container of a unit in the other's chain. */
export const relatedThroughContainer = async (tree: ChainTree, containers: Containers, a: RootExecutionIdentity, b: RootExecutionIdentity): Promise<boolean> => {
  for (const [unit, delegated] of [[a, b], [b, a]] as const) {
    const containedIn = await containers.containedInOf(unit);
    if (containedIn && await chainContainerOf(tree, containers, delegated) === containedIn.orgRunId) return true;
  }
  return false;
};
