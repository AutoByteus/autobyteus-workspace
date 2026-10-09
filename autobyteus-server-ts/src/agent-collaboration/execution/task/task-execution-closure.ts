import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionResourcePort } from "./task-execution-resource-port.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/**
 * The one closure policy of every root view: the Task side's closed agent runs hosted by the root,
 * kept only where they are task execution nodes of the given tree (`contains`). The tree itself is
 * never filtered; the listing leaves these out. Empty when no Task side is bound.
 */
export const listClosedTaskExecutions = (input: Readonly<{
  port?: TaskExecutionResourcePort;
  root: RootExecutionIdentity;
  contains(reference: TaskExecutionReference): boolean;
}>): readonly TaskExecutionReference[] =>
  Object.freeze(input.port ? input.port.closedTaskExecutionsIn(input.root).filter((reference) => input.contains(reference)) : []);
