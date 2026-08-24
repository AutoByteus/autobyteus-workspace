import type { GatewayPersonalSessionModel } from '~/types/messaging';

export function mergeSessionWithStatusAwareQr(
  nextSession: GatewayPersonalSessionModel,
  previousSession: GatewayPersonalSessionModel | null,
): GatewayPersonalSessionModel {
  // QR should only be shown while waiting for scan completion.
  if (nextSession.status !== 'PENDING_QR') {
    return {
      ...nextSession,
      qr: undefined,
    };
  }

  if (nextSession.qr) {
    return nextSession;
  }

  if (previousSession?.sessionId === nextSession.sessionId && previousSession.qr) {
    return {
      ...nextSession,
      qr: previousSession.qr,
    };
  }

  return nextSession;
}
