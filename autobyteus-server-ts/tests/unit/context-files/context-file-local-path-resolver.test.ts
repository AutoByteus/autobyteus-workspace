import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContextFileLocalPathResolver } from '../../../src/context-files/services/context-file-local-path-resolver.js';

class StubLayout {
  constructor(private readonly resolvedFilePath: string) {}

  getMemoryRootDirPath(): string { return path.dirname(this.resolvedFilePath); }

  getFinalFilePath(): string {
    return this.resolvedFilePath;
  }

  getDraftFilePath(): string {
    return this.resolvedFilePath;
  }
}

const stubOwnerResolver = {
  validateDraftOwnerSync: () => {},
  resolveFinalOwnerSync: (owner: any) =>
    owner.kind === 'team_member_final'
      ? { ...owner, agentRunId: 'worker_00000000000000000000000000000001' }
      : owner,
};

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

    const resolver = new ContextFileLocalPathResolver({
      layout: new StubLayout(filePath) as any,
      ownerResolver: stubOwnerResolver,
      baseUrl: "http://localhost:8000",
    });

    expect(resolver.resolve('/rest/runs/run-1/context-files/ctx_token__notes.txt')).toBe(filePath);
    expect(
      resolver.resolve('/rest/team-runs/team-1/agent-runs/designer-run/context-files/ctx_token__notes.txt'),
    ).toBe(filePath);
    expect(resolver.resolve('rest/team-runs/team-1/agent-runs/designer-run/context-files/ctx_token__notes.txt?download=1#preview')).toBe(filePath);
    expect(resolver.resolve('/rest/team-runs/team-1/members/%2Fsolution_designer/context-files/ctx_token__notes.txt')).toBeNull();
  });

  it('resolves draft locators but ignores non-local external URLs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-file-resolver-'));
    tempDirs.push(tempDir);
    const filePath = path.join(tempDir, 'ctx_token__notes.txt');
    await fs.writeFile(filePath, 'hello');

    const resolver = new ContextFileLocalPathResolver({
      layout: new StubLayout(filePath) as any,
      ownerResolver: stubOwnerResolver,
      baseUrl: "http://localhost:8000",
    });

    expect(resolver.resolve('/rest/drafts/agent-runs/temp-run/context-files/ctx_token__notes.txt')).toBe(filePath);
    expect(
      resolver.resolve('/rest/drafts/team-runs/team-1/members/%2Fsolution_designer/context-files/ctx_token__notes.txt'),
    ).toBe(filePath);
    expect(resolver.resolve('/rest/drafts/agent-org-runs/org-1/agent-runs/agent-1/context-files/ctx_token__notes.txt')).toBe(filePath);
    expect(resolver.resolve('/rest/drafts/agent-collaborations/host-1/agent-runs/child-1/context-files/ctx_token__notes.txt?v=1')).toBe(filePath);
    expect(resolver.resolve('http://localhost:8000/rest/drafts/agent-runs/temp-run/context-files/ctx_token__notes.txt')).toBe(filePath);
    expect(resolver.resolve('https://example.com/rest/runs/run-1/context-files/ctx_token__notes.txt')).toBeNull();
    expect(resolver.resolve('/rest/drafts/agent-runs/temp-run/context-files/%E0%A4%A')).toBeNull();
    expect(resolver.resolve('/rest/drafts/team-runs/team-1/members/no-root/context-files/ctx_token__notes.txt')).toBeNull();
    expect(resolver.resolve('/rest/drafts/team-runs/team-1/members/C/D/context-files/ctx_token__notes.txt')).toBeNull();
  });
});
