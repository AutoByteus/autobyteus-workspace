import { Singleton } from '../utils/singleton.js';
import { EventType } from './event-types.js';

export type Listener = (payload?: unknown, metadata?: Record<string, unknown>) => void | Promise<void>;

export class Topic {
  eventType: EventType;
  senderId: string | null;

  constructor(eventType: EventType, senderId: string | null = null) {
    this.eventType = eventType;
    this.senderId = senderId;
  }
}

export class Subscription {
  subscriberId: string;
  listener: Listener;

  constructor(subscriberId: string, listener: Listener) {
    this.subscriberId = subscriberId;
    this.listener = listener;
  }
}

class SubscriberList {
  private subscriptions: Map<string, Set<Listener>> = new Map();

  add(subscription: Subscription): void {
    const existing = this.subscriptions.get(subscription.subscriberId);
    if (!existing) {
      this.subscriptions.set(subscription.subscriberId, new Set([subscription.listener]));
      return;
    }

    if (!existing.has(subscription.listener)) {
      existing.add(subscription.listener);
    }
  }

  removeSubscriber(subscriberId: string): void {
    this.subscriptions.delete(subscriberId);
  }

  removeSpecific(subscriberId: string, listener: Listener): void {
    const existing = this.subscriptions.get(subscriberId);
    if (!existing) {
      return;
    }
    existing.delete(listener);
    if (existing.size === 0) {
      this.subscriptions.delete(subscriberId);
    }
  }

  getAllListeners(): Listener[] {
    const all: Listener[] = [];
    for (const listeners of this.subscriptions.values()) {
      for (const listener of listeners) {
        all.push(listener);
      }
    }
    return all;
  }

  isEmpty(): boolean {
    return this.subscriptions.size === 0;
  }
}

function topicKey(topic: Topic): string {
  const senderKey = topic.senderId ?? '*';
  return `${topic.eventType}::${senderKey}`;
}

export class EventManager extends Singleton {
  private topics: Map<string, SubscriberList> = new Map();

  subscribe(subscription: Subscription, topic: Topic): void {
    const key = topicKey(topic);
    const list = this.topics.get(key) ?? new SubscriberList();
    list.add(subscription);
    this.topics.set(key, list);
  }

  unsubscribe(subscription: Subscription, topic: Topic): void {
    const key = topicKey(topic);
    const list = this.topics.get(key);
    if (!list) {
      return;
    }
    list.removeSpecific(subscription.subscriberId, subscription.listener);
    if (list.isEmpty()) {
      this.topics.delete(key);
    }
  }

  unsubscribeAllForSubscriber(subscriberId: string): void {
    for (const [key, list] of this.topics.entries()) {
      list.removeSubscriber(subscriberId);
      if (list.isEmpty()) {
        this.topics.delete(key);
      }
    }
  }

  emit(eventType: EventType, originObjectId: string | null = null, kwargs: Record<string, unknown> = {}): void {
    const availableKwargs: Record<string, unknown> = {
      event_type: eventType,
      object_id: originObjectId,
      ...kwargs
    };
    const targetedKey = topicKey(new Topic(eventType, originObjectId));
    const globalKey = topicKey(new Topic(eventType, null));

    const listeners: Listener[] = [];
    const targetedList = this.topics.get(targetedKey);
    if (targetedList) {
      listeners.push(...targetedList.getAllListeners());
    }
    const globalList = this.topics.get(globalKey);
    if (globalList) {
      listeners.push(...globalList.getAllListeners());
    }

    const payload = Object.prototype.hasOwnProperty.call(availableKwargs, 'payload')
      ? (availableKwargs as { payload?: unknown }).payload
      : undefined;
    const primaryArg = payload === undefined ? availableKwargs : payload;

    for (const listener of listeners) {
      try {
        const result = listener(primaryArg, availableKwargs);
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => undefined);
        }
      } catch {
        // Swallow listener errors to mirror Python's best-effort behavior.
      }
    }
  }
}
