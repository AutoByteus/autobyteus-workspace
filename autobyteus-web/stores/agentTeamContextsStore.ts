import { defineStore } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useFederatedCatalogStore } from '~/stores/federatedCatalogStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { Conversation } from '~/types/conversation';
import { resolveWorkspaceIdForTeamMember } from '~/utils/teamMemberWorkspaceRouting';
import { EMBEDDED_NODE_ID } from '~/types/node';

interface AgentTeamContextsState {
  /** All active agent team runs, indexed by their team ID. */
  teams: Map<string, AgentTeamContext>;
}

export const useAgentTeamContextsStore = defineStore('agentTeamContexts', {
  state: (): AgentTeamContextsState => ({
    teams: new Map(),
  }),

  getters: {
    /** Returns the currently selected team context based on selection store. */
    activeTeamContext(): AgentTeamContext | null {
      const selectionStore = useAgentSelectionStore();
      if (selectionStore.selectedType === 'team' && selectionStore.selectedRunId) {
        return this.teams.get(selectionStore.selectedRunId) || null;
      }
      return null;
    },

    /** Returns all active team runs as an array. */
    allTeamRuns(state): AgentTeamContext[] {
      return Array.from(state.teams.values());
    },

    /** Returns the focused member context for the active team. */
    focusedMemberContext(): AgentContext | null {
      const activeTeam = this.activeTeamContext;
      if (!activeTeam) return null;
      return activeTeam.members.get(activeTeam.focusedMemberName) || null;
    },

    /** Returns all members for the active team with their member names. */
    teamMembers(): { memberName: string; context: AgentContext }[] {
      const activeTeam = this.activeTeamContext;
      if (!activeTeam) return [];
      return Array.from(activeTeam.members.entries()).map(([memberName, context]) => ({
        memberName,
        context,
      }));
    },

    getTeamContextById: (state) => (teamId: string): AgentTeamContext | undefined => {
      return state.teams.get(teamId);
    },
  },

  actions: {
    /**
     * Creates a new team run from the current run config template.
     */
    createRunFromTemplate(): string {
      const selectionStore = useAgentSelectionStore();
      const teamDefinitionStore = useAgentTeamDefinitionStore();
      const agentDefinitionStore = useAgentDefinitionStore();
      const federatedCatalogStore = useFederatedCatalogStore();
      const runConfigStore = useTeamRunConfigStore();

      const template = runConfigStore.config;
      if (!template) {
        throw new Error('No team run config template available');
      }

      const teamDef = teamDefinitionStore.getAgentTeamDefinitionById(template.teamDefinitionId);
      if (!teamDef) {
        throw new Error(`Team definition ${template.teamDefinitionId} not found.`);
      }

      const teamId = `temp-team-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create members
      const members = new Map<string, AgentContext>();

      for (const node of teamDef.nodes) {
        if (node.referenceType !== 'AGENT') continue;

        const homeNodeId = node.homeNodeId?.trim() || EMBEDDED_NODE_ID;
        let defName = node.memberName;
        if (homeNodeId === EMBEDDED_NODE_ID) {
          const agentDef = agentDefinitionStore.getAgentDefinitionById(node.referenceId);
          defName = agentDef?.name || node.memberName;
        } else {
          const federatedAgent = federatedCatalogStore.findAgentByNodeAndId(homeNodeId, node.referenceId);
          defName = federatedAgent?.name || node.memberName;
        }
        const override = template.memberOverrides[node.memberName];

        const memberConfig: AgentRunConfig = {
          agentDefinitionId: node.referenceId,
          agentDefinitionName: defName,
          llmModelIdentifier: override?.llmModelIdentifier || template.llmModelIdentifier,
          workspaceId: resolveWorkspaceIdForTeamMember(node.homeNodeId ?? null, template.workspaceId),
          autoExecuteTools: override?.autoExecuteTools ?? template.autoExecuteTools,
          skillAccessMode: 'PRELOADED_ONLY',
          isLocked: false,
        };

        const conversation: Conversation = {
          id: `${teamId}::${node.memberName}`,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          agentDefinitionId: node.referenceId,
          agentName: defName,
        };

        const memberContext = new AgentContext(
          memberConfig,
          new AgentRunState(node.memberName, conversation)
        );

        members.set(node.memberName, memberContext);
      }

      const configCopy = JSON.parse(JSON.stringify(template)) as TeamRunConfig;
      configCopy.isLocked = false;

      let focusedMemberName = teamDef.coordinatorMemberName;
      if (!members.has(focusedMemberName)) {
        focusedMemberName = members.keys().next().value || '';
      }

      const newContext: AgentTeamContext = {
        teamId,
        config: configCopy,
        members,
        focusedMemberName,
        currentStatus: AgentTeamStatus.Idle,
        isSubscribed: false,
        taskPlan: null,
        taskStatuses: null,
      };

      this.teams.set(teamId, newContext);
      selectionStore.selectRun(teamId, 'team');

      return teamId;
    },

    lockConfig(teamId: string) {
      const context = this.teams.get(teamId);
      if (!context) return;

      context.config.isLocked = true;
      context.members.forEach((member) => {
        member.config.isLocked = true;
      });
    },

    promoteTemporaryTeamId(temporaryId: string, permanentId: string) {
      const context = this.teams.get(temporaryId);
      if (!context) return;

      context.teamId = permanentId;
      context.members.forEach(member => {
        if (member.state.conversation.id.startsWith(temporaryId)) {
          member.state.conversation.id = member.state.conversation.id.replace(temporaryId, permanentId);
        }
      });

      this.teams.delete(temporaryId);
      this.teams.set(permanentId, context);

      const selectionStore = useAgentSelectionStore();
      if (selectionStore.selectedType === 'team' && selectionStore.selectedRunId === temporaryId) {
        selectionStore.selectRun(permanentId, 'team');
      }
    },

    addTeamContext(context: AgentTeamContext) {
      this.teams.set(context.teamId, context);
    },

    /**
     * Remove a team context.
     * If the removed team was selected, auto-select another remaining team.
     */
    removeTeamContext(teamId: string) {
      const context = this.teams.get(teamId);
      if (context) {
        context.unsubscribe?.();
        this.teams.delete(teamId);

        const selectionStore = useAgentSelectionStore();
        if (selectionStore.selectedType === 'team' && selectionStore.selectedRunId === teamId) {
          // Auto-select another team run if available
          const remainingTeams = Array.from(this.teams.keys());
          if (remainingTeams.length > 0) {
            selectionStore.selectRun(remainingTeams[0], 'team');
          } else {
            selectionStore.clearSelection();
          }
        }
      }
    },

    setFocusedMember(memberName: string) {
      if (this.activeTeamContext && this.activeTeamContext.members.has(memberName)) {
        this.activeTeamContext.focusedMemberName = memberName;
      }
    },

    ensureSyntheticMemberContext(
      teamId: string,
      memberRouteKey: string,
      options: { seedMemberName?: string | null; agentId?: string | null } = {},
    ): AgentContext | null {
      const team = this.teams.get(teamId);
      if (!team) return null;
      if (!memberRouteKey || !memberRouteKey.includes('/')) return null;

      const existing = team.members.get(memberRouteKey);
      if (existing) {
        if (options.agentId) {
          existing.state.agentId = options.agentId;
        }
        return existing;
      }

      const routeSegments = memberRouteKey
        .split('/')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);
      if (routeSegments.length < 2) {
        return null;
      }
      const leafName = routeSegments[routeSegments.length - 1] as string;
      const parentRouteKey = routeSegments.slice(0, -1).join('/');

      const seedCandidates = [
        parentRouteKey,
        leafName,
        options.seedMemberName ?? null,
      ].filter((candidate): candidate is string => !!candidate);

      let seedContext: AgentContext | null = null;
      for (const candidate of seedCandidates) {
        const candidateContext = team.members.get(candidate);
        if (candidateContext) {
          seedContext = candidateContext;
          break;
        }
      }
      if (!seedContext) {
        return null;
      }

      const seedConversation = seedContext.state.conversation;
      const now = new Date().toISOString();
      const syntheticConfig: AgentRunConfig = {
        ...seedContext.config,
        agentDefinitionName: leafName,
        isLocked: seedContext.config.isLocked ?? false,
      };
      const conversation: Conversation = {
        id: `${teamId}::${memberRouteKey}`,
        messages: [],
        createdAt: seedConversation.createdAt ?? now,
        updatedAt: now,
        agentDefinitionId: seedConversation.agentDefinitionId ?? seedContext.config.agentDefinitionId,
        agentName: leafName,
      };

      const state = new AgentRunState(options.agentId ?? memberRouteKey, conversation);
      state.currentStatus = seedContext.state.currentStatus;
      const syntheticContext = new AgentContext(syntheticConfig, state);
      team.members.set(memberRouteKey, syntheticContext);
      return syntheticContext;
    },
  },
});
