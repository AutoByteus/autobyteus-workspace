import { describe, it, expect } from 'vitest';
import { Singleton } from '../../../src/utils/singleton.js';

class ServiceA extends Singleton {
  public value = 'a';
}

class ServiceB extends Singleton {
  public value = 'b';
}

describe('Singleton (integration)', () => {
  it('provides isolated instances per subclass', () => {
    const a1 = ServiceA.getInstance();
    const a2 = ServiceA.getInstance();
    const b1 = ServiceB.getInstance();

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b1);
  });
});
