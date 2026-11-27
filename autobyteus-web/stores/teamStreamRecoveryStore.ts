import { defineStore } from 'pinia';

/** Published by a failed Team stream (`required`), then set by the recovery owner; cleared at the commit or the close. */
export type TeamStreamRecoveryState = 'required' | 'recovering' | 'exhausted';

/**
 * Each Team whose stream needs recovery, and how its recovery goes (autobyteus-541 D-A1). `agentTeamRunStore` publishes
 * and clears; the one recovery owner (`teamStreamAutoRecovery`) watches and sets its progress; the views show
 * `exhausted`. Nothing here starts or knows a recovery.
 */
export const useTeamStreamRecoveryStore = defineStore('teamStreamRecovery', {
  state: () => ({
    states: {} as Record<string, TeamStreamRecoveryState>,
    ownerRegistered: false,
  }),
  getters: {
    stateOf: (state) => (rootTeamRunId: string): TeamStreamRecoveryState | null => state.states[rootTeamRunId] ?? null,
  },
  actions: {
    /** The recovery owner registers before any stream can fail; returns its release. */
    registerOwner(): () => void {
      this.ownerRegistered = true;
      return () => { this.ownerRegistered = false; };
    },
    /** A Team's stream failed and was not replaced; a recovery under way keeps its state (its candidate failed). */
    publishRequired(rootTeamRunId: string): void {
      // Loud: without its owner a failed Team stream would wait for a reselect no one asks for (ARCH-REV-001 AR-002).
      if (!this.ownerRegistered) throw new Error(`No Team stream recovery owner is registered for '${rootTeamRunId}'.`);
      if (!this.states[rootTeamRunId]) this.states = { ...this.states, [rootTeamRunId]: 'required' };
    },
    /** The owner's progress; nothing once the recovery ended (committed or closed). */
    setProgress(rootTeamRunId: string, state: Exclude<TeamStreamRecoveryState, 'required'>): void {
      if (this.states[rootTeamRunId]) this.states = { ...this.states, [rootTeamRunId]: state };
    },
    clear(rootTeamRunId: string): void {
      if (!(rootTeamRunId in this.states)) return;
      const states = { ...this.states };
      delete states[rootTeamRunId];
      this.states = states;
    },
  },
});
