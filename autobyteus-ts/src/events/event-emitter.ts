import { randomUUID } from 'node:crypto';
import { EventManager, Subscription, Topic, type Listener } from './event-manager.js';
import { EventType } from './event-types.js';

export class EventEmitter {
  objectId: string;
  eventManager: EventManager;

  constructor() {
    this.objectId = randomUUID();
    this.eventManager = EventManager.getInstance();
  }

  subscribe(event: EventType, listener: Listener): void {
    const subscription = new Subscription(this.objectId, listener);
    const topic = new Topic(event, null);
    this.eventManager.subscribe(subscription, topic);
  }

  subscribeFrom(sender: EventEmitter, event: EventType, listener: Listener): void {
    const subscription = new Subscription(this.objectId, listener);
    const senderId = sender?.objectId ?? null;
    const topic = new Topic(event, senderId);
    this.eventManager.subscribe(subscription, topic);
  }

  unsubscribe(event: EventType, listener: Listener): void {
    const subscription = new Subscription(this.objectId, listener);
    const topic = new Topic(event, null);
    this.eventManager.unsubscribe(subscription, topic);
  }

  unsubscribeFrom(sender: EventEmitter, event: EventType, listener: Listener): void {
    const subscription = new Subscription(this.objectId, listener);
    const senderId = sender?.objectId ?? null;
    const topic = new Topic(event, senderId);
    this.eventManager.unsubscribe(subscription, topic);
  }

  unsubscribeAllListeners(): void {
    this.eventManager.unsubscribeAllForSubscriber(this.objectId);
  }

  emit(event: EventType, kwargs: Record<string, unknown> = {}): void {
    this.eventManager.emit(event, this.objectId, kwargs);
  }
}
