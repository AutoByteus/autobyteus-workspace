import { Message } from '../llm/utils/messages.js';

export class WorkingContext {
  private messages: Message[] = [];

  constructor(initialMessages?: Iterable<Message>) {
    if (initialMessages) {
      this.messages = Array.from(initialMessages, cloneMessage);
    }
  }

  appendMessage(message: Message): void {
    this.messages.push(cloneMessage(message));
  }

  buildMessages(): Message[] {
    return this.messages.map(cloneMessage);
  }

  copy(): WorkingContext {
    return new WorkingContext(this.messages);
  }
}

const cloneMessage = (message: Message): Message => cloneMutable(message);

const cloneMutable = <T>(value: T, seen = new Map<object, unknown>()): T => {
  if (value === null || typeof value !== 'object') return value;
  const object = value as object;
  const existing = seen.get(object);
  if (existing !== undefined) return existing as T;

  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as T;
  if (value instanceof ArrayBuffer) return value.slice(0) as T;
  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      return new DataView(new Uint8Array(bytes).buffer) as T;
    }
    const TypedArray = value.constructor as new (source: ArrayLike<number>) => T;
    return new TypedArray(value as unknown as ArrayLike<number>);
  }

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(object, copy);
    value.forEach((item) => copy.push(cloneMutable(item, seen)));
    return copy as T;
  }
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(object, copy);
    value.forEach((item, key) => copy.set(cloneMutable(key, seen), cloneMutable(item, seen)));
    return copy as T;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(object, copy);
    value.forEach((item) => copy.add(cloneMutable(item, seen)));
    return copy as T;
  }

  const copy = Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>;
  seen.set(object, copy);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if ('value' in descriptor) descriptor.value = cloneMutable(descriptor.value, seen);
    Object.defineProperty(copy, key, descriptor);
  }
  return copy as T;
};
