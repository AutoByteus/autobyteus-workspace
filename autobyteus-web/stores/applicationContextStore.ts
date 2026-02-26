import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ApplicationRunContext } from '~/types/application/ApplicationRun';
import type { AIMessage } from '~/types/conversation';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

interface ApplicationContextState {
  activeRuns: Map<string, ApplicationRunContext>;
  activeRunId: string | null;
}

export const useApplicationContextStore = defineStore('applicationContext', {
  state: (): ApplicationContextState => ({
    activeRuns: new Map(),
    activeRunId: null,
  }),
  getters: {
    getRun: (state) => (applicationRunId: string): ApplicationRunContext | null => {
      return state.activeRuns.get(applicationRunId) || null;
    },
    activeRun(state): ApplicationRunContext | null {
      if (!state.activeRunId) return null;
      return state.activeRuns.get(state.activeRunId) || null;
    },
    activeTeamContext(): AgentTeamContext | null {
      return this.activeRun?.teamContext || null;
    },
    lastAiMessage(): AIMessage | null {
      const teamContext = this.activeTeamContext;
      if (!teamContext) return null;
      
      const coordinator = teamContext.members.get(teamContext.focusedMemberName);
      if (!coordinator) return null;
      
      const messages = coordinator.state.conversation.messages;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'ai') {
          return messages[i] as AIMessage;
        }
      }
      return null;
    }
  },
  actions: {
    addRun(context: ApplicationRunContext) {
      this.activeRuns.set(context.applicationRunId, context);
    },
    removeRun(applicationRunId: string) {
      const run = this.activeRuns.get(applicationRunId);
      if (run) {
        run.teamContext.unsubscribe?.();
        this.activeRuns.delete(applicationRunId);
        if (this.activeRunId === applicationRunId) {
          this.activeRunId = null;
        }
      }
    },
    setActiveRun(applicationRunId: string) {
      if (this.activeRuns.has(applicationRunId)) {
        this.activeRunId = applicationRunId;
      }
    },
    promoteTemporaryTeamId(applicationRunId: string, permanentId: string) {
      const run = this.activeRuns.get(applicationRunId);
      if (run) {
        const teamContext = run.teamContext;
        teamContext.teamRunId = permanentId;
        teamContext.members.forEach(member => {
          member.state.conversation.id = `${permanentId}::${member.state.runId}`;
        });
      }
    }
  },
});
