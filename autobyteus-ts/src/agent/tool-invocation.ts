export class ToolInvocation {
  name: string;
  arguments: Record<string, unknown>;
  id: string;
  turnId?: string;

  constructor(name: string, arguments_: Record<string, unknown>, id: string, turnId?: string) {
    if (!id) {
      throw new Error('ToolInvocation requires a non-empty id.');
    }
    if (!name) {
      throw new Error('ToolInvocation requires a non-empty name.');
    }
    if (arguments_ === null || arguments_ === undefined) {
      throw new Error('ToolInvocation requires arguments.');
    }

    this.name = name;
    this.arguments = arguments_;
    this.id = id;
    this.turnId = turnId;
  }

  isValid(): boolean {
    return this.name != null && this.arguments != null;
  }

  toString(): string {
    const turnSegment = this.turnId ? `, turnId='${this.turnId}'` : '';
    return `ToolInvocation(id='${this.id}', name='${this.name}', arguments=${JSON.stringify(this.arguments)}${turnSegment})`;
  }
}
