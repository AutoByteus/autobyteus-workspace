import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { AgentConfig } from '../src/agent/context/agent-config.js';
import { AgentFactory } from '../src/agent/factory/agent-factory.js';
import { BaseAgentWorkspace } from '../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../src/agent/workspace/workspace-config.js';
import { runAgentCli } from '../src/cli/index.js';
import { registerWriteFileTool } from '../src/tools/file/write-file.js';
import { loadEnv } from './shared/example-paths.js';
import { createLlmOrThrow, printAvailableModels } from './shared/llm-helpers.js';
import { setConsoleLogLevel } from './shared/logging.js';

class SimpleWorkspace extends BaseAgentWorkspace {
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
      'output-dir': { type: 'string', default: './poem_writer_output' },
      'poem-filename': { type: 'string', default: 'poem_interactive.txt' },
      'llm-model': { type: 'string', default: 'qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234' },
      'help-models': { type: 'boolean', default: false },
      'no-tool-logs': { type: 'boolean', default: false },
      'show-token-usage': { type: 'boolean', default: false }
    }
  });

  loadEnv();
  setConsoleLogLevel(
    process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
    process.env.AUTOBYTEUS_LOG_FILE ?? './logs/poem_writer.log'
  );

  if (values['help-models']) {
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    return;
  }

  const outputDir = path.resolve(values['output-dir']);
  await fs.mkdir(outputDir, { recursive: true });

  const llm = await createLlmOrThrow(values['llm-model']);
  const tool = registerWriteFileTool();
  const workspace = new SimpleWorkspace(outputDir);

  const poemFilename = values['poem-filename'];
  const systemPrompt =
    'You are a world-class poet working inside a dedicated file workspace. ' +
    'Your task is to write a creative and beautiful poem on the given topic. ' +
    `After composing the poem, you MUST use the available tool to save your work. ` +
    `Because you are in a workspace, you only need to provide a relative path; simply use the filename '${poemFilename}'. ` +
    'Conclude your response with only the tool call necessary to save the poem.';

  const agentConfig = new AgentConfig(
    'PoemWriterAgent',
    'Poet',
    'Creates poems and saves them to disk.',
    llm,
    systemPrompt,
    [tool],
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
    ? `Write a poem about "${values.topic}" and save it to "${poemFilename}".`
    : undefined;

  try {
    await runAgentCli(agent, {
      showToolLogs: !values['no-tool-logs'],
      showTokenUsage: values['show-token-usage'],
      initialPrompt
    });
  } finally {
    await llm.cleanup();
  }
}

void main();
