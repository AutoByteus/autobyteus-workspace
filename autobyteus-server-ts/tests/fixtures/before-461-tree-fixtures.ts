import fs from "node:fs/promises";
import path from "node:path";
import type { StandaloneRootHost, StandaloneRootTreeSnapshot } from "../../src/app-data-migrations/frozen/server/standalone-agent-run-root/domain/standalone-root-tree.js";

/**
 * Test-only builder for a released standalone root's `collaboration/collaboration_tree.json` (before autobyteus-461,
 * which removed the file): what the released migrations read and write.
 */
export const emptyStandaloneRootTree = (input: Readonly<{ host: StandaloneRootHost; createdAt: string }>): StandaloneRootTreeSnapshot =>
  Object.freeze({ subjectKind: "agent", createdAt: input.createdAt, host: Object.freeze({ ...input.host }), taskExecutions: Object.freeze([]) });

/**
 * Writes a released tree file (standalone `collaboration_tree.json`, team or org tree) as JSON, as the released stores
 * wrote it: the current stores no longer write released shapes (autobyteus-461).
 */
export const writeReleasedTreeFile = async (filePath: string, tree: unknown): Promise<{ outcome: "committed" }> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(tree, null, 2)}\n`);
  return { outcome: "committed" };
};

type Json = Record<string, unknown>;
const withTaskLists = (node: Json): Json => {
  const next: Json = { ...node };
  if (Array.isArray(node.members)) next.members = node.members.map((member) => withTaskLists(member as Json));
  if (Array.isArray(node.members) && !Array.isArray(node.taskExecutions)) next.taskExecutions = [];
  return next;
};

/**
 * A current team or org tree in the shape before autobyteus-461: the root and every team node had a `taskExecutions`
 * list (empty when it hosted nothing). Test-only, for the released migrations that read that shape.
 */
export const toTreeBefore461 = <T>(tree: T): T => {
  const raw = structuredClone(tree) as Json;
  if (raw.rootTeam) raw.rootTeam = withTaskLists(raw.rootTeam as Json);
  if (raw.rootOrg) raw.rootOrg = withTaskLists(raw.rootOrg as Json);
  return raw as T;
};
