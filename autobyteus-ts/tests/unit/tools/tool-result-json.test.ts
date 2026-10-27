import { describe, expect, it } from 'vitest';
import { omitEmptyToolResultFields, toToolResultJson } from '../../../src/tools/tool-result-json.js';

describe('tool result rule', () => {
  it('leaves out empty fields at any depth and keeps false and 0', () => {
    expect(toToolResultJson({ a: 0, b: false, c: [], d: { e: null }, f: [{}, 'x'] }))
      .toBe('{"a":0,"b":false,"f":[{},"x"]}');
  });

  it('leaves out null, undefined, empty strings, empty arrays and objects emptied by the rule', () => {
    expect(omitEmptyToolResultFields({
      name: 'kept',
      none: null,
      missing: undefined,
      blank: '',
      list: [],
      nested: { inner: { deeper: [] }, alsoEmpty: '' },
      space: ' ',
    })).toEqual({ name: 'kept', space: ' ' });
  });

  it('keeps array elements in their positions and applies the rule inside them', () => {
    expect(omitEmptyToolResultFields({ rows: [{ id: 'a', note: null }, null, '', { id: 'b', tags: [] }] }))
      .toEqual({ rows: [{ id: 'a' }, null, '', { id: 'b' }] });
  });

  it('never removes the top-level value', () => {
    expect(toToolResultJson({})).toBe('{}');
    expect(toToolResultJson({ only: null })).toBe('{}');
    expect(toToolResultJson([])).toBe('[]');
    expect(toToolResultJson(null)).toBe('null');
    expect(toToolResultJson(undefined)).toBe('null');
    expect(toToolResultJson('text')).toBe('"text"');
  });

  it('applies toJSON first: dates become ISO strings and class instances their JSON form', () => {
    class Process {
      constructor(readonly pid: number, readonly secret: string) {}
      toJSON() {
        return { pid: this.pid, stdout: '' };
      }
    }
    expect(omitEmptyToolResultFields({
      at: new Date('2026-10-25T01:02:03.000Z'),
      process: new Process(7, 'not serialized'),
    })).toEqual({ at: '2026-10-25T01:02:03.000Z', process: { pid: 7 } });
  });

  it('writes compact JSON', () => {
    expect(toToolResultJson({ a: { b: [1, 2] }, c: 'd' })).toBe('{"a":{"b":[1,2]},"c":"d"}');
  });
});
