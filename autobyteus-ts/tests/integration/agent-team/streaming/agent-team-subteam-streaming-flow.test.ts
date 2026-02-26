import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTeamBuilder } from '../../../../src/agent-team/agent-team-builder.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { BaseAgentWorkspace } from '../../../../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../../../../src/agent/workspace/workspace-config.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { waitForTeamToBeIdle } from '../../../../src/agent-team/utils/wait-for-idle.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentTeamFactory } from '../../../../src/agent-team/factory/agent-team-factory.js';
import { AgentTeamEventStream } from '../../../../src/agent-team/streaming/agent-team-event-stream.js';
import { AgentTeamStreamEvent } from '../../../../src/agent-team/streaming/agent-team-stream-events.js';
import type { AgentTeam } from '../../../../src/agent-team/agent-team.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../../helpers/lmstudio-llm-helper.js';

class SimpleWorkspace extends BaseAgentWorkspace {
  private rootPath: string;

  constructor(rootPath: string) {
    super(new WorkspaceConfig({ root_path: rootPath }));
    this.rootPath = rootPath;
  }

  getBasePath(): string {
    return this.rootPath;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFile = async (filePath: string, timeoutMs = 20000, intervalMs = 100): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fsSync.existsSync(filePath)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const collectEvents = async (stream: AgentTeamEventStream, timeoutMs = 15000): Promise<AgentTeamStreamEvent[]> => {
  const events: AgentTeamStreamEvent[] = [];
  const iterator = stream.allEvents();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await Promise.race([
      iterator.next(),
      new Promise<{ timedOut: true }>((resolve) => setTimeout(() => resolve({ timedOut: true }), 200))
    ]);

    if ((result as any).timedOut) {
      continue;
    }

    const typed = result as IteratorResult<AgentTeamStreamEvent>;
    if (typed.done) {
      break;
    }
    events.push(typed.value);
  }

  return events;
};

const resetFactories = () => {
  (AgentFactory as any).instance = undefined;
  (AgentTeamFactory as any).instance = undefined;
};

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Agent team sub-team streaming integration (LM Studio, api_tool_call)', () => {
  let tempDirParentCoordinator: string;
  let tempDirSubCoordinator: string;
  let originalParserEnv: string | undefined;
  let team: AgentTeam | null = null;
  let parentLlm: any = null;
  let subLlm: any = null;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactories();
    tempDirParentCoordinator = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-team-parent-coordinator-'));
    tempDirSubCoordinator = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-team-sub-coordinator-'));
  });

  afterEach(async () => {
    if (team) {
      await team.stop(10.0);
      team = null;
    }
    if (parentLlm) {
      await parentLlm.cleanup();
      parentLlm = null;
    }
    if (subLlm) {
      await subLlm.cleanup();
      subLlm = null;
    }
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactories();
    await fs.rm(tempDirParentCoordinator, { recursive: true, force: true });
    await fs.rm(tempDirSubCoordinator, { recursive: true, force: true });
  });

  it('rebroadcasts sub-team events to the parent stream', async () => {
    const tool = registerWriteFileTool();
    const toolArgs = { path: 'subteam_output.txt', content: 'Sub-team output.' };

    parentLlm = await createLmstudioLLM({ requireToolChoice: true });
    if (!parentLlm) return;
    subLlm = await createLmstudioLLM({ requireToolChoice: true });
    if (!subLlm) return;

    const parentCoordinatorConfig = new AgentConfig(
      'ParentCoordinator',
      'Coordinator',
      'Parent team coordinator',
      parentLlm,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      new SimpleWorkspace(tempDirParentCoordinator)
    );

    const subCoordinatorConfig = new AgentConfig(
      'SubCoordinator',
      'Coordinator',
      'Sub-team coordinator',
      subLlm,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      new SimpleWorkspace(tempDirSubCoordinator)
    );

    const subCoordinatorNode = new TeamNodeConfig({ nodeDefinition: subCoordinatorConfig });
    const subTeamConfig = new AgentTeamConfig({
      name: 'SubTeam',
      description: 'Sub-team integration test',
      nodes: [subCoordinatorNode],
      coordinatorNode: subCoordinatorNode
    });

    const parentBuilder = new AgentTeamBuilder('ParentTeam', 'Parent team integration test');
    parentBuilder.setCoordinator(parentCoordinatorConfig);
    parentBuilder.addSubTeamNode(subTeamConfig);
    team = parentBuilder.build();

    team.start();
    await waitForTeamToBeIdle(team, 60.0);

    const stream = new AgentTeamEventStream(team);

    await team.postMessage(
      new AgentInputUserMessage(
        `Use the write_file tool to write "${toolArgs.content}" to "${toolArgs.path}". ` +
          'Do not respond with plain text.'
      ),
      'SubTeam'
    );

    const filePath = path.join(tempDirSubCoordinator, toolArgs.path);
    const created = await waitForFile(filePath, 20000, 100);
    expect(created).toBe(true);

    await waitForTeamToBeIdle(team, 120.0);

    const events = await collectEvents(stream, 12000);
    await stream.close();

    const subTeamEvents = events.filter((event) => event.event_source_type === 'SUB_TEAM');
    expect(subTeamEvents.length).toBeGreaterThan(0);
  }, 60000);
});
