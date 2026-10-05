import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectStore } from '../../../src/projects/stores/project-store.js';
import { parseProjectState, serializeProjectState } from '../../../src/projects/stores/project-state-schema.js';
const now = '2026-10-03T00:00:00.000Z';
const project = { projectId: 'project-A', name: 'A', description: 'saved', createdAt: now, updatedAt: now, workspaces: [] };
const execution = { root: { rootSubjectKind: 'agent', rootRunId: 'root' }, execution: { agentRunId: 'worker' }, ingressAgentRunId: 'worker', purpose: 'assignment', reservedAt: now, dispatch: 'reserved', cleanup: 'pending' };
const lifetime = { lifetimeId: 'lifetime-A', projectId: 'project-A', taskId: 'task-A', openedAt: now, completedAt: now, executions: [execution] };
let dir: string, store: ProjectStore;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-current-array-')); store = new ProjectStore({ getAppDataDir: () => dir }); });
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });
const write = async (raw: unknown) => { await fs.mkdir(path.dirname(store.getFilePath()), { recursive: true }); await fs.writeFile(store.getFilePath(), JSON.stringify(raw)); };

describe('one current Project-row array authority, no migration', () => {
  it('reads missing/released arrays without writes; first ordinary write is exact and omits an empty collection', async () => {
    expect(await store.readState()).toEqual({ projects: [], taskLifetimes: [] });
    await expect(fs.stat(path.dirname(store.getFilePath()))).rejects.toMatchObject({ code: 'ENOENT' });
    const input = [{ ...project, extra: 'ignored', taskLifetimes: 'unrelated Project extra' }];
    await write(input);
    const before = await fs.readFile(store.getFilePath(), 'utf8'), stat = await fs.stat(store.getFilePath());
    expect(await store.readState()).toEqual({ projects: [{ ...project, tasks: [] }], taskLifetimes: [] });
    expect(await fs.readFile(store.getFilePath(), 'utf8')).toBe(before);
    expect((await fs.stat(store.getFilePath())).mtimeMs).toBe(stat.mtimeMs);
    expect(await fs.readdir(path.dirname(store.getFilePath()))).toEqual(['projects.json']);
    await store.updateRecords(rows => rows.map(row => ({ ...row, name: 'ordinary edit' })));
    expect(JSON.parse(await fs.readFile(store.getFilePath(), 'utf8'))).toEqual([{ ...project, name: 'ordinary edit', tasks: [] }]);
  });

  it('retains node collection through metadata replacement and last Project deletion/restart', async () => {
    await write([project, { taskLifetimes: [lifetime], extra: 'not persisted' }]);
    await store.updateRecords(rows => rows.map(row => ({ ...row, description: 'edit' })));
    expect((await store.readState()).taskLifetimes).toEqual([lifetime]);
    await store.updateRecords(() => []);
    expect(JSON.parse(await fs.readFile(store.getFilePath(), 'utf8'))).toEqual([{ taskLifetimes: [lifetime] }]);
    const restarted = new ProjectStore({ getAppDataDir: () => dir });
    expect(await restarted.listRecords()).toEqual([]);
    expect((await restarted.readState()).taskLifetimes).toEqual([lifetime]);
    expect(serializeProjectState(parseProjectState([project, { taskLifetimes: [] }]))).toEqual([{ ...project, tasks: [] }]);
  });

  it.each([
    { projects: [project], taskLifetimes: [] },
    [project, { taskLifetimes: null }],
    [project, { taskLifetimes: [] }, { taskLifetimes: [] }],
    [project, { taskLifetimes: [lifetime, lifetime] }],
    [project, { taskLifetimes: [{ ...lifetime, executions: [{ ...execution, cleanup: 'not_requested' }] }] }],
    [project, { taskLifetimes: [lifetime, { ...lifetime, lifetimeId: 'other' }] }],
    [project, { taskLifetimes: [{ ...lifetime, completedAt: null }, { ...lifetime, lifetimeId: 'other', completedAt: null, executions: [] }] }],
  ])('rejects unsupported authority/critical collection facts without reset (%#)', async raw => {
    await write(raw); const before = await fs.readFile(store.getFilePath(), 'utf8');
    await expect(store.readState()).rejects.toMatchObject({ code: 'PROJECT_STATE_UNAVAILABLE' });
    await expect(store.updateRecords(rows => rows)).rejects.toMatchObject({ code: 'PROJECT_STATE_UNAVAILABLE' });
    expect(await fs.readFile(store.getFilePath(), 'utf8')).toBe(before);
    expect(await fs.readdir(path.dirname(store.getFilePath()))).toEqual(['projects.json']);
  });

  it('does not reinterpret Project identity even when a malformed Project carries a collection-shaped extra', () => {
    expect(parseProjectState([{ projectId: '', taskLifetimes: 'not a node collection' }, project])).toEqual({ projects: [{ ...project, tasks: [] }], taskLifetimes: [] });
  });

  it('observes validated logical commit immediately, despite subsequent lock-finalization failure', async () => {
    await write([project]); const original = fs.unlink.bind(fs);
    vi.spyOn(fs, 'unlink').mockImplementation(async file => {
      await original(file);
      if (String(file) === `${store.getFilePath()}.lock`) throw new Error('test finalization failure');
    });
    const observed = vi.fn(state => {
      expect(Array.isArray(state)).toBe(false);
      expect(state).toEqual({ projects: [{ ...project, tasks: [] }], taskLifetimes: [lifetime] });
    });
    const result = await store.updateState(state => ({ ...state, taskLifetimes: [lifetime] as any }), observed);
    expect(observed).toHaveBeenCalledTimes(1);
    expect(result).toEqual(await store.readState());
    expect(JSON.parse(await fs.readFile(store.getFilePath(), 'utf8'))).toEqual([{ ...project, tasks: [] }, { taskLifetimes: [lifetime] }]);
  });
});
