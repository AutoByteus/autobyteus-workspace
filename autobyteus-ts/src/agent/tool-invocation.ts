import type { ProviderNativeToolCallContext } from '../llm/utils/tool-call-delta.js';

export class ToolInvocation {
  name: string;
  arguments: Record<string, unknown>;
  id: string;
  turnId?: string;
  nativeToolCallContext?: ProviderNativeToolCallContext;

  constructor(
    name: string,
    arguments_: Record<string, unknown>,
    id: string,
    turnId?: string,
    nativeToolCallContext?: ProviderNativeToolCallContext
  ) {
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
    this.nativeToolCallContext = nativeToolCallContext;
  }

  isValid(): boolean {
    return this.name != null && this.arguments != null;
  }

  toString(): string {
    const turnSegment = this.turnId ? `, turnId='${this.turnId}'` : '';
    const nativeContextSegment = this.nativeToolCallContext
      ? `, nativeToolCallContext=${JSON.stringify(this.nativeToolCallContext)}`
      : '';
    return `ToolInvocation(id='${this.id}', name='${this.name}', arguments=${JSON.stringify(this.arguments)}${turnSegment}${nativeContextSegment})`;
  }
}
