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
    expect(isShellPrimaryRouteActive('nodes', '/nodes')).toBe(true);
    expect(isShellPrimaryRouteActive('nodes', '/nodes/details')).toBe(true);
    expect(isShellPrimaryRouteActive('nodes', '/media')).toBe(false);
  });
});
