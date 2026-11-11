import type { DelegationTree } from "../../src/agent-collaboration/delegation/delegation-tree.js";

/**
 * A `DelegationTree` for a test in which no run delegated to another (autobyteus-461 SR-047: the tree is passed to
 * its readers; tests build them with a fake, never a process binding). A test about delegation builds a real tree.
 */
export const noDelegations = (): DelegationTree => ({
  build: () => undefined,
  subscribe: () => () => undefined,
  subscribeChildRows: () => () => undefined,
  entriesChanged: () => undefined,
  parentOf: () => null,
  tasksOf: () => [],
  currentTaskOf: () => null,
  openTaskIdsOf: () => [],
  assignerOf: () => null,
  assignersOf: () => [],
  openChildrenOf: () => [],
  peerChildrenOf: () => [],
  childrenOf: () => [],
  subtreeOf: () => [],
  canMessage: () => false,
  runOfAgent: async () => null,
  agentsOf: async () => [],
  hasNode: () => false,
}) as unknown as DelegationTree;

/** The run side's Task records for a test without a Task side: every entry reads open, no status mark is kept. */
export const openTaskRecords = () => ({ isOpen: () => true, statusChanged: () => undefined });

/** An archive and delete guard for a test in which no run delegated: it never refuses. */
export const noWorkGuard = () => ({ refusal: () => null });
