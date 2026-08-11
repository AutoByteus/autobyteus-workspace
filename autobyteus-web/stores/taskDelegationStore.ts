import { defineStore } from 'pinia';
import type { TaskDelegationRecord } from './taskDelegationTypes';

interface TaskDelegationState { recordsByTeam: Map<string, readonly TaskDelegationRecord[]> }

export const useTaskDelegationStore = defineStore('taskDelegation', {
  state: (): TaskDelegationState => ({ recordsByTeam: new Map() }),
  getters: {
    getRecordsForTeam: (state) => (teamRunId: string): readonly TaskDelegationRecord[] =>
      Object.freeze([...(state.recordsByTeam.get(teamRunId) ?? [])]),
  },
  actions: {
    replaceRecords(teamRunId: string, records: readonly TaskDelegationRecord[]): void {
      this.recordsByTeam.set(teamRunId, Object.freeze([...records]));
    },
  },
});
