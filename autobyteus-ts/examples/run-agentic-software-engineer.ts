import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { AgentConfig } from '../src/agent/context/agent-config.js';
import { AgentFactory } from '../src/agent/factory/agent-factory.js';
import { BaseAgentWorkspace } from '../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../src/agent/workspace/workspace-config.js';
import { runAgentCli } from '../src/cli/index.js';
import { ToolOrigin } from '../src/tools/tool-origin.js';
import { defaultToolRegistry } from '../src/tools/registry/tool-registry.js';
import { registerTools } from '../src/tools/register-tools.js';
import { loadEnv, resolveExamplePath } from './shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from './shared/llm-helpers.js';
import { setConsoleLogLevel } from './shared/logging.js';

class LocalWorkspace extends BaseAgentWorkspace {
  private rootPath: string;

  constructor(rootPath: string) {
    super(new WorkspaceConfig({ root_path: rootPath }));
    this.rootPath = rootPath;
  }

  getBasePath(): string {
    return this.rootPath;
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'workspace-path': { type: 'string', default: './agent_workspace' },
      'help-models': { type: 'boolean', default: false },
      'no-tool-logs': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/agentic_software_engineer.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  registerTools();

  const workspacePath = path.resolve(values['workspace-path']);
  await fs.mkdir(workspacePath, { recursive: true });
  const workspace = new LocalWorkspace(workspacePath);

  const localToolDefs = defaultToolRegistry.listTools().filter((def) => def.origin === ToolOrigin.LOCAL);
  if (!localToolDefs.length) {
    console.error('No local tools were found in the registry. Cannot create agent.');
    process.exitCode = 1;
    return;
  }

  const toolsForAgent = localToolDefs.map((def) => defaultToolRegistry.createTool(def.name));

  const llm = await createLlmOrThrow(values['llm-model']);

  const promptPath = resolveExamplePath('prompts', 'agentic_software_engineer.prompt');
  const systemPrompt = await fs.readFile(promptPath, 'utf8');

  const agentConfig = new AgentConfig(
    'AgenticSoftwareDeveloper',
    'SoftwareEngineer',
    'An AI agent that can reason, plan, and execute software development tasks.',
    llm,
    systemPrompt,
    toolsForAgent,
    false,
    null,
    null,
    null,
    null,
    null,
    workspace
  );

  const agent = new AgentFactory().createAgent(agentConfig);
  const initialPrompt = `Hello! I'm ready to work. My current working directory is "${workspacePath}". What's the first task?`;

  try {
    await runAgentCli(agent, {
      showToolLogs: !values['no-tool-logs'],
      initialPrompt
    });
  } finally {
    await llm.cleanup();
  }
}

void main();
