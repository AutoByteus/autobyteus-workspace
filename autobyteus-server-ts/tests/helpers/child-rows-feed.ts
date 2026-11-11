import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { getChildRowsFeed, type ChildRowProjection } from "../../src/agent-collaboration/delegation/child-rows-feed.js";
import type { ChildRowsChange, DelegatedChild } from "../../src/agent-collaboration/delegation/delegation-tree.js";

/** A local child's row as the views project it (`delegatedChildDto`). */
export const agentChildRow = (agentRunId: string, address = `/${agentRunId}`): CollaborationTaskExecutionDto => ({
  address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: "delegator", startedAt: "2026-11-01T00:00:00.000Z",
  source: { kind: "agent", agentDefinitionId: "writer",
    launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null } },
}) as CollaborationTaskExecutionDto;

export const delegatedChild = (agentRunId: string): DelegatedChild => ({ run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "delegator",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}` });

/**
 * The process `ChildRowsFeed` following a test's own tree reports (autobyteus-461 SR-042), with local rows projected by
 * `agentChildRow`. `release()` restores the feed.
 */
export const followTestChildRows = () => {
  const feed = getChildRowsFeed();
  let report: ((change: ChildRowsChange) => void) | null = null;
  const unfollow = feed.follow({ subscribeChildRows: (listener) => { report = listener; return () => { report = null; }; } });
  const projection: ChildRowProjection = { rowOf: async (_parent, child) => "agentRunId" in child.run
    ? { kind: "local", row: agentChildRow(child.run.agentRunId, child.recipientAddress) } : null };
  feed.bindProjection(projection);
  return {
    report: (change: ChildRowsChange) => report?.(change),
    settled: () => feed.settled(),
    release: () => { unfollow(); feed.unbindProjection(projection); },
  };
};
