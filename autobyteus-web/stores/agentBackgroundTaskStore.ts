import { defineStore } from 'pinia';
import type { BackgroundTask } from '~/types/backgroundTask';

export interface BackgroundTaskCounts {
  running: number;
  total: number;
}

/**
 * @store agentBackgroundTaskStore
 * @description Live background tasks per run. Each server snapshot replaces the task with the
 * same id (upsert), so a missed update is corrected by the next one. Not persisted: after a
 * reload the list starts from the tasks the node knows now (`seedTasks`, autobyteus-473).
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
    /**
     * The run's tasks as the node knows them now (the background-task view of an event-stream run): a task the store
     * does not have is added, and one it has as running takes the answer when that shows it ended. A task the store
     * has already ended is never replaced, so an older answer cannot undo a newer stream event (a status only moves
     * from running to an end).
     */
    seedTasks(runId: string, tasks: readonly BackgroundTask[]) {
      for (const task of tasks) {
        const known = this.tasksByRunId.get(runId)?.get(task.taskId);
        if (!known || (known.status === 'running' && task.status !== 'running')) this.upsertTask(runId, task);
      }
    },

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
