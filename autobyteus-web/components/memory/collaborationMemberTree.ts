import type { CollaborationMemberMemoryTargetSummary, CollaborationMemoryGroup } from '~/types/memory';

/** One level of a run's member structure: the root (no group) or one configured/task team. */
export interface CollaborationMemberBlock {
  key: string;
  depth: number;
  group: CollaborationMemoryGroup | null;
  members: Array<{ member: CollaborationMemberMemoryTargetSummary; label: string }>;
}

type TreeNode = {
  /** The group as sent by the backend (full display name), used as the prefix for its children. */
  sourceGroup: CollaborationMemoryGroup | null;
  group: CollaborationMemoryGroup | null;
  members: CollaborationMemberMemoryTargetSummary[];
  children: Map<string, TreeNode>;
};

/** A member inside a group is labeled relative to that group (`StudentStudyGroup/student_one` → `student_one`). */
const relativeLabel = (member: CollaborationMemberMemoryTargetSummary): string => {
  const group = member.groupPath[member.groupPath.length - 1];
  const prefix = group ? `${group.displayName}/` : null;
  return prefix && member.displayName.startsWith(prefix) ? member.displayName.slice(prefix.length) : member.displayName;
};

const relativeGroup = (group: CollaborationMemoryGroup, parent: CollaborationMemoryGroup | null): CollaborationMemoryGroup => {
  const prefix = parent ? `${parent.displayName}/` : null;
  return prefix && group.displayName.startsWith(prefix)
    ? { ...group, displayName: group.displayName.slice(prefix.length) }
    : group;
};

/**
 * Builds depth-first blocks from the backend's structural member order. Groups are keyed by `teamRunId`, never by
 * address: a task team can share its address with the configured team it was delegated to. The root block comes
 * first; a group appears only when a member inside it has memory (the backend lists only such members).
 */
export const buildCollaborationMemberBlocks = (
  members: readonly CollaborationMemberMemoryTargetSummary[],
): CollaborationMemberBlock[] => {
  const root: TreeNode = { sourceGroup: null, group: null, members: [], children: new Map() };
  for (const member of members) {
    let node = root;
    for (const group of member.groupPath) {
      let child = node.children.get(group.teamRunId);
      if (!child) {
        child = { sourceGroup: group, group: relativeGroup(group, node.sourceGroup), members: [], children: new Map() };
        node.children.set(group.teamRunId, child);
      }
      node = child;
    }
    node.members.push(member);
  }
  const blocks: CollaborationMemberBlock[] = [];
  const visit = (node: TreeNode, depth: number, key: string): void => {
    blocks.push({ key, depth, group: node.group, members: node.members.map((member) => ({ member, label: relativeLabel(member) })) });
    for (const [teamRunId, child] of node.children) visit(child, depth + 1, teamRunId);
  };
  visit(root, 0, 'root');
  return blocks.filter((block) => block.group !== null || block.members.length > 0);
};

export const isTaskMember = (member: CollaborationMemberMemoryTargetSummary): boolean =>
  member.executionKind !== 'CONFIGURED';
