import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { AgentConfig } from '../src/agent/context/agent-config.js';
import { AgentFactory } from '../src/agent/factory/agent-factory.js';
import { runAgentCli } from '../src/cli/index.js';
import { registerRunBashTool } from '../src/tools/terminal/tools/run-bash.js';
import { registerReadFileTool } from '../src/tools/file/read-file.js';
import { loadEnv, resolveExamplePath } from './shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from './shared/llm-helpers.js';
import { setConsoleLogLevel } from './shared/logging.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'help-models': { type: 'boolean', default: false },
      'no-tool-logs': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agent_with_skill.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const skillPath = resolveExamplePath('skills', 'image_concatenator');
  if (!fs.existsSync(skillPath)) {
    console.error(`Skill directory not found at: ${skillPath}`);
    process.exitCode = 1;
    return;
  }

  const llm = await createLlmOrThrow(values['llm-model']);
  const tools = [registerRunBashTool(), registerReadFileTool()];

  const agentConfig = new AgentConfig(
    'ImageOpsAgent',
    'Operator',
    'An agent capable of image operations using local skills.',
    llm,
    'You are a helpful assistant. Use your skills to answer user requests.',
    tools,
    false,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    [skillPath]
  );

  const agent = new AgentFactory().createAgent(agentConfig);

  console.log(`Skill loaded from: ${skillPath}`);
  console.log("Try asking: 'Please concatenate img1.png and img2.png into merged.png'");

  try {
    await runAgentCli(agent, { showToolLogs: !values['no-tool-logs'] });
  } finally {
    await llm.cleanup();
  }
}

void main();
