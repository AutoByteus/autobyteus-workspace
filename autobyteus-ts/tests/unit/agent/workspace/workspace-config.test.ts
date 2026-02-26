import { describe, it, expect } from 'vitest';
import { WorkspaceConfig } from '../../../../src/agent/workspace/workspace-config.js';

describe('WorkspaceConfig', () => {
  it('initialization stores a copy and remains immutable', () => {
    const originalParams: Record<string, unknown> = { path: '/dev/null', readonly: true };
    const config = new WorkspaceConfig(originalParams);

    originalParams.path = '/temp';

    expect(config.get('path')).toBe('/dev/null');
    expect((config.toDict().path as string)).toBe('/dev/null');

    const configDict = config.toDict();
    configDict.readonly = false;
    expect(config.get('readonly')).toBe(true);
  });

  it('set returns a new instance', () => {
    const c1 = new WorkspaceConfig({ a: 1, b: 2 });
    const c2 = c1.set('c', 3);

    expect(c1).not.toBe(c2);
    expect(c1.toDict()).toEqual({ a: 1, b: 2 });
    expect(c2.toDict()).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('update returns a new instance', () => {
    const c1 = new WorkspaceConfig({ a: 1, b: 2 });
    const c2 = c1.update({ b: 99, d: 100 });

    expect(c1).not.toBe(c2);
    expect(c1.toDict()).toEqual({ a: 1, b: 2 });
    expect(c2.toDict()).toEqual({ a: 1, b: 99, d: 100 });
  });

  it('merge returns a new instance with combined params', () => {
    const c1 = new WorkspaceConfig({ a: 1, b: 2 });
    const c2 = new WorkspaceConfig({ b: 99, c: 3 });
    const c3 = c1.merge(c2);

    expect(c1.toDict()).toEqual({ a: 1, b: 2 });
    expect(c2.toDict()).toEqual({ b: 99, c: 3 });
    expect(c3.toDict()).toEqual({ a: 1, b: 99, c: 3 });
    expect(c3).not.toBe(c1);
    expect(c3).not.toBe(c2);
  });

  it('supports value-based equality', () => {
    const c1 = new WorkspaceConfig({ a: 1, b: { c: 3 } });
    const c2 = new WorkspaceConfig({ b: { c: 3 }, a: 1 });
    const c3 = new WorkspaceConfig({ a: 1, b: { c: 4 } });
    const c4 = new WorkspaceConfig({ a: 1 });

    expect(c1.equals(c2)).toBe(true);
    expect(c1.equals(c3)).toBe(false);
    expect(c1.equals(c4)).toBe(false);
    expect(c1.equals('not a config object')).toBe(false);
  });

  it('hashing is stable for equal configs', () => {
    const c1 = new WorkspaceConfig({ a: 1, b: 2 });
    const c2 = new WorkspaceConfig({ b: 2, a: 1 });
    const c3 = new WorkspaceConfig({ a: 1, b: 3 });

    expect(c1.hash()).toBe(c2.hash());
    expect(c1.hash()).not.toBe(c3.hash());

    const cache = new Map<number, string>();
    cache.set(c1.hash(), 'instance_for_c1');

    expect(cache.get(c2.hash())).toBe('instance_for_c1');
    expect(cache.has(c3.hash())).toBe(false);
  });

  it('fromDict and toDict operate as expected', () => {
    const params = { key: 'value', nested: { num: 123 } };
    const config = WorkspaceConfig.fromDict(params);

    expect(config).toBeInstanceOf(WorkspaceConfig);
    expect(config.toDict()).toEqual(params);

    expect(() => WorkspaceConfig.fromDict('not a dict' as unknown as Record<string, unknown>)).toThrow(
      /config_data must be a dictionary/
    );
  });

  it('get retrieves values with defaults', () => {
    const config = new WorkspaceConfig({ key: 'value' });

    expect(config.get('key')).toBe('value');
    expect(config.get('nonexistent')).toBe(null);
    expect(config.get('nonexistent', 'default_val')).toBe('default_val');
  });

  it('exposes size/isEmpty and a readable toString', () => {
    const emptyConfig = new WorkspaceConfig();
    const config = new WorkspaceConfig({ a: 1 });

    expect(emptyConfig.size).toBe(0);
    expect(config.size).toBe(1);

    expect(emptyConfig.isEmpty).toBe(true);
    expect(config.isEmpty).toBe(false);

    expect(config.toString()).toBe("WorkspaceConfig(params={'a':1})");
    expect(emptyConfig.toString()).toBe('WorkspaceConfig(params={})');
  });

  it('hashing is stable with complex types like sets', () => {
    const c1 = new WorkspaceConfig({ data: new Set([1, 2, 3]), name: 'c1' });
    const c2 = new WorkspaceConfig({ name: 'c1', data: new Set([3, 1, 2]) });
    const c3 = new WorkspaceConfig({ name: 'c1', data: new Set([1, 2, 4]) });

    expect(c1.equals(c2)).toBe(true);
    expect(c1.hash()).toBe(c2.hash());
    expect(c1.equals(c3)).toBe(false);
    expect(c1.hash()).not.toBe(c3.hash());
  });

  it('throws type errors for invalid input', () => {
    const config = new WorkspaceConfig();

    expect(() => config.merge({ a: 1 } as unknown as WorkspaceConfig)).toThrow(
      /Can only merge with another WorkspaceConfig instance/
    );

    expect(() => config.update('not a dict' as unknown as Record<string, unknown>)).toThrow(
      /params must be a mapping/
    );
  });
});
