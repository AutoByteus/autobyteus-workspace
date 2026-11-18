import { Arg, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { createRootExecutionIdentity, type RootSubjectKind } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { getStudioRunTreeView } from "../studio-application-api-services.js";

const KINDS: ReadonlySet<string> = new Set(["agent", "agent_team", "agent_org"]);

/**
 * A run's tree for a listed run that is not open (autobyteus-461 SR-082, SR-084): the rows `RunTreeView` builds, the same
 * rows the run's open view receives. Read when the user expands the run, and again on its `RUN_TREE_CHANGED`
 * (`/ws/run-status`).
 */
@Resolver()
export class RunTreeResolver {
  @Query(() => GraphQLJSON)
  async runTree(
    @Arg("kind", () => String) kind: string,
    @Arg("runId", () => String) runId: string,
  ): Promise<unknown> {
    if (!KINDS.has(kind)) throw new Error(`A run tree is read for an agent, team or org run, not '${kind}'.`);
    const run = createRootExecutionIdentity({ rootSubjectKind: kind as RootSubjectKind, rootRunId: runId });
    return { kind, runId, rows: await getStudioRunTreeView().rowsOf(run) };
  }
}
