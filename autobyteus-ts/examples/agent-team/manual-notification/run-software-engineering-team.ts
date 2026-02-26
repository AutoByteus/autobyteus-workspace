import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { BaseAgentWorkspace } from '../../../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../../../src/agent/workspace/workspace-config.js';
import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { runAgentTeamCli } from '../../../src/cli/index.js';
import { SendMessageTo } from '../../../src/agent/message/send-message-to.js';
import { CreateTasks } from '../../../src/task-management/tools/task-tools/create-tasks.js';
import { GetTaskPlanStatus } from '../../../src/task-management/tools/task-tools/get-task-plan-status.js';
import { UpdateTaskStatus } from '../../../src/task-management/tools/task-tools/update-task-status.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { registerReadFileTool } from '../../../src/tools/file/read-file.js';
import { registerRunBashTool } from '../../../src/tools/terminal/tools/run-bash.js';
import { loadEnv, resolveExamplePath } from '../../shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from '../../shared/llm-helpers.js';
import { setConsoleLogLevel } from '../../shared/logging.js';

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

async function loadPrompt(filename: string): Promise<string> {
  const promptPath = resolveExamplePath(
    'agent_team',
    'manual_notification',
    'prompts',
    'software_engineering',
    filename
  );
  return fs.readFile(promptPath, 'utf8');
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'coordinator-model': { type: 'string' },
      'engineer-model': { type: 'string' },
      'reviewer-model': { type: 'string' },
      'tester-model': { type: 'string' },
      'output-dir': { type: 'string', default: './code_review_output' },
      'help-models': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agent_team_software_engineering_manual.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const coordinatorModel = values['coordinator-model'] ?? values['llm-model'];
  const engineerModel = values['engineer-model'] ?? values['llm-model'];
  const reviewerModel = values['reviewer-model'] ?? values['llm-model'];
  const testerModel = values['tester-model'] ?? values['llm-model'];

  const outputDir = path.resolve(values['output-dir']);
  await fs.mkdir(outputDir, { recursive: true });
  const workspace = new SimpleWorkspace(outputDir);

  const coordinatorLlm = await createLlmOrThrow(coordinatorModel);
  const engineerLlm = await createLlmOrThrow(engineerModel);
  const reviewerLlm = await createLlmOrThrow(reviewerModel);
  const testerLlm = await createLlmOrThrow(testerModel);

  const coordinatorConfig = new AgentConfig(
    'Project Manager',
    'Coordinator',
    'Manages the development process by planning and assigning tasks.',
    coordinatorLlm,
    await loadPrompt('coordinator.prompt'),
    [new CreateTasks(), new GetTaskPlanStatus(), new SendMessageTo()]
  );

  const engineerConfig = new AgentConfig(
    'Software Engineer',
    'Developer',
    'Writes code and corresponding tests based on instructions.',
    engineerLlm,
    await loadPrompt('software_engineer.prompt'),
    [registerWriteFileTool(), new UpdateTaskStatus(), new GetTaskPlanStatus(), new SendMessageTo()],
    true,
    null,
    null,
    null,
    null,
    null,
    workspace
  );

  const reviewerConfig = new AgentConfig(
    'Code Reviewer',
    'Senior Developer',
    'Reviews code and tests for quality and correctness.',
    reviewerLlm,
    await loadPrompt('code_reviewer.prompt'),
    [
      registerReadFileTool(),
      registerWriteFileTool(),
      new UpdateTaskStatus(),
      new GetTaskPlanStatus(),
      new SendMessageTo()
    ],
    true,
    null,
    null,
    null,
    null,
    null,
    workspace
  );

  const testerConfig = new AgentConfig(
    'Tester',
    'QA Automation',
    'Executes tests and reports results.',
    testerLlm,
    await loadPrompt('tester.prompt'),
    [registerRunBashTool(), new UpdateTaskStatus(), new GetTaskPlanStatus(), new SendMessageTo()],
    true,
    null,
    null,
    null,
    null,
    null,
    workspace
  );

  const team = new AgentTeamBuilder('SoftwareDevTeam', 'A team for writing, reviewing, and testing code.')
    .setCoordinator(coordinatorConfig)
    .addAgentNode(engineerConfig)
    .addAgentNode(reviewerConfig)
    .addAgentNode(testerConfig)
    .build();

  try {
    await runAgentTeamCli(team);
  } finally {
    await coordinatorLlm.cleanup();
    await engineerLlm.cleanup();
    await reviewerLlm.cleanup();
    await testerLlm.cleanup();
  }
}

void main();
