import { describe, expect, it } from 'vitest';
import { buildInvocationAliases, invocationIdsMatch } from '../invocationAliases';

describe('invocationAliases', () => {
  it('builds the trimmed invocation id and base alias', () => {
    expect(buildInvocationAliases(' call_1:edit_file ')).toEqual(['call_1:edit_file', 'call_1']);
  });

  it('keeps a single alias when no suffix is present', () => {
    expect(buildInvocationAliases('call_2')).toEqual(['call_2']);
  });

  it('matches invocation ids across alias forms', () => {
    expect(invocationIdsMatch('call_3:write_file', 'call_3')).toBe(true);
    expect(invocationIdsMatch('call_4', 'call_5')).toBe(false);
  });
});
