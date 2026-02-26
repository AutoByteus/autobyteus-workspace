import { parseArgs } from 'node:util';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { AgentTeamConfig } from '../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../src/agent-team/context/team-node-config.js';
import { runAgentTeamCli } from '../../../src/cli/index.js';
import { SendMessageTo } from '../../../src/agent/message/send-message-to.js';
import { loadEnv } from '../../shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from '../../shared/llm-helpers.js';
import { setConsoleLogLevel } from '../../shared/logging.js';

function buildSubTeamConfig(
  name: string,
  role: string,
  coordinatorConfig: AgentConfig,
  memberConfig: AgentConfig
): AgentTeamConfig {
  const coordinatorNode = new TeamNodeConfig({ nodeDefinition: coordinatorConfig });
  const memberNode = new TeamNodeConfig({ nodeDefinition: memberConfig });
  return new AgentTeamConfig({
    name,
    description: `${name} sub-team`,
    role,
    nodes: [coordinatorNode, memberNode],
    coordinatorNode: coordinatorNode
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'moderator-model': { type: 'string' },
      'affirmative-model': { type: 'string' },
      'negative-model': { type: 'string' },
      'help-models': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agent_team_debate_manual.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const moderatorModel = values['moderator-model'] ?? values['llm-model'];
  const affirmativeModel = values['affirmative-model'] ?? values['llm-model'];
  const negativeModel = values['negative-model'] ?? values['llm-model'];

  const moderatorLlm = await createLlmOrThrow(moderatorModel);
  const affirmativeLlm = await createLlmOrThrow(affirmativeModel);
  const negativeLlm = await createLlmOrThrow(negativeModel);

  const moderatorConfig = new AgentConfig(
    'DebateModerator',
    'Coordinator',
    'Manages the debate and summarizes.',
    moderatorLlm,
    'You are an AI agent. Your name is \"DebateModerator\". You are the impartial moderator of a debate.\n\n' +
      '### Your Teams\n\n\n' +
      '### Responsibilities\n' +
      '1. Announce the debate topic.\n' +
      '2. Ask Team_Affirmative for its opening statement.\n' +
      '3. Ask Team_Negative for its rebuttal.\n' +
      '4. Facilitate turn-based arguments.\n' +
      '5. Conclude the debate.\n\n' +
      '### Rules\n' +
      '- Communicate with only one team at a time.\n' +
      '- Use the team name when calling send_message_to.',
    [new SendMessageTo()]
  );

  const leadAffirmativeConfig = new AgentConfig(
    'Lead_Affirmative',
    'Coordinator',
    'Leads the team arguing for the motion.',
    affirmativeLlm,
    'You are an AI agent. Your name is \"Lead_Affirmative\". You lead the Affirmative team.\n' +
      'Delegate tasks to Proponent using send_message_to.\n\n' +
      '### Your Team\n',
    [new SendMessageTo()]
  );

  const proponentConfig = new AgentConfig(
    'Proponent',
    'Debater',
    'Argues in favor of the debate topic.',
    affirmativeLlm,
    'You are an AI agent. Your name is \"Proponent\". You argue STRONGLY and PERSUASIVELY in favor of the motion.'
  );

  const leadNegativeConfig = new AgentConfig(
    'Lead_Negative',
    'Coordinator',
    'Leads the team arguing against the motion.',
    negativeLlm,
    'You are an AI agent. Your name is \"Lead_Negative\". You lead the Negative team.\n' +
      'Delegate tasks to Opponent using send_message_to.\n\n' +
      '### Your Team\n',
    [new SendMessageTo()]
  );

  const opponentConfig = new AgentConfig(
    'Opponent',
    'Debater',
    'Argues against the debate topic.',
    negativeLlm,
    'You are an AI agent. Your name is \"Opponent\". You argue STRONGLY and PERSUASIVELY against the motion.'
  );

  const affirmativeTeamConfig = buildSubTeamConfig(
    'Team_Affirmative',
    'Argues FOR the motion',
    leadAffirmativeConfig,
    proponentConfig
  );

  const negativeTeamConfig = buildSubTeamConfig(
    'Team_Negative',
    'Argues AGAINST the motion',
    leadNegativeConfig,
    opponentConfig
  );

  const debateTeam = new AgentTeamBuilder('Grand_Debate', 'Hierarchical debate team')
    .setCoordinator(moderatorConfig)
    .addSubTeamNode(affirmativeTeamConfig)
    .addSubTeamNode(negativeTeamConfig)
    .build();

  try {
    await runAgentTeamCli(debateTeam);
  } finally {
    await moderatorLlm.cleanup();
    await affirmativeLlm.cleanup();
    await negativeLlm.cleanup();
  }
}

void main();
