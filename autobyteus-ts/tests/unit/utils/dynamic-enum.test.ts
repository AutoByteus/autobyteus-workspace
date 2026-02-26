import { describe, it, expect } from 'vitest';
import { DynamicEnum } from '../../../src/utils/dynamic-enum.js';

class Color extends DynamicEnum {}
class Status extends DynamicEnum {}

describe('DynamicEnum', () => {
  it('should add members dynamically', () => {
    const red = Color.add('RED', 1);
    expect(red.name).toBe('RED');
    expect(red.value).toBe(1);
    expect(red).toBeInstanceOf(Color);
  });

  it('should retrieve members by name', () => {
    Color.add('BLUE', 2);
    const blue = Color.get('BLUE');
    expect(blue).toBeDefined();
    expect(blue?.value).toBe(2);
  });

  it('should retrieve members by value', () => {
    Color.add('GREEN', 3);
    const green = Color.getByValue(3);
    expect(green).toBeDefined();
    expect(green?.name).toBe('GREEN');
  });

  it('should be separated by class', () => {
    Status.add('ACTIVE', 1);
    
    expect(Status.get('ACTIVE')).toBeDefined();
    // Color should NOT have ACTIVE (even if value matches something else, but names/registries are separate)
    expect(Color.get('ACTIVE')).toBeUndefined();
  });

  it('should prevent duplicate names', () => {
    expect(() => {
      Color.add('RED', 99); // RED exists from test 1
    }).toThrow(/Name RED already exists/);
  });

  it('should prevent duplicate values', () => {
    expect(() => {
      Color.add('DARK_RED', 1); // Value 1 exists from test 1
    }).toThrow(/Value 1 already exists/);
  });
});
