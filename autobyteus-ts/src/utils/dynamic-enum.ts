/**
 * DynamicEnum implementation.
 * 
 * TypeScript Enums are static. To achieve dynamic behavior (adding members at runtime),
 * we use a class with a static registry.
 */
export class DynamicEnum {
  // Use a map to store members for each subclass
  private static _registries = new Map<Function, Map<string, DynamicEnum>>();
  private static _valueMaps = new Map<Function, Map<unknown, DynamicEnum>>();

  protected _name: string;
  protected _value: unknown;

  constructor(name: string, value: unknown) {
    this._name = name;
    this._value = value;
  }

  get name(): string {
    return this._name;
  }

  get value(): unknown {
    return this._value;
  }

  public toString(): string {
    return `${this.constructor.name}.${this._name}`;
  }

  /**
   * Adds a new member to the enum subclass.
   */
  public static add<T extends typeof DynamicEnum>(this: T, name: string, value: unknown): InstanceType<T> {
    const registry = this.getRegistry();
    const valueMap = this.getValueMap();

    if (registry.has(name)) {
      throw new Error(`Name ${name} already exists in ${this.name}`);
    }
    if (valueMap.has(value)) {
      throw new Error(`Value ${value} already exists in ${this.name}`);
    }

    const constructor = this as unknown as new (name: string, value: unknown) => InstanceType<T>;
    const member = new constructor(name, value);
    registry.set(name, member);
    valueMap.set(value, member);
    
    // Allow access via Class.MemberName (monkey-patching for convenience if needed, 
    // but in TS strict mode, this property won't be typed).
    // (this as any)[name] = member; 

    return member as InstanceType<T>;
  }

  /**
   * Retrieves a member by name.
   */
  public static get<T extends typeof DynamicEnum>(this: T, name: string): InstanceType<T> | undefined {
    return this.getRegistry().get(name) as InstanceType<T>;
  }

  /**
   * Retrieves a member by value.
   */
  public static getByValue<T extends typeof DynamicEnum>(this: T, value: unknown): InstanceType<T> | undefined {
    return this.getValueMap().get(value) as InstanceType<T>;
  }

  private static getRegistry<T extends typeof DynamicEnum>(this: T): Map<string, DynamicEnum> {
    if (!DynamicEnum._registries.has(this)) {
      DynamicEnum._registries.set(this, new Map());
    }
    return DynamicEnum._registries.get(this)!;
  }

  private static getValueMap<T extends typeof DynamicEnum>(this: T): Map<unknown, DynamicEnum> {
    if (!DynamicEnum._valueMaps.has(this)) {
      DynamicEnum._valueMaps.set(this, new Map());
    }
    return DynamicEnum._valueMaps.get(this)!;
  }
}
