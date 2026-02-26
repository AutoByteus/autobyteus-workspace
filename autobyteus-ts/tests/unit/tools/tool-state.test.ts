import { describe, it, expect } from 'vitest';
import { ToolState } from '../../../src/tools/tool-state.js';

describe('ToolState', () => {
  it('behaves like a dictionary', () => {
    const state = new ToolState();

    state['count'] = 1;
    state.set('name', 'tool');

    expect(state.get('count')).toBe(1);
    expect(state.get('missing')).toBeNull();
    expect(state.get('missing', 'default')).toBe('default');

    expect(state.has('name')).toBe(true);
    expect(state.has('missing')).toBe(false);

    expect(state.keys()).toEqual(['count', 'name']);
    expect(state.values()).toEqual([1, 'tool']);
    expect(state.entries()).toEqual([
      ['count', 1],
      ['name', 'tool']
    ]);

    const obj = state.toObject();
    expect(obj).toEqual({ count: 1, name: 'tool' });
    expect(obj).not.toBe(state);

    expect(state.delete('count')).toBe(true);
    expect(state.has('count')).toBe(false);
    expect(state.delete('count')).toBe(false);

    state.clear();
    expect(state.keys()).toEqual([]);
  });
});
