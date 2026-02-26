import { randomUUID } from "node:crypto";

export class UniqueIdGenerator {
  static generateId(): string {
    return randomUUID();
  }
}
