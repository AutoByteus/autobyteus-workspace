import type { DelegationTree } from "./delegation-tree.js";

let bound: DelegationTree | null = null;

/** The composition binds the process tree once, after the Task records are loaded and the tree is built. */
export const bindDelegationTree = (tree: DelegationTree): void => { bound = tree; };
export const unbindDelegationTree = (tree: DelegationTree): void => { if (bound === tree) bound = null; };

/** The process tree, or `null` where collaboration is not composed (nothing is related to anything). */
export const findDelegationTree = (): DelegationTree | null => bound;

/** The process tree; asking before the Task records are loaded is a programming error. */
export const getDelegationTree = (): DelegationTree => {
  if (!bound) throw new Error("The delegation tree was read before the Task records were loaded.");
  return bound;
};
