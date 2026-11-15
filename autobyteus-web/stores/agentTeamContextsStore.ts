import { defineStore } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentContext } from '~/types/agent/AgentContext';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { memberLoader } from '~/services/runHydration/memberLoader';
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages';
import type { RunTreeOpenTargetDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore';
import { delegatedSubjectOfRow } from '~/utils/runTree/runTreeAgents';
import { subjectOfTarget } from '~/services/delegatedRuns/delegatedRunSubjects';
import type { TeamDelegatedFocus } from '~/services/teamExecution/teamCollaborationMessagesView';

type SelectedTreeRow = Readonly<{ key: string; target: RunTreeOpenTargetDto; address: string | null }>;

interface AgentTeamContextsState {
  teams: Map<string, AgentTeamContext>;
  /** The delegated row the user selected under each Team run (SR-084): it opens as its own run (rule 2). */
  delegatedRows: Record<string, SelectedTreeRow | null>;
}

export const useAgentTeamContextsStore = defineStore('agentTeamContexts', {
  state: (): AgentTeamContextsState => ({ teams: new Map(), delegatedRows: {} }),
  getters: {
    activeTeamContext(): AgentTeamContext | null {
      const selection = useAgentSelectionStore();
      return selection.selectedType === 'team' && selection.selectedRunId
        ? this.teams.get(selection.selectedRunId) ?? null
        : null;
    },
    allTeamRuns(state): AgentTeamContext[] { return Array.from(state.teams.values()); },
    focusedMemberContext(): AgentContext | null {
      return (this.activeTeamContext as AgentTeamContext | null)?.view.getFocusedAgentContext() ?? null;
    },
    activeExecutionFocusedMemberAddress(): string {
      return (this.activeTeamContext as AgentTeamContext | null)?.view.getFocusedMemberAddress() ?? '';
    },
    activeExecutionFocusedMemberContext(): AgentContext | null { return this.focusedMemberContext as AgentContext | null; },
    teamMembers(): { agentRunId: string; memberAddress: string; context: AgentContext }[] {
      return (this.activeTeamContext as AgentTeamContext | null)?.view.listAgentContextEntries().map((entry) => ({
        agentRunId: entry.agentRunId,
        memberAddress: entry.memberAddress,
        context: entry.agentContext,
      })) ?? [];
    },
    getTeamContextById: (state) => (rootTeamRunId: string): AgentTeamContext | undefined => state.teams.get(rootTeamRunId),
    /** The selected delegated row while it is in the Team's tree; a row that left it returns the view to the Team's focus. */
    selectedTreeRowOf: (state) => (teamRunId: string): SelectedTreeRow | null => {
      const picked = state.delegatedRows[teamRunId];
      return picked && useRunTreeStore().rowsOf({ kind: 'agent_team', runId: teamRunId }).some((row) => row.key === picked.key) ? picked : null;
    },
    /** The run the selected delegated row opens, with where it shows (null: the Team's own focused member). */
    delegatedFocusOf(): (teamRunId: string) => TeamDelegatedFocus | null {
      return (teamRunId: string) => {
        const picked = (this.selectedTreeRowOf as (id: string) => SelectedTreeRow | null)(teamRunId);
        if (!picked) return null;
        const target = picked.target;
        return Object.freeze({ address: picked.address ?? '', agentRunId: target.agentRunId,
          subject: subjectOfTarget({ runKind: target.runKind as 'agent' | 'agent_team', runId: target.runId, agentRunId: target.agentRunId }) });
      };
    },
  },
  actions: {
    addTeamContext(context: AgentTeamContext): void {
      const rootTeamRunId = context.view.getRootTeamRunId();
      context.view.listAgentContextEntries().forEach((entry) => primeRecentEventMonitorBaseline(entry.agentContext));
      this.teams = new Map(this.teams).set(rootTeamRunId, context);
      useRunHistoryStore().refreshRunNavigationTopology('team-context-add');
    },
    replaceTeamContext(
      rootTeamRunId: string,
      expectedCurrent: AgentTeamContext,
      replacement: AgentTeamContext,
    ): void {
      if (replacement.view.getRootTeamRunId() !== rootTeamRunId
        || this.teams.get(rootTeamRunId) !== expectedCurrent) {
        throw new Error(`Team context '${rootTeamRunId}' changed before recovery commit.`);
      }
      expectedCurrent.view.listAgentContextEntries().forEach((entry) => resetRecentEventMonitorBaseline(entry.agentContext));
      replacement.view.listAgentContextEntries().forEach((entry) => primeRecentEventMonitorBaseline(entry.agentContext));
      this.teams = new Map(this.teams).set(rootTeamRunId, replacement);
      useRunHistoryStore().refreshRunNavigationTopology('team-context-replace');
    },
    removeTeamContext(rootTeamRunId: string): void {
      const context = this.teams.get(rootTeamRunId);
      if (!context) return;
      context.view.listAgentContextEntries().forEach((entry) => resetRecentEventMonitorBaseline(entry.agentContext));
      const next = new Map(this.teams);
      next.delete(rootTeamRunId);
      this.teams = next;
      this.delegatedRows = { ...this.delegatedRows, [rootTeamRunId]: null };
      // Its loaded members and Team-tab lists go with it (autobyteus-358).
      memberLoader().releaseRoot(`agent_team:${rootTeamRunId}`);
      useCollaborationParticipantMessagesStore().releaseRoot('agent_team', rootTeamRunId);
      useRunHistoryStore().refreshRunNavigationTopology('team-context-remove');
      const selection = useAgentSelectionStore();
      // A removed team is never replaced by another loaded team; its view falls to the empty state.
      if (selection.selectedType === 'team' && selection.selectedRunId === rootTeamRunId) {
        selection.clearSelection();
      }
    },
    focusMember(rootTeamRunId: string, agentRunId: string): void {
      const team = this.teams.get(rootTeamRunId);
      if (!team) return;
      this.clearTreeRow(rootTeamRunId);
      team.view.focusAgent(agentRunId);
    },
    /**
     * A row of the Team's tree that a run it delegated on this node opens (SR-084): selected under the Team, and opened as
     * its own run (rule 2) by its target. Answers whether it was (false for the Team's own rows and a peer's run).
     */
    selectTreeRow(teamRunId: string, row: RunTreeRowDto): boolean {
      const subject = delegatedSubjectOfRow(row, teamRunId);
      if (!subject || !row.openTarget) return false;
      this.delegatedRows = { ...this.delegatedRows, [teamRunId]: Object.freeze({ key: row.key, target: row.openTarget, address: row.address }) };
      useDelegatedRunsStore().ensureOpen(subject);
      return true;
    },
    /** The Team's own focus is shown again. */
    clearTreeRow(teamRunId: string): void {
      if (this.delegatedRows[teamRunId]) this.delegatedRows = { ...this.delegatedRows, [teamRunId]: null };
    },
  },
});
