import { describe, it, expect } from 'vitest';
import { SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { getToolSyntaxSpec, toolSyntaxRegistryItems } from '../../../../../src/agent/streaming/adapters/tool-syntax-registry.js';

describe('tool-syntax-registry', () => {
  it('registers run_bash syntax spec', () => {
    const spec = getToolSyntaxSpec(SegmentType.RUN_BASH);
    expect(spec).toBeDefined();
    expect(spec?.toolName).toBe('run_bash');
  });

  it('maps run_bash content and metadata to tool arguments', () => {
    const spec = getToolSyntaxSpec(SegmentType.RUN_BASH);
    const args = spec?.buildArguments({ cwd: 'apps/web', background: true, timeout_seconds: 45 }, 'npm run dev');

    expect(args).toEqual({
      command: 'npm run dev',
      cwd: 'apps/web',
      background: true,
      timeout_seconds: 45
    });
  });

  it('accepts timeoutSeconds alias and normalizes to timeout_seconds', () => {
    const spec = getToolSyntaxSpec(SegmentType.RUN_BASH);
    const args = spec?.buildArguments({ cwd: '.', timeoutSeconds: 12 }, 'echo alias');

    expect(args).toEqual({
      command: 'echo alias',
      cwd: '.',
      timeout_seconds: 12
    });
  });

  it('passes through cwd metadata when present', () => {
    const spec = getToolSyntaxSpec(SegmentType.RUN_BASH);
    const args = spec?.buildArguments({ cwd: 'packages/api' }, 'pwd');

    expect(args).toEqual({
      command: 'pwd',
      cwd: 'packages/api'
    });
  });

  it('falls back to metadata command when segment content is empty', () => {
    const spec = getToolSyntaxSpec(SegmentType.RUN_BASH);
    const args = spec?.buildArguments({ command: 'ls -la' }, '');
    expect(args).toEqual({ command: 'ls -la' });
  });

  it('returns null when no command can be resolved', () => {
    const spec = getToolSyntaxSpec(SegmentType.RUN_BASH);
    const args = spec?.buildArguments({}, '');
    expect(args).toBeNull();
  });

  it('includes run_bash in registry items', () => {
    const entries = toolSyntaxRegistryItems();
    const runBashEntry = entries.find(([segmentType]) => segmentType === SegmentType.RUN_BASH);
    expect(runBashEntry).toBeDefined();
    expect(runBashEntry?.[1].toolName).toBe('run_bash');
  });
});
