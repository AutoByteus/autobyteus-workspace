/**
 * The Memory page's Browse address (autobyteus-554, UI/UX spec UIS-001…UIS-006): `node` names a Browse tab or an owner
 * reached through it, for example `agents`, `agents/agent:<id>`, `teams/team:<id>/agent:<id>`,
 * `orgs/org:<id>/team:<id>`, `agents/unattributed` or `global`. IDs are URI-encoded in their segment, so a team-local
 * agent ID (`team-local-agent:<team>:<member>`) stays one segment.
 */
export type MemoryBrowseGroup = 'global' | 'agents' | 'teams' | 'orgs';
export type MemoryOwnerKind = 'agent' | 'team' | 'org' | 'unattributed';

export interface MemoryOwnerRef {
  kind: MemoryOwnerKind;
  /** The definition ID; empty for `unattributed`. */
  id: string;
}

export interface MemoryBrowseNode {
  key: string;
  group: MemoryBrowseGroup;
  /** The owners from the tab down to the one shown; empty on a tab. */
  path: MemoryOwnerRef[];
}

const GROUPS: readonly MemoryBrowseGroup[] = ['global', 'agents', 'teams', 'orgs'];
const KINDS: readonly MemoryOwnerKind[] = ['agent', 'team', 'org'];

/** The node of an address; an unknown or malformed address is the Agents tab (the page's entry). */
export const parseMemoryBrowseNode = (value: string | null | undefined): MemoryBrowseNode => {
  const [group, ...segments] = (value ?? '').split('/');
  if (!GROUPS.includes(group as MemoryBrowseGroup)) return { key: 'agents', group: 'agents', path: [] };
  const path: MemoryOwnerRef[] = [];
  for (const segment of segments) {
    if (segment === 'unattributed') {
      path.push({ kind: 'unattributed', id: '' });
      continue;
    }
    const separator = segment.indexOf(':');
    const kind = segment.slice(0, separator) as MemoryOwnerKind;
    if (separator <= 0 || !KINDS.includes(kind)) return { key: group!, group: group as MemoryBrowseGroup, path: [] };
    try {
      path.push({ kind, id: decodeURIComponent(segment.slice(separator + 1)) });
    } catch {
      return { key: group!, group: group as MemoryBrowseGroup, path: [] };
    }
  }
  return { key: value as string, group: group as MemoryBrowseGroup, path };
};

const segmentOf = (owner: MemoryOwnerRef): string =>
  owner.kind === 'unattributed' ? 'unattributed' : `${owner.kind}:${encodeURIComponent(owner.id)}`;

/** The address of an owner reached from `parent` (a tab or an owner's page). */
export const childNodeKey = (parent: string, owner: MemoryOwnerRef): string => `${parent}/${segmentOf(owner)}`;

/** The owner a node shows, or null on a tab. */
export const ownerOf = (node: MemoryBrowseNode): MemoryOwnerRef | null => node.path[node.path.length - 1] ?? null;

/** Where Back goes from an owner's page: the card it was opened from (its tab, or the team or org it was reached through). */
export const parentNodeKey = (node: MemoryBrowseNode): string =>
  node.path.length <= 1 ? node.group : node.key.slice(0, node.key.lastIndexOf('/'));
