import { projectAgentCollaborationTree } from "./collaboration-execution-tree-dto-projection.js";
import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { SequencedRootEvent } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { StandaloneRootPackageSnapshot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import type { StandaloneRootEvent } from "../../standalone-agent-run-root/domain/standalone-root-event.js";

/** Agent-root view (root kind `agent`) on the collaboration-stream contracts. */
export const projectAgentCollaborationView = (input: Readonly<{
  agentRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string | null;
  lastMessageChangeSequence: number | null;
}>): RootExecutionViewDto => RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent",
  root_run_id: input.agentRunId,
  root_agent: {
    base_change_sequence: input.baseChangeSequence,
    live_sequence_id: input.liveSequenceId,
    last_message_change_sequence: input.lastMessageChangeSequence,
    is_active: input.isActive,
    execution_tree: projectAgentCollaborationTree({ agent: input.snapshot.agent, createdAt: input.snapshot.createdAt }),
  },
});

/** One event of the run's view in base's shapes; its tree's changes are sent by its session (`run_tree_changed`, SR-084). */
export const projectAgentCollaborationEvent = (
  agentRunId: string,
  sequenced: SequencedRootEvent<StandaloneRootEvent>,
): RootExecutionEventDto | null => {
  const source = sequenced.event;
  let event;
  switch (source.kind) {
    case "lifecycle":
      return null;
    case "communication":
      event = { kind: "communication" as const, message: source.message };
      break;
  }
  return RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent",
    root_run_id: agentRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};
