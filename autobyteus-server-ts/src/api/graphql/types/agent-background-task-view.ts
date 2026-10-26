import { Arg, createUnionType, Field, Int, ObjectType, Query, registerEnumType, Resolver } from 'type-graphql';
import { AgentRunManager } from '../../../agent-execution/services/agent-run-manager.js';
import type { AgentBackgroundTaskView, AgentBackgroundTaskViewStatus } from '../../../agent-execution/domain/agent-background-task-view.js';

const BackgroundTaskViewStatus = { running: 'running', completed: 'completed', failed: 'failed', stopped: 'stopped', unknown: 'unknown' } as const;
const BackgroundTaskUnavailableReason = { inactive: 'inactive', inspection_failed: 'inspection_failed', incomplete: 'incomplete' } as const;
registerEnumType(BackgroundTaskViewStatus, { name: 'BackgroundTaskViewStatus' });
registerEnumType(BackgroundTaskUnavailableReason, { name: 'BackgroundTaskUnavailableReason' });

@ObjectType()
export class AgentBackgroundTaskViewRow {
  @Field(() => String) taskId!: string;
  @Field(() => String) kind!: 'shell';
  @Field(() => String) description!: string;
  @Field(() => String, { nullable: true }) command!: null;
  @Field(() => BackgroundTaskViewStatus) status!: AgentBackgroundTaskViewStatus;
  @Field(() => Int, { nullable: true }) exitCode!: number | null;
  @Field(() => String) startedAt!: string;
}
@ObjectType()
export class AgentBackgroundTaskSnapshot {
  @Field(() => String) agentRunId!: string;
  @Field(() => String) runInstanceId!: string;
  @Field(() => String) observedAt!: string;
  @Field(() => [AgentBackgroundTaskViewRow]) tasks!: AgentBackgroundTaskViewRow[];
}
@ObjectType()
export class AgentBackgroundTaskEventStream {
  @Field(() => String) agentRunId!: string;
}
@ObjectType()
export class AgentBackgroundTaskUnsupported {
  @Field(() => String) agentRunId!: string;
  @Field(() => String) reason!: 'unsupported';
}
@ObjectType()
export class AgentBackgroundTaskUnavailable {
  @Field(() => String) agentRunId!: string;
  @Field(() => BackgroundTaskUnavailableReason) reason!: 'inactive' | 'inspection_failed' | 'incomplete';
}
const AgentBackgroundTaskViewUnion = createUnionType({
  name: 'AgentBackgroundTaskView',
  types: () => [AgentBackgroundTaskSnapshot, AgentBackgroundTaskEventStream, AgentBackgroundTaskUnsupported, AgentBackgroundTaskUnavailable] as const,
  resolveType: (value: AgentBackgroundTaskView) => {
    switch (value.kind) {
      case 'snapshot': return AgentBackgroundTaskSnapshot;
      case 'event-stream': return AgentBackgroundTaskEventStream;
      case 'unsupported': return AgentBackgroundTaskUnsupported;
      case 'unavailable': return AgentBackgroundTaskUnavailable;
    }
  },
});

@Resolver()
export class AgentBackgroundTaskViewResolver {
  @Query(() => AgentBackgroundTaskViewUnion)
  async agentBackgroundTaskView(@Arg('agentRunId', () => String) agentRunId: string): Promise<AgentBackgroundTaskView> {
    const manager = AgentRunManager.getInstance();
    const runId = agentRunId.trim();
    const inactive = (): AgentBackgroundTaskView => ({ kind: 'unavailable', agentRunId: runId, reason: 'inactive' });
    const run = manager.peekPublishedRun(runId);
    if (!run || !run.isActive()) return inactive();
    let view: AgentBackgroundTaskView;
    try { view = await run.inspectBackgroundTasks(); }
    catch { view = { kind: 'unavailable', agentRunId: runId, reason: 'inspection_failed' }; }
    // No lifecycle getter, cleanup or replacement retry in this read path.
    if (manager.peekPublishedRun(runId) !== run || !run.isActive()) return inactive();
    return view;
  }
}
