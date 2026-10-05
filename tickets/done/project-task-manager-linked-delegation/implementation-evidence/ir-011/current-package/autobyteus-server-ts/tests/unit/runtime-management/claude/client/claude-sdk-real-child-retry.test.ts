import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { beginClaudeSdkSessionOpening } from '../../../../../src/runtime-management/claude/client/claude-sdk-session-opening.js';
const observed = vi.hoisted(() => ({ children: [] as unknown[] }));
vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: (...args: Parameters<typeof actual.spawn>) => {
    const child = actual.spawn(...args); observed.children.push(child); return child;
  } };
});

describe('actual pinned SDK public hook / retained real-child release', () => {
  it('reports failed stop while the same test-owned child stays alive, then proves same-child exit/IO on retry', async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-actual-retry-'));
    observed.children.length = 0;
    let initialization!: Promise<unknown>;
    const opening = beginClaudeSdkSessionOpening({ createQuery: async control => {
      const q = query({ prompt: control.channel as never, options: {
        cwd: home, settingSources: [], pathToClaudeCodeExecutable: path.resolve('tests/fixtures/claude-owned-sdk-cli.mjs'),
        env: { HOME: home, PATH: process.env.PATH, CLAUDE_CONFIG_DIR: path.join(home, 'config'), ANTHROPIC_API_KEY: '', TEST_OWNED_HOLD_FOR_RELEASE: '1' },
        spawnClaudeCodeProcess: control.spawn,
      } });
      control.registerQuery(q); initialization = q.initializationResult();
    } });
    let child: ChildProcessWithoutNullStreams | undefined;
    let killFailure: ReturnType<typeof vi.spyOn> | undefined;
    try {
      await opening.open(); await initialization;
      expect(observed.children).toHaveLength(1);
      child = observed.children[0] as ChildProcessWithoutNullStreams;
      const pid = child.pid; expect(pid).toBeGreaterThan(0);
      killFailure = vi.spyOn(child, 'kill').mockReturnValue(false);
      expect((await opening.release()).kind).toBe('failed');
      expect(child.exitCode).toBeNull(); expect(child.signalCode).toBeNull();
      expect(killFailure).toHaveBeenCalledWith('SIGKILL');
      killFailure.mockRestore(); killFailure = undefined;
      const signals = vi.spyOn(child, 'kill');
      expect(await opening.release()).toEqual({ kind: 'released' });
      expect(child.pid).toBe(pid); expect(child.signalCode).toBe('SIGKILL');
      expect(child.stdin.closed && child.stdout.closed && child.stderr.closed).toBe(true);
      const count = signals.mock.calls.length;
      expect(await opening.release()).toEqual({ kind: 'released' });
      expect(signals).toHaveBeenCalledTimes(count);
      await expect(opening.open()).rejects.toThrow('CLAUDE_OPENING_CLOSED');
      expect(observed.children).toHaveLength(1);
      signals.mockRestore();
    } finally {
      killFailure?.mockRestore();
      if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await opening.release();
      await fs.rm(home, { recursive: true, force: true });
    }
  }, 35_000);
});
