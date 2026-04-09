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
});
