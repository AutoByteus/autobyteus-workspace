import { describe, expect, it } from 'vitest';
import { getToolDisplaySummary } from '../toolDisplaySummary';

describe('getToolDisplaySummary', () => {
  it('keeps the full redacted command available instead of hard-truncating it', () => {
    const summary = getToolDisplaySummary('run_bash', {
      command: 'printf "alpha beta gamma delta epsilon" --token super-secret-value',
    });

    expect(summary).toEqual({
      kind: 'command',
      text: 'printf "alpha beta gamma delta epsilon" --token ***',
      title: 'printf "alpha beta gamma delta epsilon" --token ***',
    });
  });

  it('can compact file paths for inline summaries while preserving the full path for hover text', () => {
    const summary = getToolDisplaySummary(
      'write_file',
      { path: '/Users/normy/workspace/autobyteus-web/components/FooBar.vue' },
      { preferCompactPath: true },
    );

    expect(summary).toEqual({
      kind: 'file',
      text: 'components/FooBar.vue',
      title: '/Users/normy/workspace/autobyteus-web/components/FooBar.vue',
    });
  });

  it('falls back to contextual text for non-command tools when arguments are empty', () => {
    const summary = getToolDisplaySummary(
      'web_search',
      {},
      { fallbackText: 'latest vite accessibility guidance' },
    );

    expect(summary).toEqual({
      kind: 'text',
      text: 'latest vite accessibility guidance',
      title: 'latest vite accessibility guidance',
    });
  });

  // autobyteus-590 D-2a (DEC-006, DEC-007).
  describe('the platform agent tools and the cd prefix', () => {
    it.each([
      ['send_message_to', { recipient_address: '/architecture_reviewer', content: 'Please review the design.' }, '→ /architecture_reviewer'],
      ['delegate_task', { recipient_address: '/video_producer', description: 'Render the cut.' }, '→ /video_producer'],
      ['get_project_task', { task_id: 'autobyteus-590' }, 'autobyteus-590'],
      ['update_task', { task_id: 'autobyteus-590', status: 'DONE' }, 'autobyteus-590'],
    ] as const)('%s says whom it addresses or which Task', (toolName, args, text) => {
      expect(getToolDisplaySummary(toolName, args)).toEqual({ kind: 'text', text, title: text });
    });

    it('command and file keys still come first; the recipient and Task keys come before the generic text keys', () => {
      expect(getToolDisplaySummary('x', { command: 'ls', recipient_address: '/a' })?.text).toBe('ls');
      expect(getToolDisplaySummary('x', { path: '/w/a.md', task_id: 't-1' })?.kind).toBe('file');
      expect(getToolDisplaySummary('send_message_to', { recipient_address: '/a', message: 'hi', title: 'T' })?.text).toBe('→ /a');
      expect(getToolDisplaySummary('create_task', { task_id: 't-1', title: 'Write the spec' })?.text).toBe('t-1');
      expect(getToolDisplaySummary('create_task', { title: 'Write the spec' })?.text).toBe('Write the spec');
    });

    it.each([
      ['cd /Users/me/repo && pnpm test', 'pnpm test'],
      ['cd "/Users/me/my repo" && git status --short', 'git status --short'],
      ["cd '/tmp/x'; ls -la", 'ls -la'],
      ['  cd sub &&   make build', 'make build'],
    ])('a command summary leaves out one leading cd: %s', (command, text) => {
      expect(getToolDisplaySummary('run_bash', { command })).toEqual({ kind: 'command', text, title: command.trim() });
    });

    it.each([
      'cd /Users/me/repo',
      'cd a && cd b && make',
      'echo cd /x && ls',
      'cdx /x && ls',
    ])('keeps a command that is only a cd, drops just the first cd, and leaves other commands alone: %s', (command) => {
      const summary = getToolDisplaySummary('run_bash', { command });
      expect(summary?.title).toBe(command);
      expect(summary?.text).toBe(command === 'cd a && cd b && make' ? 'cd b && make' : command);
    });

    it('redacts secrets in both the text and the title', () => {
      expect(getToolDisplaySummary('run_bash', { command: 'cd /w && deploy --token abc123' })).toEqual({
        kind: 'command', text: 'deploy --token ***', title: 'cd /w && deploy --token ***',
      });
    });
  });

  it.each([
    ['run_command', { CommandLine: 'cd /home/user/project && ls -R', IsDaemon: false }, 'command', 'ls -R'],
    ['read_file', { Path: '/home/user/project/src/index.ts', StartLine: 1 }, 'file', 'src/index.ts'],
    ['view_file', { AbsolutePath: '/home/user/project/docs/plan.md' }, 'file', 'docs/plan.md'],
  ] as const)('Antigravity\'s %s: its PascalCase argument is the summary', (toolName, args, kind, text) => {
    expect(getToolDisplaySummary(toolName, args, { preferCompactPath: true })).toMatchObject({ kind, text });
  });

  // The shapes of the scripted AGY CLI's native_arguments case (agy-native-arguments-turn.mjs), as the node passes them.
  it.each([
    ['write_to_file', { TargetFile: '/home/user/project/notes/marker.txt', CodeContent: 'BEFORE', Overwrite: false }, 'file', 'notes/marker.txt'],
    ['replace_file_content', { TargetFile: '/home/user/project/notes/marker.txt', TargetContent: 'BEFORE', ReplacementContent: 'MIDDLE' }, 'file', 'notes/marker.txt'],
    ['list_dir', { DirectoryPath: '/home/user/project/src' }, 'file', 'project/src'],
    ['grep_search', { SearchPath: '/home/user/project', Query: 'AFTER', IsRegex: false }, 'text', 'AFTER'],
    ['find_by_name', { SearchDirectory: '/home/user/project', Pattern: '*.txt', Type: 'file' }, 'text', '*.txt'],
  ] as const)('Antigravity\'s %s shows what it works on or looks for', (toolName, args, kind, text) => {
    expect(getToolDisplaySummary(toolName, args, { preferCompactPath: true })).toMatchObject({ kind, text });
  });

  it('a search\'s folder alone is not a summary (only what it looks for is)', () => {
    expect(getToolDisplaySummary('grep_search', { SearchPath: '/home/user/project' })).toBeNull();
  });
});

