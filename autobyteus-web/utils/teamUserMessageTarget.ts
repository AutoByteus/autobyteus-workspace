import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';
import { isTaskAgentOnlyConversation } from '~/utils/teamTaskAgentConversation';

export type TeamUserMessageTargetKind = 'leaf_agent' | 'subteam';
export type TeamUserMessageTargetSource = 'focused_member' | 'active_execution_safety_fallback';
export type TeamUserMessageTargetResolutionReason =
  | 'missing_focus'
  | 'missing_node'
  | 'missing_leaf_context'
  | 'subteam_without_leaf_context'
  | 'task_agent_only_logical_member';

export interface TeamUserMessageTarget {
  memberRouteKey: string;
  node: TeamMemberNode;
  context: AgentContext | null;
  targetKind: TeamUserMessageTargetKind;
  source: TeamUserMessageTargetSource;
}

export interface TeamUserMessageTargetResolution {
  target: TeamUserMessageTarget | null;
  focusedMemberRouteKey: string;
  reason: TeamUserMessageTargetResolutionReason | null;
}

export interface ResolveTeamUserMessageTargetOptions {
  allowSubteam?: boolean;
  allowActiveExecutionSafetyFallback?: boolean;
}

const normalizeOptionalRouteKey = (routeKey: string | null | undefined): string => routeKey?.trim() || '';

const buildResolution = (
  target: TeamUserMessageTarget | null,
  focusedMemberRouteKey: string,
  reason: TeamUserMessageTargetResolutionReason | null = null,
): TeamUserMessageTargetResolution => ({ target, focusedMemberRouteKey, reason });

const resolveRouteTarget = (
  teamContext: AgentTeamContext,
  memberRouteKey: string,
  options: ResolveTeamUserMessageTargetOptions,
  source: TeamUserMessageTargetSource,
): TeamUserMessageTargetResolution => {
  if (!memberRouteKey) {
    return buildResolution(null, memberRouteKey, 'missing_focus');
  }

  const node = teamContext.memberNodesByRouteKey.get(memberRouteKey) || null;
  if (!node) {
    return buildResolution(null, memberRouteKey, 'missing_node');
  }

  if (node.memberKind === 'agent_team') {
    if (!options.allowSubteam) {
      return buildResolution(null, memberRouteKey, 'subteam_without_leaf_context');
    }
    return buildResolution({
      memberRouteKey,
      node,
      context: null,
      targetKind: 'subteam',
      source,
    }, memberRouteKey);
  }

  const context = teamContext.leafAgentContextsByRouteKey.get(memberRouteKey) || null;
  if (!context) {
    return buildResolution(null, memberRouteKey, 'missing_leaf_context');
  }

  if (!node.isTaskAgentInstance && isTaskAgentOnlyConversation(context)) {
    return buildResolution(null, memberRouteKey, 'task_agent_only_logical_member');
  }

  return buildResolution({
    memberRouteKey,
    node,
    context,
    targetKind: 'leaf_agent',
    source,
  }, memberRouteKey);
};

export const resolveTeamUserMessageTargetResult = (
  teamContext: AgentTeamContext,
  options: ResolveTeamUserMessageTargetOptions = {},
): TeamUserMessageTargetResolution => {
  const focusedMemberRouteKey = normalizeOptionalRouteKey(teamContext.focusedMemberRouteKey);
  const focusedResolution = resolveRouteTarget(teamContext, focusedMemberRouteKey, options, 'focused_member');
  if (focusedResolution.target) {
    return focusedResolution;
  }

  if (
    options.allowActiveExecutionSafetyFallback &&
    focusedResolution.reason === 'task_agent_only_logical_member'
  ) {
    const fallbackRouteKey = resolveActiveExecutionFocusedMemberRouteKey(teamContext, focusedMemberRouteKey).trim();
    if (fallbackRouteKey && fallbackRouteKey !== focusedMemberRouteKey) {
      return resolveRouteTarget(
        teamContext,
        fallbackRouteKey,
        options,
        'active_execution_safety_fallback',
      );
    }
  }

  return focusedResolution;
};

export const resolveTeamUserMessageTarget = (
  teamContext: AgentTeamContext,
  options: ResolveTeamUserMessageTargetOptions = {},
): TeamUserMessageTarget | null => resolveTeamUserMessageTargetResult(teamContext, options).target;
