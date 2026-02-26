import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { AgentConfig } from '../src/agent/context/agent-config.js';
import { AgentFactory } from '../src/agent/factory/agent-factory.js';
import { BaseAgentWorkspace } from '../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../src/agent/workspace/workspace-config.js';
import { runAgentCli } from '../src/cli/index.js';
import { Search } from '../src/tools/search-tool.js';
import { ReadUrl } from '../src/tools/web/read-url-tool.js';
import { DownloadMediaTool } from '../src/tools/multimedia/download-media-tool.js';
import { registerReadFileTool } from '../src/tools/file/read-file.js';
import { registerWriteFileTool } from '../src/tools/file/write-file.js';
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
      topic: { type: 'string' },
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'workspace-path': { type: 'string', default: './deep_research_workspace' },
      'help-models': { type: 'boolean', default: false },
      'no-tool-logs': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/deep_research_agent.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const workspacePath = path.resolve(values['workspace-path']);
  await fs.mkdir(path.join(workspacePath, 'papers'), { recursive: true });
  await fs.mkdir(path.join(workspacePath, 'reports'), { recursive: true });
  const workspace = new LocalWorkspace(workspacePath);

  const llm = await createLlmOrThrow(values['llm-model']);

  let searchTool: Search;
  try {
    searchTool = new Search();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize search_web tool.');
    console.error(errorMessage);
    console.error(
      'Set one of these environment configurations before running this example:\n' +
      '- SERPER_API_KEY\n' +
      '- SERPAPI_API_KEY\n' +
      '- VERTEX_AI_SEARCH_API_KEY + VERTEX_AI_SEARCH_SERVING_CONFIG'
    );
    process.exitCode = 1;
    await llm.cleanup();
    return;
  }

  const tools = [
    searchTool,
    new ReadUrl(),
    new DownloadMediaTool(),
    registerReadFileTool(),
    registerWriteFileTool()
  ];

  const promptPath = resolveExamplePath('prompts', 'deep_research_agent.prompt');
  const systemPrompt = await fs.readFile(promptPath, 'utf8');

  const agentConfig = new AgentConfig(
    'DeepResearchAgent',
    'ResearchAnalyst',
    'An agent that performs iterative, source-backed deep web research.',
    llm,
    systemPrompt,
    tools,
    false,
    null,
    null,
    null,
    null,
    null,
    workspace
  );

  const agent = new AgentFactory().createAgent(agentConfig);
  const initialPrompt = values.topic
    ? `Research this topic deeply and produce a report with sources: ${values.topic}`
    : `Your workspace is "${workspacePath}". Ask me what topic to research if I have not provided one yet.`;

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
