// The demo's sample world (autobyteus-279, REQ-004): its content is consistent the way a node's records are, and every
// run answers the reads the phone makes when it opens one.
import { describe, expect, it } from 'vitest';
import { demoGraphqlHandlers } from '../graphql';
import { DEMO_WORKSPACE_ID } from '../graphql/definitions';
import { activitiesOf, conversationOf } from '../world/conversations';
import { createDemoWorld, DEMO_WORKSPACE_NAME, type DemoRun } from '../world/DemoWorld';
import { folderFile, isFolderPath } from '../world/folder';
import { addressOf } from '../world/projections';

const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
const agents = world.allRuns().flatMap((run) => run.agents);

describe('the demo world', () => {
  it('lists each tool call once: an agent\'s Activity holds its conversation\'s calls, by their ids', () => {
    for (const agent of agents) {
      const calls = new Set(conversationOf(world, agent).filter((entry) => entry.kind === 'tool_call').map((entry) => entry.invocationId));
      const activity = activitiesOf(world, agent).map((entry) => entry.invocationId as string);
      expect(activity.filter((id) => !calls.has(id)), `${agent.key}`).toEqual([]);
    }
  });

  it('gives every sample agent Activity, a stopped run\'s too (REQ-004)', () => {
    const without = agents.filter((agent) => !agent.run.startedInDemo && activitiesOf(world, agent).length === 0).map((agent) => agent.key);
    expect(without).toEqual([]);
  });

  it('names only files and folders the demo folder has', () => {
    const named = agents.flatMap((agent) => conversationOf(world, agent)
      .filter((entry) => entry.kind === 'tool_call' && typeof entry.toolArgs?.path === 'string')
      .map((entry) => String(entry.toolArgs!.path)));
    const missing = [...new Set(named)].filter((path) => path !== DEMO_WORKSPACE_NAME && !folderFile(path) && !isFolderPath(path));
    expect(missing).toEqual([]);
  });

  it('answers what the phone reads when it opens each run', async () => {
    const answers: Array<Promise<unknown> | unknown> = [];
    const kindOf = (run: DemoRun) => (run.kind === 'agent' ? 'agent' : run.kind === 'team' ? 'agent_team' : 'agent_org');
    for (const run of world.allRuns()) {
      answers.push(demoGraphqlHandlers.GetRunTree({ kind: kindOf(run), runId: run.runId }, world));
      if (run.kind === 'agent') {
        answers.push(demoGraphqlHandlers.GetRunProjection({ runId: run.runId }, world));
        answers.push(demoGraphqlHandlers.GetAgentRunResumeConfig({ runId: run.runId }, world));
        answers.push(demoGraphqlHandlers.AgentRunModelOptions({ agentRunId: run.runId }, world));
        answers.push(demoGraphqlHandlers.GetAgentRunCollaboration({ runId: run.runId }, world));
      } else if (run.kind === 'team') {
        answers.push(demoGraphqlHandlers.GetTeamRunResumeConfig({ teamRunId: run.runId }, world));
        answers.push(demoGraphqlHandlers.TeamRunModelOptions({ teamRunId: run.runId }, world));
        for (const agent of run.agents) answers.push(demoGraphqlHandlers.GetTeamMemberRunProjection({ teamRunId: run.runId, agentRunId: agent.agentRunId }, world));
      } else {
        answers.push(demoGraphqlHandlers.GetAgentOrgRunInspection({ orgRunId: run.runId }, world));
        answers.push(demoGraphqlHandlers.AgentOrgRunModelOptions({ orgRunId: run.runId, teamWorkspacePatches: [] }, world));
        for (const agent of run.agents) {
          answers.push(demoGraphqlHandlers.GetAgentOrgMemberRunProjection({ orgRunId: run.runId, memberAddress: addressOf(agent), agentRunId: agent.agentRunId }, world));
        }
      }
    }
    answers.push(demoGraphqlHandlers.GetFolderChildren({ workspaceId: DEMO_WORKSPACE_ID, folderPath: '' }, world));
    await expect(Promise.all(answers)).resolves.toHaveLength(answers.length);
  });

  it('keeps a stopped run\'s Settings in memory, and refuses a live run\'s as the node does', async () => {
    const stopped = world.allRuns().find((run) => run.key === 'codex-1')!;
    const live = world.showcaseRun;
    const save = (run: DemoRun) => demoGraphqlHandlers.UpdateStoppedAgentRunSelection({
      input: { agentRunId: run.runId, runtimeKind: 'autobyteus', llmModelIdentifier: 'demo/sample-reasoning-model', llmConfig: null },
    }, world);
    expect((await save(live)).updateStoppedAgentRunSelection.outcome).toBe('RUN_ACTIVE');
    expect((await save(stopped)).updateStoppedAgentRunSelection.outcome).toBe('UPDATED');
    expect(stopped.coordinator.launch.llmModelIdentifier).toBe('demo/sample-reasoning-model');
    expect((await save(stopped)).updateStoppedAgentRunSelection.outcome).toBe('UNCHANGED');
  });
});
