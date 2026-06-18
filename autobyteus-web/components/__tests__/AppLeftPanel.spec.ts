import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('AppLeftPanel', () => {
  it('delegates shell primary navigation policy to the shared owner', () => {
    const filePath = resolve(process.cwd(), 'components/AppLeftPanel.vue');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain("useShellPrimaryNavigation");
    expect(content).toContain("resolvePrimaryRoute");
    expect(content).toContain("isPrimaryNavActive");
    expect(content).not.toContain('type PrimaryNavKey');
    expect(content).not.toContain("case 'media'");
    expect(content).not.toContain("shell.navigation.media");
  });

  it('keeps the target Nodes/Media policy in the shared shell primary navigation owner', () => {
    const filePath = resolve(process.cwd(), 'composables/useShellPrimaryNavigation.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain("{ key: 'nodes', labelKey: 'shell.navigation.nodes'");
    expect(content).toContain("return '/nodes';");
    expect(content).toContain("path.startsWith('/nodes')");
    expect(content).toContain("{ path: '/agents', query: { view: 'list' } }");
    expect(content).toContain("{ path: '/agent-teams', query: { view: 'team-list' } }");
    expect(content).not.toContain("key: 'media'");
    expect(content).not.toContain("return '/media'");
  });

  it('renders running-panel event hooks in host component', () => {
    const filePath = resolve(process.cwd(), 'components/AppLeftPanel.vue');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('@run-selected="onRunningRunSelected"');
    expect(content).toContain('@run-created="onRunningRunCreated"');
  });
});
