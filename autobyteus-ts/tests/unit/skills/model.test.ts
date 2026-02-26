import { describe, it, expect } from 'vitest';
import { Skill } from '../../../src/skills/model.js';

describe('Skill model', () => {
  it('stores constructor fields', () => {
    const skill = new Skill('name', 'desc', 'content', '/root/path');
    expect(skill.name).toBe('name');
    expect(skill.description).toBe('desc');
    expect(skill.content).toBe('content');
    expect(skill.rootPath).toBe('/root/path');
  });
});
