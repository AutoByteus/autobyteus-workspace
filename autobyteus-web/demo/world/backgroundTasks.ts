/**
 * The demo's background tasks (autobyteus-279, REQ-004: an idle run with background tasks), ported from the design
 * reference (`mobile-world.mjs` `backgroundTasksFor`, with the demo layer's rule: no failed task). The world keeps each
 * agent's list, so a Stop can change it.
 */
import { AgentBackgroundTaskEndReason, AgentBackgroundTaskKind, AgentBackgroundTaskStatus } from '~/generated/graphql';
import { SHOWCASE_RUN_KEY } from './content/runs';
import type { DemoAgent, DemoWorld } from './DemoWorld';

export type DemoBackgroundTask = {
  taskId: string;
  kind: AgentBackgroundTaskKind;
  description: string;
  command: string | null;
  status: AgentBackgroundTaskStatus;
  summary: string | null;
  endReason: AgentBackgroundTaskEndReason | null;
  exitCode: number | null;
  startedAt: string;
};

const shell = (taskId: string, description: string, command: string, startedAt: string, status = AgentBackgroundTaskStatus.Running,
  extra: Partial<DemoBackgroundTask> = {}): DemoBackgroundTask => ({
  taskId, kind: AgentBackgroundTaskKind.Shell, description, command, status, summary: null, endReason: null, exitCode: null, startedAt, ...extra,
});

/** The tasks an agent starts the demo with, by its content key. */
const initialTasks = (world: DemoWorld, agent: DemoAgent): DemoBackgroundTask[] => {
  const at = (minutes: number) => world.minutesAgo(minutes);
  switch (agent.key) {
    // An idle delegated agent with two background tasks running.
    case 'agent-package-creator-1':
      return [
        shell('demo-bg-apc-1', 'Bundle the release-notes agent', 'pnpm run package:agent --watch', at(8)),
        shell('demo-bg-apc-2', 'Validate the package manifest', 'pnpm run package:validate --watch', at(7)),
      ];
    // A Team member with one (its Team row shows the sum).
    case 'engineering-team-2/implementation_engineer':
      return [shell('demo-bg-set-1', 'Run the package tests', 'pnpm test --watch', at(17))];
    case SHOWCASE_RUN_KEY:
    case 'project-task-manager-1':
      return [
        shell(`demo-bg-${agent.key}-1`, 'Watch the upgrade check', 'pnpm run upgrade:check --watch', at(5)),
        shell(`demo-bg-${agent.key}-2`, 'Build the release notes site', 'pnpm run docs:build', at(6), AgentBackgroundTaskStatus.Completed, { summary: 'exit code 0', exitCode: 0 }),
        // A task the runtime stopped at its time limit (its end line, not the summary).
        shell(`demo-bg-${agent.key}-4`, 'Crawl the docs for broken links', 'pnpm run docs:links', at(7), AgentBackgroundTaskStatus.Stopped,
          { summary: 'Task was stopped after reaching its background time limit', endReason: AgentBackgroundTaskEndReason.TimeLimit }),
      ];
    default:
      return [];
  }
};

const tasksByAgent = new WeakMap<DemoAgent, DemoBackgroundTask[]>();

/** The agent's background tasks; a stopped agent's run has none running. */
export const backgroundTasksOf = (world: DemoWorld, agent: DemoAgent): DemoBackgroundTask[] => {
  let tasks = tasksByAgent.get(agent);
  if (!tasks) {
    tasks = agent.status === 'offline' ? [] : initialTasks(world, agent);
    tasksByAgent.set(agent, tasks);
  }
  return tasks;
};

export const backgroundTasksRunningOf = (world: DemoWorld, agent: DemoAgent): number =>
  agent.status === 'offline' ? 0 : backgroundTasksOf(world, agent).filter((task) => task.status === AgentBackgroundTaskStatus.Running).length;
