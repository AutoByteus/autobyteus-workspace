import type {
  ApplicationAgentEventStreamClose,
  ApplicationAgentEventStreamError,
  ApplicationAgentEvent,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentStreamEmitter } from "../../application-agent-streaming/domain/application-agent-streaming-models.js";
import type { ApplicationEngineClient } from "../runtime/application-engine-client.js";
import {
  APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_CLOSED,
  APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_ERROR,
  APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_EVENT,
} from "../runtime/protocol.js";

import { APPLICATION_AGENT_STREAM_OBSERVER_ACTIVATION_QUEUE_LIMIT } from "../../application-communication-limits.js";

export { APPLICATION_AGENT_STREAM_OBSERVER_ACTIVATION_QUEUE_LIMIT } from "../../application-communication-limits.js";

type QueuedNotification = { method: string; params: Record<string, unknown> };

export type ApplicationAgentStreamObserverActivationBarrier = {
  emitter: ApplicationAgentStreamEmitter;
  activate: () => void;
};

export const createApplicationAgentStreamObserverActivationBarrier = (
  client: ApplicationEngineClient,
  subscriptionId: string,
  onFlushFailure: () => void,
): ApplicationAgentStreamObserverActivationBarrier => {
  const queued: QueuedNotification[] = [];
  let active = false;
  let failed = false;

  const emit = async (method: string, params: Record<string, unknown>): Promise<void> => {
    if (failed) throw new Error("Application agent stream activation failed.");
    if (!active) {
      if (queued.length >= APPLICATION_AGENT_STREAM_OBSERVER_ACTIVATION_QUEUE_LIMIT) {
        throw new Error("Application agent stream activation queue limit exceeded.");
      }
      queued.push({ method, params });
      return;
    }
    await client.notify(method, params);
  };

  const emitter: ApplicationAgentStreamEmitter = {
    emitEvent: (event: ApplicationAgentEvent) => emit(
      APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_EVENT,
      { subscriptionId, event },
    ),
    emitError: (error: ApplicationAgentEventStreamError) => emit(
      APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_ERROR,
      { subscriptionId, error },
    ),
    emitClosed: (close: ApplicationAgentEventStreamClose) => emit(
      APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_CLOSED,
      { subscriptionId, close },
    ),
  };

  return {
    emitter,
    activate: () => {
      if (active || failed) return;
      active = true;
      void (async () => {
        try {
          for (const notification of queued.splice(0)) {
            await client.notify(notification.method, notification.params);
          }
        } catch {
          failed = true;
          queued.length = 0;
          onFlushFailure();
        }
      })();
    },
  };
};
