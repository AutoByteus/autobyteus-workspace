import { parseArgs } from 'node:util';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { runAgentTeamCli } from '../../../src/cli/index.js';
import { SendMessageTo } from '../../../src/agent/message/send-message-to.js';
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
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agent_team_basic_research_manual.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const llm = await createLlmOrThrow(values['llm-model']);

  const managerConfig = new AgentConfig(
    'ResearchManager',
    'Coordinator',
    'Delegates research questions to specialists.',
    llm,
    'You are an AI agent. Your name is \"ResearchManager\". Your job is to understand a user\'s research goal and delegate it to the correct specialist.\n' +
      'Do not answer the research question yourself; your role is to delegate.\n\n' +
      '### Your Team\nHere is a list of the specialists available to you:\n\n\n' +
      '### Rules\n- Use the `send_message_to` tool to delegate tasks.\n' +
      '- Use the agent\'s exact name as the recipient.\n\n' +
      '### Your Task\nAnalyze the user\'s request and delegate it to the appropriate team member.',
    [new SendMessageTo()]
  );

  const factCheckerConfig = new AgentConfig(
    'FactChecker',
    'Specialist',
    'Answers factual questions from a limited internal knowledge base.',
    llm,
    'You are an AI agent. Your name is \"FactChecker\". You are a fact-checking bot.\n' +
      'You will receive research questions from \"ResearchManager\". Answer only from your knowledge base.\n\n' +
      '### Knowledge Base\n- The capital of France is Paris.\n- The tallest mountain on Earth is Mount Everest.\n- The primary programming language for AutoByteUs is Python.\n\n' +
      '### Rules\nIf you do not know the answer, respond with: \"I do not have information on that topic.\"'
  );

  const team = new AgentTeamBuilder('BasicResearchTeam', 'Two-agent research team.')
    .setCoordinator(managerConfig)
    .addAgentNode(factCheckerConfig)
    .build();

  try {
    await runAgentTeamCli(team);
  } finally {
    await llm.cleanup();
  }
}

void main();
