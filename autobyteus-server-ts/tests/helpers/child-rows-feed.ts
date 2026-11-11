import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { ChildRowsFeed } from "../../src/agent-collaboration/delegation/child-rows-feed.js";
import type { ChildRowsChange, DelegatedChild } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** A local child's row as the views project it (`delegatedChildDto`). */
export const agentChildRow = (agentRunId: string, address = `/${agentRunId}`): CollaborationTaskExecutionDto => ({
  address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: "delegator", startedAt: "2026-11-01T00:00:00.000Z",
  source: { kind: "agent", agentDefinitionId: "writer",
    launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null } },
}) as CollaborationTaskExecutionDto;

export const delegatedChild = (agentRunId: string): DelegatedChild => ({ run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "delegator",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}` });

/**
 * A `ChildRowsFeed` following a test's own tree reports (autobyteus-461 SR-042), with local rows projected by
 * `agentChildRow`. The handlers under test receive `feed`.
 */
export const followTestChildRows = () => {
  let report: ((change: ChildRowsChange) => void) | null = null;
  const feed = new ChildRowsFeed({ rowOf: async (_parent, child) => "agentRunId" in child.run
    ? { kind: "local", row: agentChildRow(child.run.agentRunId, child.recipientAddress) } : null });
  feed.follow({ subscribeChildRows: (listener: (change: ChildRowsChange) => void) => { report = listener; return () => { report = null; }; } });
  return {
    feed,
    report: (change: ChildRowsChange) => report?.(change),
    settled: () => feed.settled(),
    release: () => undefined,
  };
};

/** A run's registration that a test drives: `register(run)` / `unregister(run)` tell the listeners (SR-046). */
export const testRegistrations = () => {
  const listeners = new Map<string, Set<(registered: boolean) => void>>();
  const tell = (run: RootExecutionIdentity, registered: boolean) => [...listeners.get(rootExecutionIdentityKey(run)) ?? []].forEach((listener) => listener(registered));
  return {
    onRegistrationChanged: (run: RootExecutionIdentity, listener: (registered: boolean) => void) => {
      const key = rootExecutionIdentityKey(run);
      const set = listeners.get(key) ?? new Set<(registered: boolean) => void>();
      set.add(listener);
      listeners.set(key, set);
      return () => { set.delete(listener); };
    },
    register: (run: RootExecutionIdentity) => tell(run, true),
    unregister: (run: RootExecutionIdentity) => tell(run, false),
    listening: (run: RootExecutionIdentity) => listeners.get(rootExecutionIdentityKey(run))?.size ?? 0,
  };
};

/** View sources for a stream handler under test whose run is live (no stored tree). */
export const testViewSources = () => ({ childRowsFeed: followTestChildRows().feed, registrations: testRegistrations(), readStoredTree: async () => null });
