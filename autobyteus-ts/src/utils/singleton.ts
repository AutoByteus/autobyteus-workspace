/**
 * Singleton Pattern implementation for TypeScript classes.
 * Can be used as a base class or mixin logic, but TS doesn't support metaclasses like Python.
 * We'll use a standard getInstance approach or a decorator if experimental decorators allowed.
 * Since we want explicit control, a base class handling the instance is simpler.
 */
export class Singleton {
  protected static instance?: Singleton;

  constructor() {}

  public static getInstance<T extends typeof Singleton>(this: T): InstanceType<T> {
    if (!this.instance) {
      this.instance = new this();
    }
    return this.instance as InstanceType<T>;
  }
}
