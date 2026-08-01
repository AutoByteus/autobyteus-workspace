import type { AgentContext } from '~/types/agent/AgentContext';
import type { SegmentContentPayload } from '../protocol';
import type {
  StreamContentPresentationBatch,
  StreamContentReceipt,
} from './streamContentPresentationTypes';

export const STREAM_CONTENT_PRESENTATION_INTERVAL_MS = 100;

type BatchProjector = (
  context: AgentContext,
  batch: StreamContentPresentationBatch,
) => void;

interface PendingContentEntry {
  payload: SegmentContentPayload;
}

interface PendingContextBatch {
  contentByIdentity: Map<string, PendingContentEntry>;
  latestActivityAt: string;
}

const contentIdentityKey = (payload: SegmentContentPayload): string => JSON.stringify([
  payload.turn_id,
  payload.id,
  payload.segment_type ?? null,
]);

export class StreamContentPresentationScheduler {
  private pendingByContext = new Map<AgentContext, PendingContextBatch>();
  private presentationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly projectBatch: BatchProjector) {}

  enqueue(context: AgentContext, receipt: StreamContentReceipt): void {
    let pending = this.pendingByContext.get(context);
    if (!pending) {
      pending = {
        contentByIdentity: new Map(),
        latestActivityAt: receipt.receivedAt,
      };
      this.pendingByContext.set(context, pending);
    }

    pending.latestActivityAt = receipt.receivedAt;
    const identity = contentIdentityKey(receipt.payload);
    const delta = typeof receipt.payload.delta === 'string' ? receipt.payload.delta : '';
    const existing = pending.contentByIdentity.get(identity);
    if (existing) {
      existing.payload.delta += delta;
    } else {
      pending.contentByIdentity.set(identity, {
        payload: { ...receipt.payload, delta },
      });
    }

    if (this.presentationTimer === null) {
      this.presentationTimer = setTimeout(
        () => this.flush(),
        STREAM_CONTENT_PRESENTATION_INTERVAL_MS,
      );
    }
  }

  flush(): void {
    if (this.presentationTimer !== null) {
      clearTimeout(this.presentationTimer);
      this.presentationTimer = null;
    }
    if (this.pendingByContext.size === 0) {
      return;
    }

    const pendingSnapshot = this.pendingByContext;
    this.pendingByContext = new Map();

    for (const [context, pending] of pendingSnapshot) {
      this.projectBatch(context, {
        contentPayloads: Array.from(
          pending.contentByIdentity.values(),
          (entry) => entry.payload,
        ),
        latestActivityAt: pending.latestActivityAt,
      });
    }
  }
}
