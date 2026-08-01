import type { SegmentContentPayload } from '../protocol';

export interface StreamContentReceipt {
  payload: SegmentContentPayload;
  receivedAt: string;
}

export interface StreamContentPresentationBatch {
  contentPayloads: SegmentContentPayload[];
  latestActivityAt: string;
}
