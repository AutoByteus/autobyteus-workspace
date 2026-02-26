import { parseArgs } from 'node:util';
import { AgentConfig } from '../src/agent/context/agent-config.js';
import { AgentFactory } from '../src/agent/factory/agent-factory.js';
import { runAgentCli } from '../src/cli/index.js';
import { defaultToolRegistry } from '../src/tools/registry/tool-registry.js';
import { McpToolRegistrar } from '../src/tools/mcp/tool-registrar.js';
import { loadEnv } from './shared/example-paths.js';
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
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/browser_agent.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const registrar = new McpToolRegistrar();
  const serverId = 'browsermcp';
  const browserMcpConfig = {
    [serverId]: {
      transport_type: 'stdio',
      stdio_params: {
        command: 'npx',
        args: ['@browsermcp/mcp@latest'],
        env: {}
      },
      enabled: true
    }
  };

  await registrar.loadAndRegisterServer(browserMcpConfig);

  const browserToolDefs = defaultToolRegistry.getToolsByMcpServer(serverId);
  if (!browserToolDefs.length) {
    console.error(`No Browser tools were registered for server '${serverId}'.`);
    process.exitCode = 1;
    return;
  }

  const toolsForAgent = browserToolDefs.map((def) => defaultToolRegistry.createTool(def.name));

  const llm = await createLlmOrThrow(values['llm-model']);

  const systemPrompt =
    'You are a helpful assistant that can browse the web to find information. ' +
    'When asked to perform a task on a browser, you should understand the user\'s intent and use the available tools.';

  const agentConfig = new AgentConfig(
    'BrowserAgent',
    'WebNavigator',
    'An agent that can browse the web using remote MCP tools.',
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
