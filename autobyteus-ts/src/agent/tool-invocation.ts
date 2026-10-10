import type { ProviderNativeToolCallContext } from '../llm/utils/tool-call-delta.js';

export class ToolInvocation {
  name: string;
  arguments: Record<string, unknown>;
  id: string;
  turnId?: string;
  nativeToolCallContext?: ProviderNativeToolCallContext;
  /**
   * Why the model's arguments are unusable (invalid JSON or not an object); `null` when valid.
   * A marked invocation is never executed: `arguments` is only the `{}` history placeholder.
   */
  readonly argumentsParseError: string | null;

  constructor(
    name: string,
    arguments_: Record<string, unknown>,
    id: string,
    turnId?: string,
    nativeToolCallContext?: ProviderNativeToolCallContext,
    options: { argumentsParseError?: string | null } = {}
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
    this.argumentsParseError = options.argumentsParseError ?? null;
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
