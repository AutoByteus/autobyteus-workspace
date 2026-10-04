import fs from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentFactory } from 'autobyteus-ts';
import { CollaboratorAdmission } from '../../../src/agent-collaboration/collaborators/collaborator-admission.js';
import { AgentRunCollaborationRootManager } from '../../../src/agent-run-collaboration/services/agent-run-collaboration-root-manager.js';
import { createNativeRootFixture, HOST } from './native-compaction-root-fixture.js';

afterEach(() => vi.restoreAllMocks());

// The normal cases use real native setup/admission. Faults only reject setup;
// they never replace admission with a successful mock or weaken native assertions.
describe('native root fixture owns acquired resources even before returning close', () => {
  it.each(['agent', 'agent_team'] as const)('%s: successful close stops native and removes both owned directories', async kind => {
    const f = await createNativeRootFixture(kind, false);
    const nativeDir = f.native.context.config.memoryDir!;
    try {
      await f.connect();
      expect(f.manager.getActive(HOST)).not.toBeNull();
      expect(f.native.isRunning).toBe(true);
      await fs.access(nativeDir);
      await fs.access(f.rootMemoryDir);
    } finally { await f.close(); }
    expect(f.manager.getActive(HOST)).toBeNull();
    expect(f.native.isRunning).toBe(false);
    await expect(fs.access(nativeDir)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.access(f.rootMemoryDir)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 20000);

  it('root-directory acquisition rejection still closes the acquired native fixture', async () => {
    const created = vi.spyOn(AgentFactory.prototype, 'createAgent'); // call-through
    const failure = new Error('controlled root-directory failure');
    vi.spyOn(fs, 'mkdtemp').mockRejectedValueOnce(failure);
    await expect(createNativeRootFixture('agent', false)).rejects.toBe(failure);
    const native = created.mock.results[0]!.value;
    expect(native.isRunning).toBe(false);
    await expect(fs.access(native.context.config.memoryDir)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 20000);

  it.each([false, true])('post-root admission rejection releases both directories and preserves error (cleanupReportsFailure=%s)', async cleanupReportsFailure => {
    const created = vi.spyOn(AgentFactory.prototype, 'createAgent'); // call-through
    const directory = vi.spyOn(fs, 'mkdtemp'); // call-through, exact owned path
    const terminate = vi.spyOn(AgentRunCollaborationRootManager.prototype, 'terminateRoot');
    const failure = new Error('controlled admission setup failure');
    vi.spyOn(CollaboratorAdmission.prototype, 'ensure').mockRejectedValueOnce(failure);
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cleanupFailure = new Error('controlled cleanup uncertainty after actual removal');
    if (cleanupReportsFailure) {
      const remove = fs.rm.bind(fs);
      vi.spyOn(fs, 'rm').mockImplementationOnce(async (...args) => {
        await remove(...args);
        throw cleanupFailure;
      });
    }
    await expect(createNativeRootFixture('agent_team', false)).rejects.toBe(failure);
    const native = created.mock.results[0]!.value;
    const rootDir = await directory.mock.results[0]!.value;
    expect(terminate).toHaveBeenCalledWith(HOST);
    expect(native.isRunning).toBe(false);
    await expect(fs.access(native.context.config.memoryDir)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.access(rootDir)).rejects.toMatchObject({ code: 'ENOENT' });
    if (cleanupReportsFailure) {
      expect(report).toHaveBeenCalledWith(
        'Native root fixture setup cleanup failed; preserving setup error',
        expect.objectContaining({ errors: [cleanupFailure] }),
      );
    } else expect(report).not.toHaveBeenCalled();
  }, 20000);
});
