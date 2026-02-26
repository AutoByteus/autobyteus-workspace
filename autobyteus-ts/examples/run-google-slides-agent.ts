import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { AgentConfig } from '../src/agent/context/agent-config.js';
import { AgentFactory } from '../src/agent/factory/agent-factory.js';
import { runAgentCli } from '../src/cli/index.js';
import { defaultToolRegistry } from '../src/tools/registry/tool-registry.js';
import { McpToolRegistrar } from '../src/tools/mcp/tool-registrar.js';
import { loadEnv } from './shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from './shared/llm-helpers.js';
import { setConsoleLogLevel } from './shared/logging.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

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
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/google_slides_agent.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const scriptPath = requireEnv('TEST_GOOGLE_SLIDES_MCP_SCRIPT_PATH');
  const googleClientId = requireEnv('GOOGLE_CLIENT_ID');
  const googleClientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const googleRefreshToken = requireEnv('GOOGLE_REFRESH_TOKEN');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`The script path specified by TEST_GOOGLE_SLIDES_MCP_SCRIPT_PATH does not exist: ${scriptPath}`);
  }

  const registrar = new McpToolRegistrar();
  const serverId = 'google-slides-mcp';
  const googleSlidesConfig = {
    [serverId]: {
      transport_type: 'stdio',
      stdio_params: {
        command: 'node',
        args: [scriptPath],
        env: {
          GOOGLE_CLIENT_ID: googleClientId,
          GOOGLE_CLIENT_SECRET: googleClientSecret,
          GOOGLE_REFRESH_TOKEN: googleRefreshToken
        }
      },
      enabled: true,
      tool_name_prefix: 'gslide'
    }
  };

  await registrar.loadAndRegisterServer(googleSlidesConfig);

  const toolDefs = defaultToolRegistry.getToolsByMcpServer(serverId);
  if (!toolDefs.length) {
    console.error(`No Google Slides tools were registered for server '${serverId}'.`);
    process.exitCode = 1;
    return;
  }

  const toolsForAgent = toolDefs.map((def) => defaultToolRegistry.createTool(def.name));
  const llm = await createLlmOrThrow(values['llm-model']);

  const systemPrompt =
    'You are a helpful assistant with expertise in creating and managing Google Slides presentations. ' +
    'Use the available tools to create slides, insert content, and update presentations.';

  const agentConfig = new AgentConfig(
    'GoogleSlidesAgent',
    'PresentationBuilder',
    'An agent that manages Google Slides via MCP tools.',
    llm,
    systemPrompt,
    toolsForAgent,
    false
  );

  const agent = new AgentFactory().createAgent(agentConfig);

  try {
    await runAgentCli(agent, { showToolLogs: !values['no-tool-logs'] });
  } finally {
    await llm.cleanup();
  }
}

void main();
