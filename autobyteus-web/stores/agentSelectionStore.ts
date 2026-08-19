import { defineStore } from 'pinia';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import type { TeamLaunchDraftId } from '~/types/agent/TeamLaunchDraft';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';

export type SelectionType = 'agent' | 'team' | 'team_draft';
export type RunSelectionSubject =
  | Readonly<{ kind: 'agent_run'; runId: string }>
  | Readonly<{ kind: 'team_run'; rootTeamRunId: string }>
  | Readonly<{ kind: 'team_draft'; draftId: TeamLaunchDraftId }>;

interface AgentSelectionState { subject: RunSelectionSubject | null }

const assertSelectionMutable = (): void => {
  const drafts = useTeamRunConfigStore();
  if (drafts.hasInFlightLaunch) {
    throw new Error('Run selection cannot change while a Team launch draft is in flight.');
  }
};

export const useAgentSelectionStore = defineStore('agentSelection', {
  state: (): AgentSelectionState => ({ subject: null }),
  getters: {
    selectedType(state): SelectionType | null {
      return state.subject?.kind === 'agent_run' ? 'agent'
        : state.subject?.kind === 'team_run' ? 'team'
          : state.subject?.kind === 'team_draft' ? 'team_draft' : null;
    },
    selectedRunId(state): string | null {
      return state.subject?.kind === 'agent_run' ? state.subject.runId
        : state.subject?.kind === 'team_run' ? state.subject.rootTeamRunId : null;
    },
    selectedDraftId(state): TeamLaunchDraftId | null {
      return state.subject?.kind === 'team_draft' ? state.subject.draftId : null;
    },
    isAgentSelected(): boolean { return this.selectedType === 'agent'; },
    isTeamSelected(): boolean { return this.selectedType === 'team' || this.selectedType === 'team_draft'; },
  },
  actions: {
    setRunSelection(runId: string, type: Exclude<SelectionType, 'team_draft'> = 'agent') {
      assertSelectionMutable();
      const normalized = runId.trim();
      if (!normalized) throw new Error('Run selection requires a real run ID.');
      this.subject = type === 'agent'
        ? Object.freeze({ kind: 'agent_run', runId: normalized })
        : Object.freeze({ kind: 'team_run', rootTeamRunId: normalized });
    },
    setTeamDraftSelection(draftId: TeamLaunchDraftId) {
      assertSelectionMutable();
      this.subject = Object.freeze({ kind: 'team_draft', draftId });
    },
    clearRunSelection() { assertSelectionMutable(); this.subject = null; },
    promoteTeamDraftLaunch(draftId: TeamLaunchDraftId, rootTeamRunId: string) {
      const drafts = useTeamRunConfigStore();
      const normalizedRootTeamRunId = rootTeamRunId.trim();
      if (!drafts.isDraftLaunchInFlight(draftId)) {
        throw new Error(`Team launch draft '${draftId}' is not in flight.`);
      }
      if (!normalizedRootTeamRunId) throw new Error('Team launch promotion requires a real TeamRun ID.');
      this.subject = Object.freeze({ kind: 'team_run', rootTeamRunId: normalizedRootTeamRunId });
    },
    selectRunWithoutShellNavigation(runId: string, type: Exclude<SelectionType, 'team_draft'> = 'agent') { this.setRunSelection(runId, type); },
    selectTeamDraftWithoutShellNavigation(draftId: TeamLaunchDraftId) { this.setTeamDraftSelection(draftId); },
    clearSelectionWithoutShellNavigation() { this.clearRunSelection(); },
    selectRun(runId: string, type: Exclude<SelectionType, 'team_draft'> = 'agent') { this.setRunSelection(runId, type); useWorkspaceCenterViewStore().showChat(); },
    selectTeamDraft(draftId: TeamLaunchDraftId) { this.setTeamDraftSelection(draftId); useWorkspaceCenterViewStore().showChat(); },
    clearSelection() { this.clearRunSelection(); useWorkspaceCenterViewStore().showChat(); },
  },
});
