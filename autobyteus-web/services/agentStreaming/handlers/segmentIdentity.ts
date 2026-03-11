import type { AIResponseSegment } from '~/types/segments';
import type { SegmentType } from '../protocol/messageTypes';

export interface StreamSegmentIdentity {
  id: string;
  segmentType?: SegmentType;
  lookupKey: string | null;
}

export interface StreamSegmentIdentityCarrier {
  _streamSegmentIdentity?: StreamSegmentIdentity;
}

export type IdentifiedAIResponseSegment = AIResponseSegment & StreamSegmentIdentityCarrier;

export function buildStreamSegmentLookupKey(segmentId: string, segmentType?: SegmentType): string | null {
  if (!segmentType) {
    return null;
  }
  return `${segmentType}:${segmentId}`;
}

export function getStreamSegmentIdentity(segment: AIResponseSegment): StreamSegmentIdentity | null {
  return (segment as IdentifiedAIResponseSegment)._streamSegmentIdentity ?? null;
}

export function setStreamSegmentIdentity(
  segment: AIResponseSegment,
  segmentId: string,
  segmentType?: SegmentType,
): void {
  (segment as IdentifiedAIResponseSegment)._streamSegmentIdentity = {
    id: segmentId,
    segmentType,
    lookupKey: buildStreamSegmentLookupKey(segmentId, segmentType),
  };
}

export function matchesStreamSegmentIdentity(
  segment: AIResponseSegment,
  segmentId: string,
  segmentType?: SegmentType,
): boolean {
  const identity = getStreamSegmentIdentity(segment);
  if (!identity) {
    return false;
  }

  if (!segmentType) {
    return identity.id === segmentId;
  }

  const lookupKey = buildStreamSegmentLookupKey(segmentId, segmentType);
  if (identity.lookupKey) {
    return identity.lookupKey === lookupKey;
  }

  return !identity.segmentType && identity.id === segmentId;
}

export function hasStreamSegmentId(segment: AIResponseSegment, segmentId: string): boolean {
  return getStreamSegmentIdentity(segment)?.id === segmentId;
}
