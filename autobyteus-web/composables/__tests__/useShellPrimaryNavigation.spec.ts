import { describe, expect, it } from 'vitest';
import {
  isShellPrimaryRouteActive,
  resolveShellPrimaryRoute,
  type ShellPrimaryNavKey,
} from '../useShellPrimaryNavigation';

const activeShellPrimaryKeys: ShellPrimaryNavKey[] = [
  'agents',
  'agentTeams',
  'applications',
  'skills',
  'memory',
  'nodes',
];

describe('useShellPrimaryNavigation shared policy helpers', () => {
  it('uses Nodes as a shell primary item and does not retain Media as a primary key', () => {
    expect(activeShellPrimaryKeys).toContain('nodes');
    expect(activeShellPrimaryKeys).not.toContain('media' as ShellPrimaryNavKey);
  });

  it('routes promoted Nodes to the top-level nodes page', () => {
    expect(resolveShellPrimaryRoute('nodes')).toBe('/nodes');
    expect(resolveShellPrimaryRoute('agents')).toEqual({ path: '/agents', query: { view: 'list' } });
    expect(resolveShellPrimaryRoute('agentTeams')).toEqual({ path: '/agent-teams', query: { view: 'team-list' } });
  });

  it('matches active route state for the Nodes primary item', () => {
    expect(isShellPrimaryRouteActive('nodes', { path: '/nodes', query: {} })).toBe(true);
    expect(isShellPrimaryRouteActive('nodes', { path: '/nodes/details', query: {} })).toBe(true);
    expect(isShellPrimaryRouteActive('nodes', { path: '/media', query: {} })).toBe(false);
  });

  // collapsed-left-panel-expand-keeps-run (REQ-008, AC-011): Chat means New chat.
  it('lights Chat only on New chat, not on an open run', () => {
    expect(isShellPrimaryRouteActive('chat', { path: '/chat', query: {} })).toBe(true);
    expect(isShellPrimaryRouteActive('chat', { path: '/chat', query: { id: '  ' } })).toBe(true);
    expect(isShellPrimaryRouteActive('chat', { path: '/chat', query: { id: 'run-1' } })).toBe(false);
    expect(isShellPrimaryRouteActive('chat', { path: '/workspace', query: {} })).toBe(false);
    expect(isShellPrimaryRouteActive('agents', { path: '/agents', query: { view: 'list' } })).toBe(true);
  });
});
