import { computed, type ComputedRef } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';
import { resolveRunMentionScope, type RunMentionScope } from '~/composables/agentInput/runMentionScope';
import {
  buildAgentCollaborationMemberDraftContextFileOwner,
  buildAgentDraftContextFileOwner,
  buildOrgMemberDraftContextFileOwner,
  buildTeamMemberDraftContextFileOwner,
  type DraftContextFileOwnerDescriptor,
} from '~/utils/contextFiles/contextFileOwner';

/**
 * - `live`: an existing run view; send/interrupt go through the owning run.
 * - `draft`: a context that is not yet a run (New chat); send launches it.
 * - `read_only`: visible but not sendable.
 */
export type ComposerTargetAccess = 'live' | 'draft' | 'read_only';

/**
 * The single input the message-box pieces bind to. The pieces never pick their
 * own target: run views pass the active-context target from `useComposerTarget`,
 * and the New chat page passes a chat-draft target.
 */
export interface ComposerTarget {
  /** Stable identity of the target, used to scope attachment uploads. */
  readonly key: string;
  readonly context: AgentContext;
  /** Owner under which draft uploads are stored, or null when uploads are not allowed. */
  readonly draftOwner: DraftContextFileOwnerDescriptor | null;
  readonly access: ComposerTargetAccess;
  /** The live run `@` brings collaborators into; absent for launch drafts and read-only views. */
  readonly mentionScope?: RunMentionScope | null;
  send(): Promise<void>;
  interrupt?(): Promise<void> | void;
}

const resolveDraftOwner = (
  target: ActiveAgentWorkspaceTarget,
): DraftContextFileOwnerDescriptor | null => {
  // Configured Org drafts remain editable during transport synchronization;
  // retained task/standalone read-only targets do not acquire upload authority.
  if (target.access === 'read_only' && target.kind !== 'agent_org_direct_agent'
    && target.kind !== 'agent_org_team_member') return null;
  if ('root' in target) return buildOrgMemberDraftContextFileOwner(target.root.orgRunId, target.context.state.runId);
  if ('host' in target) return buildAgentCollaborationMemberDraftContextFileOwner(target.host.hostRunId, target.context.state.runId);
  if (target.kind === 'standalone_agent') return buildAgentDraftContextFileOwner(target.context.state.runId);
  return buildTeamMemberDraftContextFileOwner(target.team.rootRunId, target.team.focusedMemberAddress);
};

/** The active-context composer target for run views (standalone agent, team member, org member). */
export function useComposerTarget(): ComputedRef<ComposerTarget | null> {
  const activeContextStore = useActiveContextStore();

  return computed<ComposerTarget | null>(() => {
    const target = activeContextStore.activeWorkspaceTarget;
    if (!target) {
      return null;
    }
    return Object.freeze({
      key: target.context.state.runId,
      context: target.context,
      draftOwner: resolveDraftOwner(target),
      access: target.access === 'read_only' ? 'read_only' : 'live',
      mentionScope: resolveRunMentionScope(target),
      send: () => activeContextStore.send(),
      interrupt: () => activeContextStore.interruptGeneration(),
    });
  });
}
