import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContextFileLocalPathResolver } from '../../../src/context-files/services/context-file-local-path-resolver.js';

class StubLayout {
  constructor(private readonly resolvedFilePath: string) {}

  getFinalFilePath(): string {
    return this.resolvedFilePath;
  }
}

describe('ContextFileLocalPathResolver', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('resolves final standalone and team-member context file locators to local paths', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-file-resolver-'));
    tempDirs.push(tempDir);
    const filePath = path.join(tempDir, 'ctx_token__notes.txt');
    await fs.writeFile(filePath, 'hello');

    const resolver = new ContextFileLocalPathResolver(new StubLayout(filePath) as any);

    expect(resolver.resolve('/rest/runs/run-1/context-files/ctx_token__notes.txt')).toBe(filePath);
    expect(
      resolver.resolve('/rest/team-runs/team-1/members/solution_designer/context-files/ctx_token__notes.txt'),
    ).toBe(filePath);
  });

  it('ignores draft locators and non-local external URLs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-file-resolver-'));
    tempDirs.push(tempDir);
    const filePath = path.join(tempDir, 'ctx_token__notes.txt');
    await fs.writeFile(filePath, 'hello');

    const resolver = new ContextFileLocalPathResolver(new StubLayout(filePath) as any);

    expect(resolver.resolve('/rest/drafts/agent-runs/temp-run/context-files/ctx_token__notes.txt')).toBeNull();
    expect(resolver.resolve('https://example.com/rest/runs/run-1/context-files/ctx_token__notes.txt')).toBeNull();
  });
});
