import { describe, it, expect } from 'vitest';
import { formatToCleanString } from '../../../src/utils/llm-output-formatter.js';

describe('formatToCleanString', () => {
  it('formats a simple dict', () => {
    const data = { key: 'value', foo: 'bar' };
    const expected = 'key: value\nfoo: bar';
    expect(formatToCleanString(data)).toBe(expected);
  });

  it('formats a list', () => {
    const data = ['item1', 'item2'];
    const expected = '- item1\n- item2';
    expect(formatToCleanString(data)).toBe(expected);
  });

  it('formats a nested dict', () => {
    const data = { parent: { child: 'value' } };
    const expected = 'parent:\n  child: value';
    expect(formatToCleanString(data)).toBe(expected);
  });

  it('formats a list of dicts', () => {
    const data = [
      { name: 'A', val: 1 },
      { name: 'B', val: 2 }
    ];
    const expected = '- \n  name: A\n  val: 1\n- \n  name: B\n  val: 2';
    expect(formatToCleanString(data)).toBe(expected);
  });

  it('formats multiline strings', () => {
    const data = { code: 'def foo():\n    return True' };
    const expected = 'code:\n  def foo():\n      return True';
    expect(formatToCleanString(data)).toBe(expected);
  });

  it('formats objects with model_dump', () => {
    const obj = {
      model_dump: () => ({ field: 'hello', count: 5 })
    };
    const expected = 'field: hello\ncount: 5';
    expect(formatToCleanString(obj)).toBe(expected);
  });

  it('formats objects with dict', () => {
    const obj = {
      dict: () => ({ name: 'Test', value: 10 })
    };
    const expected = 'name: Test\nvalue: 10';
    expect(formatToCleanString(obj)).toBe(expected);
  });

  it('formats objects with toJSON', () => {
    const obj = {
      toJSON: () => ({ stdout: 'ok', exitCode: 0 })
    };
    const expected = 'stdout: ok\nexitCode: 0';
    expect(formatToCleanString(obj)).toBe(expected);
  });

  it('formats empty string explicitly', () => {
    expect(formatToCleanString('')).toBe('""');
  });
});
