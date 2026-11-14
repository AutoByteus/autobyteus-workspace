import type { ChildRowProjection, ChildRowsFeed } from "../../agent-collaboration/delegation/child-rows-feed.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { readViewSnapshot, type ViewRows } from "./run-view-rows.js";

/**
 * A run's rows as its history and inspection reads give them (SR-061 rule 1): in base's shapes (nested by placement,
 * the peer rows, the closed set), from the run's collaboration tree. Each row's status is its own run's, read by run ID
 * (`/ws/run-status`, SR-083). A view's stream reads them with its snapshot's base instead (`run-view-rows.ts`).
 * Created by the composition root.
 */
export class RunViewChildren {
  constructor(private readonly input: Readonly<{
    feed: Pick<ChildRowsFeed, "rowsOf">;
    projection: ChildRowProjection;
  }>) {}

  /** The rows, by the views' one builder (`readViewSnapshot`, CR-461-071): a row whose record cannot be read is left out. */
  read(run: RootExecutionIdentity): Promise<Readonly<{ rows: ViewRows }>> {
    return readViewSnapshot({ projection: this.input.projection }, run, { rows: this.input.feed.rowsOf(run) });
  }
}
