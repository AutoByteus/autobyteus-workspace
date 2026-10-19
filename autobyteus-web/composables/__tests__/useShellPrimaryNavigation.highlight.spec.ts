import { beforeEach, describe, expect, it, vi } from 'vitest';

const { route, contexts, selection } = vi.hoisted(() => ({
  route: { path: '/chat', query: {} as Record<string, string> },
  contexts: { registered: new Set<string>() },
  selection: { selectedType: null as string | null, selectedRunId: null as string | null },
}));

vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => ({ isEnabled: false, ensureResolved: vi.fn() }),
}));
vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({
    getRun: (id: string) => (contexts.registered.has(id) ? { state: { runId: id } } : undefined),
  }),
}));
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => selection }));

import { useShellPrimaryNavigation } from '../useShellPrimaryNavigation';

/** collapsed-left-panel-expand-keeps-run (REQ-008, AC-011): the lit icon is where you are. */
describe('useShellPrimaryNavigation highlight', () => {
  const at = (path: string, query: Record<string, string> = {}) => {
    route.path = path;
    route.query = query;
    const nav = useShellPrimaryNavigation();
    return { workspaces: nav.isWorkspacesActive.value, chat: nav.isPrimaryNavActive('chat'), nav };
  };

  beforeEach(() => {
    contexts.registered = new Set(['run-1']);
    Object.assign(selection, { selectedType: null, selectedRunId: null });
  });

  it('lights Workspaces, not Chat, on a shown Agent run', () => {
    selection.selectedType = 'agent';
    selection.selectedRunId = 'run-1';
    expect(at('/chat', { id: 'run-1' })).toMatchObject({ workspaces: true, chat: false });
  });

  it('lights neither while the Agent run is still opening (not registered yet)', () => {
    expect(at('/chat', { id: 'run-opening' })).toMatchObject({ workspaces: false, chat: false });
  });

  it('lights Chat, not Workspaces, on New chat', () => {
    expect(at('/chat')).toMatchObject({ workspaces: false, chat: true });
  });

  it('lights Workspaces on a shown Team run', () => {
    Object.assign(selection, { selectedType: 'team', selectedRunId: 'team-1' });
    expect(at('/workspace')).toMatchObject({ workspaces: true, chat: false });
  });

  it('lights Workspaces on a shown Org run (active or history)', () => {
    expect(at('/workspace', { rootSubjectKind: 'agent_org', definitionId: 'org', orgRunId: 'org-1', mode: 'active' }).workspaces).toBe(true);
    expect(at('/workspace', { rootSubjectKind: 'agent_org', definitionId: 'org', orgRunId: 'org-1', mode: 'history' }).workspaces).toBe(true);
  });

  it('does not light Workspaces on the Org launch page, even with a Team still selected', () => {
    Object.assign(selection, { selectedType: 'team', selectedRunId: 'team-1' });
    expect(at('/workspace', { rootSubjectKind: 'agent_org', definitionId: 'org', mode: 'configuration' }).workspaces).toBe(false);
  });

  it('does not light Workspaces on an empty /workspace or a Team draft', () => {
    expect(at('/workspace').workspaces).toBe(false);
    Object.assign(selection, { selectedType: 'team_draft', selectedRunId: 'draft-1' });
    expect(at('/workspace').workspaces).toBe(false);
  });

  it('lights the page icon, not Workspaces, on other pages', () => {
    Object.assign(selection, { selectedType: 'team', selectedRunId: 'team-1' });
    const { workspaces, chat, nav } = at('/agents', { view: 'list' });
    expect(workspaces).toBe(false);
    expect(chat).toBe(false);
    expect(nav.isPrimaryNavActive('agents')).toBe(true);
  });
});
