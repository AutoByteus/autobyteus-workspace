/**
 * Each agent's conversation and Activity in the demo (autobyteus-279), as the node's run projection carries them: built
 * once from the content when first read, then kept by the world, so a send in the demo appends to it.
 */
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation';
import { demoAgentActivities, demoAgentEntries, demoMemberActivities, demoMemberEntries, type Entry } from './content/agentWork';
import { showcaseActivities, showcaseEntries } from './content/showcase';
import type { DemoAgent, DemoWorld } from './DemoWorld';

/** The Project Task Manager's closing message in the demo (all of its delegated runs are on the demo itself). */
const PTM_SUMMARY = 'Delegated six Tasks: two to copies of the Software Engineering Team, one to the Agent Package Creator, two to the Marketing Team and the Market Researcher, and one to the Support Team. I will report when they finish.';

const projectTaskManagerEntries = (at: number): Entry[] => {
  const s = (offset: number) => Math.floor((at + offset) / 1000);
  return [
    { kind: 'message', role: 'user', content: 'Dispatch the approved desktop app Tasks.', ts: s(0) },
    { kind: 'tool_call', invocationId: 'demo-ptm-d1', toolName: 'delegate_task', toolArgs: { recipient_address: '/software_engineering_team', description: 'Image context files don’t reach the model on the first turn' }, toolResult: 'Started Software Engineering Team.', ts: s(10_000) },
    { kind: 'tool_call', invocationId: 'demo-ptm-d2', toolName: 'delegate_task', toolArgs: { recipient_address: '/marketing_team', description: 'Plan the 1.6 launch campaign' }, toolResult: 'Started Marketing Team.', ts: s(20_000) },
    { kind: 'message', role: 'assistant', content: PTM_SUMMARY, ts: s(40_000) },
  ];
};

const projectTaskManagerActivities = (at: number, agent: DemoAgent): Entry[] => ['/software_engineering_team', '/marketing_team', '/support_team'].map((address, index) => ({
  kind: 'tool', invocationId: `${agent.agentRunId}-a${index + 1}`, toolName: 'delegate_task', type: 'tool_call', status: 'success', contextText: address,
  arguments: { recipient_address: address }, logs: [], result: 'ok', error: null, ts: Math.floor((at + (index + 1) * 20_000) / 1000),
}));

const teamOf = (agent: DemoAgent) => (agent.memberName ? { name: agent.run.name, summary: agent.run.summary } : null);
const startOf = (agent: DemoAgent, spanMs: number): number => Date.parse(agent.lastActivityAt) - spanMs;

const initialEntries = (world: DemoWorld, agent: DemoAgent): Entry[] => {
  if (agent.run === world.showcaseRun) {
    const ptm = world.topLevelRuns.find((run) => run.key === 'project-task-manager-1')!;
    return showcaseEntries(startOf(agent, 90_000), ptm.runId);
  }
  if (agent.key === 'project-task-manager-1') return projectTaskManagerEntries(startOf(agent, 60_000));
  const at = startOf(agent, 5 * 60_000);
  if (agent.memberName) return demoMemberEntries({ id: agent.key, name: agent.memberName }, teamOf(agent), at);
  return demoAgentEntries({ id: agent.key, name: agent.agentName, summary: agent.run.summary }, at)
    ?? demoMemberEntries({ id: agent.key, name: agent.agentName }, null, at);
};

const initialActivities = (world: DemoWorld, agent: DemoAgent): Entry[] => {
  if (agent.status === 'offline') return [];
  if (agent.run === world.showcaseRun) return showcaseActivities(startOf(agent, 90_000), agent.agentRunId);
  if (agent.key === 'project-task-manager-1') return projectTaskManagerActivities(startOf(agent, 60_000), agent);
  const at = startOf(agent, 5 * 60_000);
  const node = { id: agent.key, name: agent.memberName ?? agent.agentName, summary: agent.run.summary, status: agent.status };
  return (agent.memberName ? demoMemberActivities(node, at, teamOf(agent)) : demoAgentActivities(node, at) ?? demoMemberActivities(node, at)) ?? [];
};

const conversations = new WeakMap<DemoAgent, RunProjectionConversationEntry[]>();
const activities = new WeakMap<DemoAgent, Entry[]>();

/** The agent's conversation (mutable: the demo's runtime appends each turn). */
export const conversationOf = (world: DemoWorld, agent: DemoAgent): RunProjectionConversationEntry[] => {
  let entries = conversations.get(agent);
  if (!entries) {
    entries = initialEntries(world, agent) as RunProjectionConversationEntry[];
    conversations.set(agent, entries);
  }
  return entries;
};

/** The agent's Activity entries (mutable, as its conversation). */
export const activitiesOf = (world: DemoWorld, agent: DemoAgent): Entry[] => {
  let entries = activities.get(agent);
  if (!entries) {
    entries = initialActivities(world, agent);
    activities.set(agent, entries);
  }
  return entries;
};
