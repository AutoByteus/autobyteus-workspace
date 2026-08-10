import { defineStore } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import { AgentContext } from '~/types/agent/AgentContext';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { Conversation } from '~/types/conversation';
import {
  buildTeamRunRootFromDefinition,
  flattenLeafAgentMemberNodes,
  indexTeamMemberNodesByAddress,
  resolveInitialFocusedMemberAddress,
} from '~/utils/teamDefinitionMembers';
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder';
import { ensureHistoricalTeamMemberHydrated } from '~/services/runHydration/teamRunContextHydrationService';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';

interface AgentTeamContextsState { teams: Map<string, AgentTeamContext> }
const executionForMember = (teamRunId: string, memberAddress: string): TeamExecutionAddress =>
  createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress });

export const useAgentTeamContextsStore = defineStore('agentTeamContexts', {
  state: (): AgentTeamContextsState => ({ teams: new Map() }),
  getters: {
    activeTeamContext(): AgentTeamContext | null {
      const selection = useAgentSelectionStore();
      return selection.selectedType === 'team' && selection.selectedRunId
        ? this.teams.get(selection.selectedRunId) || null
        : null;
    },
    allTeamRuns(state): AgentTeamContext[] { return Array.from(state.teams.values()); },
    focusedMemberContext(): AgentContext | null {
      const team = this.activeTeamContext as AgentTeamContext | null;
      return team?.agentExecutionsByKey.get(serializeTeamExecutionAddress(team.focusedExecutionAddress)) || null;
    },
    focusedMemberNode() {
      const team = this.activeTeamContext as AgentTeamContext | null;
      return team ? findTeamExecutionNode(team, team.focusedExecutionAddress) : null;
    },
    activeExecutionFocusedMemberAddress(): string {
      return (this.activeTeamContext as AgentTeamContext | null)?.focusedExecutionAddress.memberAddress || '';
    },
    activeExecutionFocusedMemberContext(): AgentContext | null { return this.focusedMemberContext as AgentContext | null; },
    activeExecutionFocusedMemberNode() { return this.focusedMemberNode; },
    teamMembers(): { memberAddress: string; context: AgentContext }[] {
      const team = this.activeTeamContext as AgentTeamContext | null;
      if (!team) return [];
      return Array.from(team.agentExecutionsByKey.entries()).map(([executionKey, context]) => ({
        memberAddress: (JSON.parse(executionKey) as TeamExecutionAddress).memberAddress,
        context,
      }));
    },
    getTeamContextById: (state) => (teamRunId: string): AgentTeamContext | undefined => state.teams.get(teamRunId),
  },
  actions: {
    createRunFromTemplate(options: { selectionMode?: 'desktop' | 'mobile' } = {}): string {
      const selection = useAgentSelectionStore();
      const teamDefinitions = useAgentTeamDefinitionStore();
      const agentDefinitions = useAgentDefinitionStore();
      const template = useTeamRunConfigStore().config;
      if (!template) throw new Error('No team run config template available');
      const definition = teamDefinitions.getAgentTeamDefinitionById(template.teamDefinitionId);
      if (!definition) throw new Error(`Team definition ${template.teamDefinitionId} not found.`);
      const readiness = useTeamRunConfigStore().launchReadiness;
      if (!readiness.canLaunch) throw new Error(readiness.blockingIssues[0]?.message || 'Team configuration is not launch-ready.');
      const teamRunId = `temp-team-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const rootTeam = buildTeamRunRootFromDefinition(definition, {
        getTeamDefinitionById: (id) => teamDefinitions.getAgentTeamDefinitionById(id),
      }, teamRunId);
      const members = flattenLeafAgentMemberNodes(rootTeam.children);
      const agentExecutionsByKey = new Map<string, AgentContext>();
      for (const member of buildTeamRunMemberConfigRecords({ config: template, leafMembers: members })) {
        const name = agentDefinitions.getAgentDefinitionById(member.agentDefinitionId)?.name || member.displayName;
        const config: AgentRunConfig = {
          agentDefinitionId: member.agentDefinitionId,
          agentDefinitionName: name,
          llmModelIdentifier: member.llmModelIdentifier,
          runtimeKind: member.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
          workspaceId: member.workspaceId ?? null,
          workspaceMetadata: member.workspaceMetadata ?? null,
          autoExecuteTools: member.autoExecuteTools,
          skillAccessMode: member.skillAccessMode,
          llmConfig: member.llmConfig,
          isLocked: false,
        };
        const executionAddress = executionForMember(teamRunId, member.memberAddress);
        const conversation: Conversation = {
          id: serializeTeamExecutionAddress(executionAddress), messages: [], createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(), agentDefinitionId: member.agentDefinitionId, agentName: name,
        };
        const memberContext = new AgentContext(config, new AgentRunState(conversation.id, conversation));
        primeRecentEventMonitorBaseline(memberContext);
        agentExecutionsByKey.set(conversation.id, memberContext);
      }
      const focusedExecutionAddress = executionForMember(teamRunId, resolveInitialFocusedMemberAddress(rootTeam));
      const context: AgentTeamContext = {
        teamRunId, config: buildEditableTeamRunSeed(template) as TeamRunConfig, rootTeam,
        memberNodesByAddress: indexTeamMemberNodesByAddress(rootTeam), agentExecutionsByKey,
        historicalHydration: null, focusedExecutionAddress, isActive: false, isSubscribed: false,
      };
      this.teams.set(teamRunId, context);
      useRunHistoryStore().refreshRunNavigationTopology('team-draft-create');
      options.selectionMode === 'mobile'
        ? selection.selectRunWithoutShellNavigation(teamRunId, 'team')
        : selection.selectRun(teamRunId, 'team');
      return teamRunId;
    },
    lockConfig(teamRunId: string) {
      const context = this.teams.get(teamRunId); if (!context) return;
      context.config.isLocked = true; context.agentExecutionsByKey.forEach((agent) => { agent.config.isLocked = true; });
    },
    promoteTemporaryTeamRunId(temporaryId: string, permanentId: string) {
      const context = this.teams.get(temporaryId); if (!context) return;
      context.agentExecutionsByKey.forEach(resetRecentEventMonitorBaseline);
      const nextExecutions = new Map<string, AgentContext>();
      for (const [key, agent] of context.agentExecutionsByKey) {
        const previous = JSON.parse(key) as TeamExecutionAddress;
        const next = createTeamExecutionAddress({ ...previous, rootTeamRunId: permanentId });
        const nextKey = serializeTeamExecutionAddress(next);
        agent.state.conversation.id = nextKey; agent.state.runId = nextKey; nextExecutions.set(nextKey, agent);
      }
      context.teamRunId = permanentId;
      context.rootTeam.teamRunId = permanentId;
      context.agentExecutionsByKey = nextExecutions;
      context.focusedExecutionAddress = createTeamExecutionAddress({ ...context.focusedExecutionAddress, rootTeamRunId: permanentId });
      context.agentExecutionsByKey.forEach(primeRecentEventMonitorBaseline);
      this.teams.delete(temporaryId); this.teams.set(permanentId, context);
      useRunHistoryStore().refreshRunNavigationTopology('team-identity-promotion');
      const selection = useAgentSelectionStore();
      if (selection.selectedType === 'team' && selection.selectedRunId === temporaryId) selection.selectRunWithoutShellNavigation(permanentId, 'team');
    },
    addTeamContext(context: AgentTeamContext) {
      this.teams.set(context.teamRunId, context);
      useRunHistoryStore().refreshRunNavigationTopology('team-context-add');
    },
    removeTeamContext(teamRunId: string) {
      const context = this.teams.get(teamRunId); if (!context) return;
      context.unsubscribe?.();
      context.agentExecutionsByKey.forEach(resetRecentEventMonitorBaseline);
      this.teams.delete(teamRunId);
      useRunHistoryStore().refreshRunNavigationTopology('team-context-remove');
      const selection = useAgentSelectionStore();
      if (selection.selectedType === 'team' && selection.selectedRunId === teamRunId) {
        const next = this.teams.keys().next().value as string | undefined;
        next ? selection.selectRun(next, 'team') : selection.clearSelection();
      }
    },
    async focusMemberAndEnsureHydrated(teamRunId: string, executionAddress: TeamExecutionAddress): Promise<void> {
      const team = this.teams.get(teamRunId);
      if (!team || executionAddress.rootTeamRunId !== teamRunId) return;
      const address = createTeamExecutionAddress(executionAddress);
      const node = findTeamExecutionNode(team, address);
      if (!node) return;
      team.focusedExecutionAddress = address;
      if (node.kind === 'agent' && !address.taskAgentRunId && address.taskTeamRunIds.length === 0) {
        await ensureHistoricalTeamMemberHydrated({ teamContext: team, memberAddress: address.memberAddress });
      }
    },
  },
});
