import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type {
  ConversationTargetResolution,
  ConversationTargetResolutionReason,
  ConversationTargetResolutionTarget,
  ConversationTargetSource,
} from '~/types/agent/ConversationTargetAddress';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';
import { isTaskAgentOnlyConversation } from '~/utils/teamTaskAgentConversation';
import {
  buildConversationTargetAddressForNode,
  buildConversationTargetKey,
  cloneConversationTargetSegments,
  normalizeConversationRouteKey,
} from '~/utils/teamConversationTargetSegments';

export interface ResolveTeamConversationTargetAddressOptions {
  allowSubteam?: boolean;
  allowActiveExecutionSafetyFallback?: boolean;
}

const buildResolution = (
  target: ConversationTargetResolutionTarget | null,
  focusedMemberRouteKey: string,
  reason: ConversationTargetResolutionReason | null = null,
): ConversationTargetResolution => ({ target, focusedMemberRouteKey, reason });

const displayLabelForNode = (node: TeamMemberNode): string => {
  if (node.isTaskAgentInstance) return `${node.displayName || node.memberName} (task agent)`;
  if (node.isTaskTeamInstance) return `${node.displayName || node.memberName} (task team)`;
  if (node.isTaskTeamChildProjection) return `${node.displayName || node.memberName} (task-team member)`;
  return node.displayName || node.memberName;
};

const resolveRouteTarget = (
  teamContext: AgentTeamContext,
  memberRouteKey: string,
  options: ResolveTeamConversationTargetAddressOptions,
  source: ConversationTargetSource,
): ConversationTargetResolution => {
  if (!memberRouteKey) return buildResolution(null, memberRouteKey, 'missing_focus');

  const node = teamContext.memberNodesByRouteKey.get(memberRouteKey) || null;
  if (!node) return buildResolution(null, memberRouteKey, 'missing_node');

  if (node.memberKind === 'agent_team' && !node.isTaskTeamInstance && !node.isTaskTeamChildProjection && !options.allowSubteam) {
    return buildResolution(null, memberRouteKey, 'subteam_without_leaf_context');
  }

  const addressResult = buildConversationTargetAddressForNode(node);
  if (!addressResult || addressResult.address.segments.length === 0) {
    return buildResolution(null, memberRouteKey, 'missing_runtime_identity');
  }

  const context: AgentContext | null = node.memberKind === 'agent'
    ? teamContext.leafAgentContextsByRouteKey.get(memberRouteKey) || null
    : null;

  if (node.memberKind === 'agent' && !context) return buildResolution(null, memberRouteKey, 'missing_leaf_context');
  if (context && !node.isTaskAgentInstance && isTaskAgentOnlyConversation(context)) {
    return buildResolution(null, memberRouteKey, 'task_agent_only_logical_member');
  }

  const address = {
    ...addressResult.address,
    segments: cloneConversationTargetSegments(addressResult.address.segments),
  };
  const localTargetKey = node.memberRouteKey;
  return buildResolution({
    address,
    conversationTargetKey: buildConversationTargetKey(address),
    localTargetKey,
    memberRouteKey: localTargetKey,
    node,
    context,
    targetKind: addressResult.targetKind,
    source,
    displayLabel: displayLabelForNode(node),
  }, memberRouteKey);
};

export const resolveTeamConversationTargetAddressResult = (
  teamContext: AgentTeamContext,
  options: ResolveTeamConversationTargetAddressOptions = {},
): ConversationTargetResolution => {
  const focusedMemberRouteKey = normalizeConversationRouteKey(teamContext.focusedMemberRouteKey);
  const focusedResolution = resolveRouteTarget(teamContext, focusedMemberRouteKey, options, 'focused_member');
  if (focusedResolution.target) return focusedResolution;

  if (options.allowActiveExecutionSafetyFallback && focusedResolution.reason === 'task_agent_only_logical_member') {
    const fallbackRouteKey = resolveActiveExecutionFocusedMemberRouteKey(teamContext, focusedMemberRouteKey).trim();
    if (fallbackRouteKey && fallbackRouteKey !== focusedMemberRouteKey) {
      return resolveRouteTarget(teamContext, fallbackRouteKey, options, 'active_execution_safety_fallback');
    }
  }

  return focusedResolution;
};

export const resolveTeamConversationTargetAddress = (
  teamContext: AgentTeamContext,
  options: ResolveTeamConversationTargetAddressOptions = {},
): ConversationTargetResolutionTarget | null =>
  resolveTeamConversationTargetAddressResult(teamContext, options).target;
