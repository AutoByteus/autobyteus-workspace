import { defineStore } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentContext } from '~/types/agent/AgentContext';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';

interface AgentTeamContextsState { teams: Map<string, AgentTeamContext> }

export const useAgentTeamContextsStore = defineStore('agentTeamContexts', {
  state: (): AgentTeamContextsState => ({ teams: new Map() }),
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
      useRunHistoryStore().refreshRunNavigationTopology('team-context-remove');
      const selection = useAgentSelectionStore();
      if (selection.selectedType === 'team' && selection.selectedRunId === rootTeamRunId) {
        const nextRunId = this.teams.keys().next().value as string | undefined;
        nextRunId ? selection.selectRun(nextRunId, 'team') : selection.clearSelection();
      }
    },
    focusMember(rootTeamRunId: string, agentRunId: string): void {
      const team = this.teams.get(rootTeamRunId);
      if (!team) return;
      team.view.focusAgent(agentRunId);
    },
  },
});
