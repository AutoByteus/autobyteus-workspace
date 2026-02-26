import { describe, it, expect } from 'vitest';
import { Singleton } from '../../../src/utils/singleton.js';

class MyService extends Singleton {
  public value: number = 0;
}

describe('Singleton', () => {
  it('should return the same instance', () => {
    const s1 = MyService.getInstance();
    const s2 = MyService.getInstance();
    expect(s1).toBe(s2);
    
    s1.value = 42;
    expect(s2.value).toBe(42);
  });
});
