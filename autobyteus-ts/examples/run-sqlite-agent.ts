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
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/sqlite_agent.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const scriptPath = requireEnv('TEST_SQLITE_MCP_SCRIPT_PATH');
  const dbPath = requireEnv('TEST_SQLITE_DB_PATH');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`The script path specified by TEST_SQLITE_MCP_SCRIPT_PATH does not exist: ${scriptPath}`);
  }
  if (!fs.existsSync(dbPath)) {
    throw new Error(`The database path specified by TEST_SQLITE_DB_PATH does not exist: ${dbPath}`);
  }

  const registrar = new McpToolRegistrar();
  const serverId = 'sqlite-mcp';
  const sqliteConfig = {
    [serverId]: {
      transport_type: 'stdio',
      stdio_params: {
        command: 'node',
        args: [scriptPath, dbPath],
        env: {}
      },
      enabled: true,
      tool_name_prefix: 'sqlite'
    }
  };

  await registrar.loadAndRegisterServer(sqliteConfig);

  const toolDefs = defaultToolRegistry.getToolsByMcpServer(serverId);
  if (!toolDefs.length) {
    console.error(`No SQLite tools were registered for server '${serverId}'.`);
    process.exitCode = 1;
    return;
  }

  const toolsForAgent = toolDefs.map((def) => defaultToolRegistry.createTool(def.name));

  const llm = await createLlmOrThrow(values['llm-model']);

  const systemPrompt =
    'You are a helpful assistant that can query a SQLite database using remote tools. ' +
    'Understand the user request and use the SQLite tools to answer questions.';

  const agentConfig = new AgentConfig(
    'SQLiteAgent',
    'DataAnalyst',
    'An agent that queries a SQLite database using MCP tools.',
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
