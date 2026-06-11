import { describe, expect, it } from 'vitest';
import * as rootExports from '../../../src/index.js';
import { ExternalChannelProvider } from '../../../src/external-channel/provider.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { getDefaultSessionFactory } from '../../../src/tools/terminal/session-factory.js';
import { ParameterSchema } from '../../../src/utils/parameter-schema.js';

// Build removed names/paths from segments so cleanup scans still catch
// accidental live imports or direct symbol usage in source/tests/examples.
const removedRootExports = [
  ['run', 'Agent', 'Cli'],
  ['run', 'Agent', 'Team', 'Cli'],
  ['Interactive', 'Cli', 'Display'],
  ['Tui', 'State', 'Store'],
  ['Agent', 'Team', 'App'],
  ['Agent', 'List', 'Sidebar'],
  ['Focus', 'Pane'],
  ['Status', 'Bar'],
  ['Logo'],
  ['build', 'History', 'Lines'],
  ['render', 'Assistant', 'Complete', 'Response'],
  ['render', 'Tool', 'Approval', 'Request']
].map((parts) => parts.join(''));

const removedSourceRoot = ['..', '..', '..', 'src', 'cli'].join('/');

const removedSourceModuleSpecifiers = [
  `${removedSourceRoot}/index.js`,
  `${removedSourceRoot}/agent/agent-cli.js`,
  `${removedSourceRoot}/agent/cli-display.js`,
  `${removedSourceRoot}/agent-team/app.js`,
  `${removedSourceRoot}/agent-team/state-store.js`,
  `${removedSourceRoot}/agent-team/widgets/index.js`
];

describe('autobyteus-ts public surface after native CLI/TUI removal', () => {
  it('keeps supported programmatic root and deep imports available', () => {
    expect(rootExports.ExternalChannelProvider).toBe(ExternalChannelProvider);
    expect(rootExports.LLMProvider).toBe(LLMProvider);
    expect(rootExports.ParameterSchema).toBe(ParameterSchema);
    expect(rootExports.getDefaultSessionFactory).toBe(getDefaultSessionFactory);

    expect(ExternalChannelProvider.WECOM).toBe('WECOM');
    expect(LLMProvider.OPENAI).toBe('OPENAI');
    expect(typeof getDefaultSessionFactory()).toBe('function');
  });

  it('does not expose removed native CLI/TUI symbols from the root package surface', () => {
    const exportedRoot = rootExports as Record<string, unknown>;

    for (const removedExport of removedRootExports) {
      expect(exportedRoot).not.toHaveProperty(removedExport);
    }
  });

  it.each(removedSourceModuleSpecifiers)('does not leave a source module stub at %s', async (moduleSpecifier) => {
    const moduleUrl = new URL(moduleSpecifier, import.meta.url).href;

    await expect(import(moduleUrl)).rejects.toThrow(/Cannot find module|ENOENT|Failed to load url/);
  });
});
