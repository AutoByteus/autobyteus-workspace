import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveAgentMemoryDir, resolveMemoryBaseDir } from '../../../src/memory/path-resolver.js';

describe('memory path resolver', () => {
  it('prefers override dir when provided', () => {
    const resolved = resolveMemoryBaseDir({
      overrideDir: '/custom/memory'
    });
    expect(resolved).toBe('/custom/memory');
  });

  it('uses env AUTOBYTEUS_MEMORY_DIR when override is not set', () => {
    const resolved = resolveMemoryBaseDir({
      env: { AUTOBYTEUS_MEMORY_DIR: '/env/memory' }
    });
    expect(resolved).toBe('/env/memory');
  });

  it('falls back to provided fallback dir when no override or env set', () => {
    const resolved = resolveMemoryBaseDir({
      env: {},
      fallbackDir: '/fallback/memory'
    });
    expect(resolved).toBe('/fallback/memory');
  });

  it('builds agent-specific memory dir', () => {
    const resolved = resolveAgentMemoryDir('/base/memory', 'agent-123');
    expect(resolved).toBe(path.join('/base/memory', 'agents', 'agent-123'));
  });
});
