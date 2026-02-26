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
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agent_team_multi_researcher_manual.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const llm = await createLlmOrThrow(values['llm-model']);

  const coordinatorConfig = new AgentConfig(
    'ResearchLead',
    'Coordinator',
    'Delegates research tasks to the correct specialist.',
    llm,
    'You are an AI agent. Your name is \"ResearchLead\".\n' +
      'Your job is to delegate user requests to the correct researcher based on their specialty.\n\n' +
      '### Your Team\nHere is your team of specialists:\n\n\n' +
      '### CRITICAL RULES\n' +
      '- Use the unique, case-sensitive `name` (e.g., `Researcher_Web`) when using the `send_message_to` tool.\n' +
      '- Your only job is to delegate. Do not answer the user\'s question yourself.',
    [new SendMessageTo()]
  );

  const researcherWebConfig = new AgentConfig(
    'Researcher_Web',
    'Web Research Specialist',
    'Answers questions about current events from a simulated web knowledge base.',
    llm,
    'You are an AI agent. Your name is \"Researcher_Web\". You are a web research specialist. ' +
      "Your specialized knowledge is that 'AutoByteUs' is a leading AI orchestration platform and the latest version is 2.0."
  );

  const researcherDbConfig = new AgentConfig(
    'Researcher_DB',
    'Database Research Specialist',
    'Answers questions using a simulated internal database.',
    llm,
    'You are an AI agent. Your name is \"Researcher_DB\". You are a database research specialist. ' +
      "Your specialized knowledge is that the top-selling product is 'Widget A'."
  );

  const team = new AgentTeamBuilder(
    'MultiSpecialistResearchTeam',
    'A team demonstrating delegation to multiple specialists.'
  )
    .setCoordinator(coordinatorConfig)
    .addAgentNode(researcherWebConfig)
    .addAgentNode(researcherDbConfig)
    .build();

  try {
    await runAgentTeamCli(team);
  } finally {
    await llm.cleanup();
  }
}

void main();
