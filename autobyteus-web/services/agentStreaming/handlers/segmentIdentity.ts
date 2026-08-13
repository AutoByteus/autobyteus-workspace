import type { AIResponseSegment } from '~/types/segments';

export interface StreamSegmentIdentity {
  turnId: string;
  id: string;
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
): void {
  (segment as IdentifiedAIResponseSegment)._streamSegmentIdentity = {
    turnId,
    id: segmentId,
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
