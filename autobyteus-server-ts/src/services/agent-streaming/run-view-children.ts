import type { ChildRowProjection, ChildRowsFeed } from "../../agent-collaboration/delegation/child-rows-feed.js";
import type { LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import type { LocalChildFollowers } from "../../agent-collaboration/execution/delegation/local-child-followers.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { readViewRows, type ViewRows } from "./run-view-rows.js";

/**
 * A run's rows as its history and inspection reads give them (SR-061 rule 1): in base's shapes (nested by placement,
 * the peer rows, the closed set), from the run's collaboration tree, with each row agent's live status. A view's
 * stream reads them with its snapshot's base instead (`run-view-rows.ts`). Created by the composition root.
 */
export class RunViewChildren {
  constructor(private readonly input: Readonly<{
    feed: Pick<ChildRowsFeed, "rowsOf">;
    projection: ChildRowProjection;
    followers: Pick<LocalChildFollowers, "statuses">;
  }>) {}

  async read(run: RootExecutionIdentity): Promise<Readonly<{ rows: ViewRows; statuses: readonly LocalChildAgentStatus[] }>> {
    const rows = await readViewRows(this.input.projection, run, { rows: this.input.feed.rowsOf(run), statuses: [] });
    return Object.freeze({ rows, statuses: await this.input.followers.statuses(run) });
  }
}
