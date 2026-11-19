/**
 * Each agent's conversation and Activity in the demo (autobyteus-279), as the node's run projection carries them: built
 * once from the content when first read, then kept by the world, so a send in the demo appends to it.
 */
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation';
import { asActivities, demoAgentActivities, demoAgentEntries, demoMemberActivities, demoMemberEntries, type Entry } from './content/agentWork';
import { showcaseActivities, showcaseEntries } from './content/showcase';
import type { DemoAgent, DemoWorld } from './DemoWorld';
import { delegatedAddressOf } from './runTree';

/** The Project Task Manager's closing message in the demo (all of its delegated runs are on the demo itself). */
const PTM_SUMMARY = 'Delegated six Tasks: two to copies of the Software Engineering Team, one to the Agent Package Creator, two to the Marketing Team and the Market Researcher, and one to the Support Team. I will report when they finish.';

/** The Project Task Manager's work: one `delegate_task` per run it delegated (its run tree's rows), then its summary. */
const projectTaskManagerEntries = (at: number, agent: DemoAgent): Entry[] => {
  const s = (offset: number) => Math.floor((at + offset) / 1000);
  return [
    { kind: 'message', role: 'user', content: 'Dispatch the approved desktop app Tasks.', ts: s(0) },
    ...agent.delegated.map((run, index): Entry => ({
      kind: 'tool_call', invocationId: `demo-ptm-d${index + 1}`, toolName: 'delegate_task',
      toolArgs: { recipient_address: delegatedAddressOf(run), description: run.summary }, toolResult: `Started ${run.name}.`, ts: s(10_000 + index * 5_000),
    })),
    { kind: 'message', role: 'assistant', content: PTM_SUMMARY, ts: s(50_000) },
  ];
};

const teamOf = (agent: DemoAgent) => (agent.memberName ? { name: agent.run.name, summary: agent.run.summary } : null);
const startOf = (agent: DemoAgent, spanMs: number): number => Date.parse(agent.lastActivityAt) - spanMs;

const initialEntries = (world: DemoWorld, agent: DemoAgent): Entry[] => {
  if (agent.run === world.showcaseRun) {
    const ptm = world.topLevelRuns.find((run) => run.key === 'project-task-manager-1')!;
    return showcaseEntries(startOf(agent, 90_000), ptm.runId);
  }
  if (agent.key === 'project-task-manager-1') return projectTaskManagerEntries(startOf(agent, 60_000), agent);
  const at = startOf(agent, 5 * 60_000);
  if (agent.memberName) return demoMemberEntries({ id: agent.key, name: agent.memberName }, teamOf(agent), at);
  return demoAgentEntries({ id: agent.key, name: agent.agentName, summary: agent.run.summary }, at)
    ?? demoMemberEntries({ id: agent.key, name: agent.agentName }, null, at);
};

const initialActivities = (world: DemoWorld, agent: DemoAgent): Entry[] => {
  if (agent.status === 'offline') return [];
  if (agent.run === world.showcaseRun) return showcaseActivities(startOf(agent, 90_000));
  if (agent.key === 'project-task-manager-1') return asActivities(projectTaskManagerEntries(startOf(agent, 60_000), agent));
  const at = startOf(agent, 5 * 60_000);
  const node = { id: agent.key, name: agent.memberName ?? agent.agentName, summary: agent.run.summary, status: agent.status };
  return (agent.memberName ? demoMemberActivities(node, at, teamOf(agent)) : demoAgentActivities(node, at) ?? demoMemberActivities(node, at)) ?? [];
};

/** The ported content's entries as the projection's: each names its kind, or the content is wrong. */
const asConversation = (entries: Entry[]): RunProjectionConversationEntry[] => entries.map((entry) => {
  if (typeof entry.kind !== 'string') throw new Error(`[demo] a conversation entry has no kind: ${JSON.stringify(entry).slice(0, 120)}`);
  return entry as Entry & RunProjectionConversationEntry;
});

const conversations = new WeakMap<DemoAgent, RunProjectionConversationEntry[]>();
const activities = new WeakMap<DemoAgent, Entry[]>();

/** The agent's conversation (mutable: the demo's runtime appends each turn). */
export const conversationOf = (world: DemoWorld, agent: DemoAgent): RunProjectionConversationEntry[] => {
  let entries = conversations.get(agent);
  if (!entries) {
    entries = asConversation(initialEntries(world, agent));
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
