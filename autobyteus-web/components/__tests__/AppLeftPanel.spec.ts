import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('AppLeftPanel', () => {
  it('renders Memory navigation item via localization keys and canonical agents/teams route mappings without legacy messaging/tools routes', () => {
    const filePath = resolve(process.cwd(), 'components/AppLeftPanel.vue');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain("{ key: 'memory', labelKey: 'shell.navigation.memory'");
    expect(content).not.toContain("{ key: 'messaging', label:");
    expect(content).not.toContain("{ key: 'tools', label:");
    expect(content).toContain("{ path: '/agents', query: { view: 'list' } }");
    expect(content).toContain("{ path: '/agent-teams', query: { view: 'team-list' } }");
    expect(content).toContain("const { t } = useLocalization();");
    expect(content).toContain("{{ t(item.labelKey) }}");
    expect(content).not.toContain("return '/messaging';");
    expect(content).not.toContain("return '/tools';");
    expect(content).not.toContain('/prompt-engineering');
    expect(content).not.toContain('Prompt Engineering');
  });

  it('renders running-panel event hooks in host component', () => {
    const filePath = resolve(process.cwd(), 'components/AppLeftPanel.vue');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('@run-selected=\"onRunningRunSelected\"');
    expect(content).toContain('@run-created=\"onRunningRunCreated\"');
  });
});
