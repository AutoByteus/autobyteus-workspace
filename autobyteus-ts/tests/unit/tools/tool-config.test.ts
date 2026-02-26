import { describe, it, expect } from 'vitest';
import { ToolConfig } from '../../../src/tools/tool-config.js';

describe('ToolConfig', () => {
  it('test_tool-config_creation_empty', () => {
    const config = new ToolConfig();
    expect(config.params).toEqual({});
    expect(config.size).toBe(0);
    expect(config.length).toBe(0);
    expect(config.isEmpty).toBe(true);
    expect(config.hasParams).toBe(false);
  });

  it('test_tool-config_creation_with_params', () => {
    const params = { param1: 'value1', param2: 42 };
    const config = new ToolConfig(params);
    expect(config.params).toEqual(params);
    expect(config.size).toBe(2);
    expect(config.length).toBe(2);
    expect(config.isEmpty).toBe(false);
    expect(config.hasParams).toBe(true);
  });

  it('test_tool-config_invalid_params', () => {
    expect(() => new ToolConfig('not_a_dict' as any)).toThrowError('params must be a dictionary');
  });

  it('test_to_dict', () => {
    const params = { param1: 'value1', param2: 42 };
    const config = new ToolConfig(params);
    const result = config.toDict();
    expect(result).toEqual(params);
    expect(result).not.toBe(config.params);
  });

  it('test_from_dict', () => {
    const data = { param1: 'value1', param2: 42 };
    const config = ToolConfig.fromDict(data);
    expect(config.params).toEqual(data);
    expect(config.params).not.toBe(data);
  });

  it('test_from_dict_invalid', () => {
    expect(() => ToolConfig.fromDict('not_a_dict' as any)).toThrowError('config_data must be a dictionary');
  });

  it('test_merge', () => {
    const config1 = new ToolConfig({ param1: 'value1', param2: 'value2' });
    const config2 = new ToolConfig({ param2: 'new_value2', param3: 'value3' });
    const merged = config1.merge(config2);
    expect(merged.params).toEqual({ param1: 'value1', param2: 'new_value2', param3: 'value3' });
    expect(config1.params).toEqual({ param1: 'value1', param2: 'value2' });
    expect(config2.params).toEqual({ param2: 'new_value2', param3: 'value3' });
  });

  it('test_merge_invalid', () => {
    const config = new ToolConfig();
    expect(() => config.merge('not_a_config' as any)).toThrowError(
      'Can only merge with another ToolConfig instance'
    );
  });

  it('test_get_constructor_args', () => {
    const params = { param1: 'value1', param2: 42 };
    const config = new ToolConfig(params);
    const args = config.getConstructorArgs();
    expect(args).toEqual(params);
    expect(args).not.toBe(config.params);
  });

  it('test_get', () => {
    const config = new ToolConfig({ param1: 'value1', param2: 42 });
    expect(config.get('param1')).toBe('value1');
    expect(config.get('param2')).toBe(42);
    expect(config.get('nonexistent')).toBeNull();
    expect(config.get('nonexistent', 'default')).toBe('default');
  });

  it('test_set', () => {
    const config = new ToolConfig();
    config.set('new_param', 'new_value');
    expect(config.get('new_param')).toBe('new_value');
    expect(config.size).toBe(1);
  });

  it('test_update', () => {
    const config = new ToolConfig({ param1: 'value1' });
    const newParams = { param1: 'updated_value1', param2: 'value2' };
    config.update(newParams);
    expect(config.get('param1')).toBe('updated_value1');
    expect(config.get('param2')).toBe('value2');
    expect(config.size).toBe(2);
  });

  it('test_update_invalid', () => {
    const config = new ToolConfig();
    expect(() => config.update('not_a_dict' as any)).toThrowError('params must be a dictionary');
  });

  it('test_repr', () => {
    const params = { param1: 'value1', param2: 42 };
    const config = new ToolConfig(params);
    const expected = "ToolConfig(params={'param1': 'value1', 'param2': 42})";
    expect(config.toString()).toBe(expected);
  });
});
