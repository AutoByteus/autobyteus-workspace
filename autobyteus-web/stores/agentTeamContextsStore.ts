import { defineStore } from 'pinia';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import { AgentContext } from '~/types/agent/AgentContext';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { Conversation } from '~/types/conversation';

interface AgentTeamContextsState {
  /** All active agent team runs, indexed by team run ID. */
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

    getTeamContextById: (state) => (teamRunId: string): AgentTeamContext | undefined => {
      return state.teams.get(teamRunId);
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
      const runConfigStore = useTeamRunConfigStore();

      const template = runConfigStore.config;
      if (!template) {
        throw new Error('No team run config template available');
      }

      const teamDef = teamDefinitionStore.getAgentTeamDefinitionById(template.teamDefinitionId);
      if (!teamDef) {
        throw new Error(`Team definition ${template.teamDefinitionId} not found.`);
      }

      const teamRunId = `temp-team-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create members
      const members = new Map<string, AgentContext>();

      for (const node of teamDef.nodes) {
        if (node.referenceType !== 'AGENT') continue;

        const agentDef = agentDefinitionStore.getAgentDefinitionById(node.referenceId);
        const defName = agentDef?.name || node.memberName;
        const override = template.memberOverrides[node.memberName];

        const memberConfig: AgentRunConfig = {
          agentDefinitionId: node.referenceId,
          agentDefinitionName: defName,
          llmModelIdentifier: override?.llmModelIdentifier || template.llmModelIdentifier,
          runtimeKind: template.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
          workspaceId: template.workspaceId,
          autoExecuteTools: override?.autoExecuteTools ?? template.autoExecuteTools,
          skillAccessMode: 'PRELOADED_ONLY',
          isLocked: false,
        };

        const conversation: Conversation = {
          id: `${teamRunId}::${node.memberName}`,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          agentDefinitionId: node.referenceId,
          agentName: defName,
        };

        const memberContext = new AgentContext(
          memberConfig,
          new AgentRunState(conversation.id, conversation)
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
        teamRunId,
        config: configCopy,
        members,
        focusedMemberName,
        currentStatus: AgentTeamStatus.Idle,
        isSubscribed: false,
        taskPlan: null,
        taskStatuses: null,
      };

      this.teams.set(teamRunId, newContext);
      selectionStore.selectRun(teamRunId, 'team');

      return teamRunId;
    },

    lockConfig(teamRunId: string) {
      const context = this.teams.get(teamRunId);
      if (!context) return;

      context.config.isLocked = true;
      context.members.forEach((member) => {
        member.config.isLocked = true;
      });
    },

    promoteTemporaryTeamId(temporaryId: string, permanentId: string) {
      const context = this.teams.get(temporaryId);
      if (!context) return;

      context.teamRunId = permanentId;
      context.members.forEach(member => {
        if (member.state.conversation.id.startsWith(temporaryId)) {
          const memberRunId = member.state.conversation.id.replace(temporaryId, permanentId);
          member.state.conversation.id = memberRunId;
          member.state.runId = memberRunId;
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
      this.teams.set(context.teamRunId, context);
    },

    /**
     * Remove a team context.
     * If the removed team was selected, auto-select another remaining team.
     */
    removeTeamContext(teamRunId: string) {
      const context = this.teams.get(teamRunId);
      if (context) {
        context.unsubscribe?.();
        this.teams.delete(teamRunId);

        const selectionStore = useAgentSelectionStore();
        if (selectionStore.selectedType === 'team' && selectionStore.selectedRunId === teamRunId) {
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
  },
});
