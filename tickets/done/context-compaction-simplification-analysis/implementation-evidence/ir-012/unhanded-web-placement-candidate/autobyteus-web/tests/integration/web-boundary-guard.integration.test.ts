import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const guardPath = path.resolve('scripts/guard-web-boundary.mjs');
const roots: string[] = [];

// Run the unchanged production guard against disposable roots, never mutate
// real services or node_modules to test its rejection and test-only boundary.
const runGuard = (relativePath: string) => {
  const root = mkdtempSync(path.join(tmpdir(), 'web-boundary-guard-'));
  roots.push(root);
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    devDependencies: { '@autobyteus/team-stream-contracts': 'workspace:*' },
  }));
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath,
    "import { AgentInputUserMessage } from '../../../autobyteus-ts/dist/agent/message/agent-input-user-message.js';\n");
  return spawnSync(process.execPath, [guardPath], { cwd: root, encoding: 'utf8' });
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('web boundary guard test placement contract', () => {
  it.each([
    'services/nativeInput.ts',
    'services/__tests__/nativeInput.spec.ts',
  ])('rejects a core import under %s', (relativePath) => {
    const result = runGuard(relativePath);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Direct autobyteus-ts dependencies are not allowed');
    expect(result.stderr).toContain(relativePath + ':1:');
  });

  it('allows native cross-layer tests in the test-owned integration directory', () => {
    const result = runGuard('tests/integration/native-input.integration.test.ts');
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[guard:web-boundary] Passed.');
  });
});
