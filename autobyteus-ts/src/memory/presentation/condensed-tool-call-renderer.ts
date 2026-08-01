import { ReadableValueRenderer } from './readable-value-renderer.js';

export type CondensedToolCallInput = {
  name: string;
  arguments: unknown;
  outcome:
    | { kind: 'result'; value: unknown }
    | { kind: 'error'; value: string }
    | { kind: 'no_outcome'; status: string };
};

export type CondensedToolCallRenderOptions = {
  maxValueChars: number | null;
};

const indent = (value: string): string =>
  value.split('\n').map((line) => `  ${line}`).join('\n');

const requireText = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Condensed tool call ${fieldName} must be non-empty.`);
  return normalized;
};

export class CondensedToolCallRenderer {
  constructor(private readonly valueRenderer = new ReadableValueRenderer()) {}

  render(input: CondensedToolCallInput, options: CondensedToolCallRenderOptions): string {
    const name = requireText(input.name, 'name');
    const status = input.outcome.kind === 'result'
      ? 'success'
      : input.outcome.kind === 'error'
        ? 'error'
        : requireText(input.outcome.status, 'status');
    const argumentsText = this.valueRenderer.render(input.arguments, {
      maxChars: options.maxValueChars,
    });
    const lines = [
      `name: ${name}`,
      `status: ${status}`,
      'arguments:',
      indent(argumentsText),
    ];

    if (input.outcome.kind === 'no_outcome') {
      lines.push('result: not available');
    } else {
      lines.push(`${input.outcome.kind}:`);
      lines.push(indent(this.valueRenderer.render(input.outcome.value, {
        maxChars: options.maxValueChars,
      })));
    }
    return lines.join('\n');
  }
}
