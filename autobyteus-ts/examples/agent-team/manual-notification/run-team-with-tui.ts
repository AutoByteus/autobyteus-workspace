import { parseArgs } from 'node:util';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { runAgentTeamCli } from '../../../src/cli/index.js';
import { SendMessageTo } from '../../../src/agent/message/send-message-to.js';
import { CreateTasks } from '../../../src/task-management/tools/task-tools/create-tasks.js';
import { GetTaskPlanStatus } from '../../../src/task-management/tools/task-tools/get-task-plan-status.js';
import { UpdateTaskStatus } from '../../../src/task-management/tools/task-tools/update-task-status.js';
import { loadEnv } from '../../shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from '../../shared/llm-helpers.js';
import { setConsoleLogLevel } from '../../shared/logging.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'help-models': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agent_team_tui_manual.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const llm = await createLlmOrThrow(values['llm-model']);

  const coordinatorConfig = new AgentConfig(
    'ProjectManager',
    'Coordinator',
    'Delegates tasks to the team to fulfill the user request.',
    llm,
    'You are an AI agent. Your name is \"ProjectManager\". Your role is to take a user request, create a plan, and manage its execution by your team.\n\n' +
      '### Your Team\nHere is your team member:\n\n\n' +
      '### Mission Workflow\n' +
      '1. Analyze and plan a single task for your FactChecker.\n' +
      '2. Publish the plan with `create_tasks`.\n' +
      '3. Notify FactChecker using `send_message_to`.\n' +
      '4. Wait for completion, then report results.\n\n' +
      '### Rules\n- Use the agent\'s exact name (`FactChecker`).',
    [new CreateTasks(), new GetTaskPlanStatus(), new SendMessageTo()]
  );

  const factCheckerConfig = new AgentConfig(
    'FactChecker',
    'Specialist',
    'Answers factual questions from a limited internal knowledge base.',
    llm,
    'You are an AI agent. Your name is \"FactChecker\". You are a fact-checking specialist.\n' +
      'When you receive a message, use `get_task_plan_status` to find your task.\n\n' +
      '### Knowledge Base\n- The capital of France is Paris.\n- The tallest mountain on Earth is Mount Everest.\n\n' +
      '### Rules\n' +
      '- If asked something you don\'t know, respond with: \"I do not have information on that topic.\"\n' +
      '- After answering, mark the task completed with `update_task_status`.\n' +
      '- Notify ProjectManager using `send_message_to`.',
    [new UpdateTaskStatus(), new GetTaskPlanStatus(), new SendMessageTo()]
  );

  const team = new AgentTeamBuilder('TuiDemoTeam', 'Two-agent team for the TUI demo.')
    .setCoordinator(coordinatorConfig)
    .addAgentNode(factCheckerConfig)
    .build();

  try {
    await runAgentTeamCli(team);
  } finally {
    await llm.cleanup();
  }
}

void main();
