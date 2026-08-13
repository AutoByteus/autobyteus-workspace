import type { AIResponseSegment } from '~/types/segments';
import type { SegmentType } from '../protocol/messageTypes';

export interface StreamSegmentIdentity {
  readonly turnId: string;
  readonly id: string;
  readonly segmentType: SegmentType;
  presentationComplete: boolean;
}

export interface StreamSegmentIdentityCarrier {
  _streamSegmentIdentity?: StreamSegmentIdentity;
}

export type IdentifiedAIResponseSegment = AIResponseSegment & StreamSegmentIdentityCarrier;

export function getStreamSegmentIdentity(segment: AIResponseSegment): StreamSegmentIdentity | null {
  return (segment as IdentifiedAIResponseSegment)._streamSegmentIdentity ?? null;
}

export function setStreamSegmentIdentity(
  segment: AIResponseSegment,
  turnId: string,
  segmentId: string,
  segmentType: SegmentType,
): void {
  (segment as IdentifiedAIResponseSegment)._streamSegmentIdentity = {
    turnId,
    id: segmentId,
    segmentType,
    presentationComplete: false,
  };
}

export function markStreamSegmentPresentationComplete(segment: AIResponseSegment): boolean {
  const identity = getStreamSegmentIdentity(segment);
  if (!identity || identity.presentationComplete) return false;
  identity.presentationComplete = true;
  return true;
}

export function matchesStreamSegmentIdentity(
  segment: AIResponseSegment,
  turnId: string,
  segmentId: string,
): boolean {
  const identity = getStreamSegmentIdentity(segment);
  return identity?.turnId === turnId && identity.id === segmentId;
}

export function matchesStreamSegmentType(
  segment: AIResponseSegment,
  segmentType: SegmentType,
): boolean {
  return getStreamSegmentIdentity(segment)?.segmentType === segmentType;
}
