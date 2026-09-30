import { defineStore } from 'pinia';
import type { BackgroundTask } from '~/types/backgroundTask';

export interface BackgroundTaskCounts {
  running: number;
  total: number;
}

/**
 * @store agentBackgroundTaskStore
 * @description Live background tasks per run. Each server snapshot replaces the task with the
 * same id (upsert), so a missed update is corrected by the next one. Not persisted: the list
 * starts empty after a reload.
 */
export const useAgentBackgroundTaskStore = defineStore('agentBackgroundTask', {
  state: () => ({
    tasksByRunId: new Map<string, Map<string, BackgroundTask>>(),
  }),

  getters: {
    /** Tasks of one run, newest first. */
    getTasks: (state) => (runId: string): BackgroundTask[] => {
      const tasks = [...(state.tasksByRunId.get(runId)?.values() ?? [])];
      return tasks.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },
    getCounts: (state) => (runId: string): BackgroundTaskCounts => {
      const tasks = [...(state.tasksByRunId.get(runId)?.values() ?? [])];
      return { running: tasks.filter((task) => task.status === 'running').length, total: tasks.length };
    },
  },

  actions: {
    upsertTask(runId: string, task: BackgroundTask) {
      let tasks = this.tasksByRunId.get(runId);
      if (!tasks) {
        tasks = new Map();
        this.tasksByRunId.set(runId, tasks);
      }
      tasks.set(task.taskId, { ...task });
    },
  },
});
