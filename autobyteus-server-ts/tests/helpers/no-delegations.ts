import type { DelegationIndex } from "../../src/agent-collaboration/delegation/delegation-index.js";
import { CollaborationTree } from "../../src/agent-collaboration/delegation/collaboration-tree.js";
import { NO_RUN_PARTS } from "./run-agents-reader.js";

/**
 * A `DelegationIndex` for a test in which no run delegated to another (autobyteus-461 SR-047: the tree is passed to
 * its readers; tests build them with a fake, never a process binding). A test about delegation builds a real tree.
 */
export const noDelegations = (): DelegationIndex => {
  const tree = ({
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
  peerRunNamed: () => null,
  runDeleted: () => undefined,
  runPartsChanged: () => undefined,
  skipUnstored: async () => undefined,
  childrenOf: () => [],
  subtreeOf: () => [],
  canMessage: () => false,
  runOfAgent: async () => null,
  agentsOf: async () => [],
  standingOf: async () => null,
  hasNode: () => false,
  nodeOf: () => null,
  topOf: (run: never) => run,
  chainOf: (run: never) => [run],
  agentOf: async () => null,
  collaborationTreeOf: (run: never) => new CollaborationTree(tree, NO_RUN_PARTS, run),
  }) as unknown as DelegationIndex;
  return tree;
};

/** The run side's Task records for a test without a Task side: every entry reads open, no status mark is kept. */
export const openTaskRecords = () => ({ isOpen: () => true, unreadable: () => null, statusChanged: () => undefined });

/** The episodic catalogs a run service tells about committed deletes, where a test does not look at them. */
export const noEpisodicCatalog = () => ({ runDeleted: (_root: unknown) => undefined });

/** An archive and delete guard for a test in which no run delegated: it never refuses, it performs the action. */
export const noWorkGuard = () => ({ guard: <R>(_run: unknown, _action: unknown, perform: () => Promise<R>) => perform() });
