import { defineStore } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentContext } from '~/types/agent/AgentContext';
import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import { ensureHistoricalTeamMemberHydrated } from '~/services/runHydration/teamRunContextHydrationService';
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
      return (this.activeTeamContext as AgentTeamContext | null)?.executions.getFocusedAgentContext() ?? null;
    },
    focusedMemberNode() {
      const team = this.activeTeamContext as AgentTeamContext | null;
      return team ? team.topology.getNode(team.executions.getFocusedAddress().memberAddress) : null;
    },
    activeExecutionFocusedMemberAddress(): string {
      return (this.activeTeamContext as AgentTeamContext | null)?.executions.getFocusedAddress().memberAddress ?? '';
    },
    activeExecutionFocusedMemberContext(): AgentContext | null { return this.focusedMemberContext as AgentContext | null; },
    activeExecutionFocusedMemberNode() { return this.focusedMemberNode; },
    teamMembers(): { memberAddress: string; context: AgentContext }[] {
      const team = this.activeTeamContext as AgentTeamContext | null;
      return team?.executions.listAgentContextEntries().map((entry) => ({
        memberAddress: entry.executionAddress.memberAddress,
        context: entry.agentContext,
      })) ?? [];
    },
    getTeamContextById: (state) => (rootTeamRunId: string): AgentTeamContext | undefined => state.teams.get(rootTeamRunId),
  },
  actions: {
    addTeamContext(context: AgentTeamContext) {
      const rootTeamRunId = context.executions.getRootTeamRunId();
      context.executions.listAgentContextEntries().forEach((entry) => primeRecentEventMonitorBaseline(entry.agentContext));
      this.teams = new Map(this.teams).set(rootTeamRunId, context);
      useRunHistoryStore().refreshRunNavigationTopology('team-context-add');
    },
    removeTeamContext(rootTeamRunId: string) {
      const context = this.teams.get(rootTeamRunId); if (!context) return;
      context.executions.listAgentContextEntries().forEach((entry) => resetRecentEventMonitorBaseline(entry.agentContext));
      const next = new Map(this.teams); next.delete(rootTeamRunId); this.teams = next;
      useRunHistoryStore().refreshRunNavigationTopology('team-context-remove');
      const selection = useAgentSelectionStore();
      if (selection.selectedType === 'team' && selection.selectedRunId === rootTeamRunId) {
        const nextRunId = this.teams.keys().next().value as string | undefined;
        nextRunId ? selection.selectRun(nextRunId, 'team') : selection.clearSelection();
      }
    },
    async focusMemberAndEnsureHydrated(rootTeamRunId: string, executionAddress: TeamExecutionAddress): Promise<void> {
      const team = this.teams.get(rootTeamRunId);
      if (!team || executionAddress.rootTeamRunId !== rootTeamRunId) return;
      const address = createTeamExecutionAddress(executionAddress);
      const summary = team.executions.getExecutionSummary(address);
      if (!summary || !summary.focusable) return;
      const focus = team.executions.focus(address);
      if (focus.disposition === 'rejected') return;
      if (address.taskAgentRunId === null && address.taskTeamRunIds.length === 0) {
        await ensureHistoricalTeamMemberHydrated({ teamContext: team, memberAddress: address.memberAddress });
      }
    },
  },
});
