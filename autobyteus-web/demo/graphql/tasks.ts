/**
 * The Tasks of the demo's delegated runs (autobyteus-279): a delegated run works on the Task its delegator gave it, and the
 * phone shows that Task's summary under the run's row. The demo's Tasks belong to no Project.
 */
import { ProjectTaskStatus, type GetTaskWorkerTasksQuery } from '~/generated/graphql';
import type { DemoRun, DemoWorld } from '../world/DemoWorld';
import type { DemoGraphqlHandlers } from './operations';

type WorkerTask = GetTaskWorkerTasksQuery['taskWorkerTasks'][number];

const taskOf = (world: DemoWorld, run: DemoRun, workerKind: string): WorkerTask => ({
  __typename: 'TaskWorkerTask', workerKind, workerRunId: run.runId,
  task: run.delegator
    ? { __typename: 'TaskWorkerTaskView', taskId: `demo-task-${run.runId}`, projectId: null, title: run.summary, description: run.summary,
        status: world.statusOf(run) === 'offline' ? ProjectTaskStatus.Done : ProjectTaskStatus.InProgress }
    : null,
});

const asList = (value: string[] | string): string[] => (Array.isArray(value) ? value : [value]);

export const taskHandlers = {
  GetTaskWorkerTasks: ({ agentRunIds, teamRunIds }, world) => ({
    __typename: 'Query',
    taskWorkerTasks: [
      ...asList(agentRunIds).map((id) => world.run(id)).filter((run): run is DemoRun => run?.kind === 'agent').map((run) => taskOf(world, run, 'agent')),
      ...asList(teamRunIds).map((id) => world.run(id)).filter((run): run is DemoRun => run?.kind === 'team').map((run) => taskOf(world, run, 'team')),
    ],
  }),
} satisfies Partial<DemoGraphqlHandlers>;
