import type { RawTraceMedia } from '../models/raw-trace-item.js';
import type { WorkingContext } from '../working-context.js';

export type NativeSnapshotReferenceFact = Readonly<{
  id: string;
  turnId: string;
  seq: number;
  traceType: string;
  sourceEvent: string;
  content: string;
  media: RawTraceMedia | null;
  toolName: string | null;
  toolCallId: string | null;
  toolArgs: Record<string, unknown> | null;
  toolResult: unknown | undefined;
  toolError: string | null | undefined;
  correlationId: string | null;
}>;

export type NativeSnapshotConversionInput = Readonly<{
  expectedSnapshotAgentId: string;
  sourceBytes: Uint8Array;
  eligibleActiveReferenceFacts: readonly NativeSnapshotReferenceFact[];
}>;

export type NativeSnapshotConversionOmissions = {
  droppedFieldCount: number;
  droppedMessageCount: number;
  droppedToolGroupCount: number;
  reasonCodes: string[];
};

export type NativeSnapshotConversionResult =
  | {
      kind: 'candidate';
      mode: 'converted' | 'converted_with_omissions';
      workingContext: WorkingContext;
      omissions: NativeSnapshotConversionOmissions;
    }
  | {
      kind: 'identity_rejected';
      reasonCode: 'missing_source_agent_id' | 'source_agent_id_mismatch';
    };
