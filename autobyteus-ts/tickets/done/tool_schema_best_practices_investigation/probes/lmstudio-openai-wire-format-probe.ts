import http from 'node:http';
import { once } from 'node:events';
import { LMStudioLLM } from '../../../src/llm/api/lmstudio-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';

const requests: Array<{ method: string | undefined; url: string | undefined; body: unknown }> = [];

const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  requests.push({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : null });

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  const chunk = {
    id: 'chatcmpl-probe',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'wire-format-probe',
    choices: [{ index: 0, delta: { content: 'ok' }, finish_reason: null }],
  };
  const done = {
    id: 'chatcmpl-probe',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'wire-format-probe',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  res.write(`data: ${JSON.stringify(done)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No server address');

process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';

const llm = new LMStudioLLM(
  new LLMModel({
    name: 'wire-format-probe',
    value: 'wire-format-probe',
    canonicalName: 'wire-format-probe',
    provider: LLMProvider.LMSTUDIO,
    runtime: LLMRuntime.LMSTUDIO,
    hostUrl: `http://127.0.0.1:${address.port}`,
  }),
  new LLMConfig({ temperature: 0, maxTokens: 16 }),
);

const messages = [
  new Message(MessageRole.SYSTEM, 'System prompt.'),
  new Message(MessageRole.USER, 'Please inspect the workspace.'),
  new Message(MessageRole.ASSISTANT, {
    content: null,
    tool_payload: new ToolCallPayload([
      { id: 'call_probe_1', name: 'run_bash', arguments: { command: 'pwd && ls -la' } },
    ]),
  }),
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_probe_1', 'run_bash', { stdout: '/tmp\n', stderr: '', exitCode: 0 }),
  }),
];

const tools = [
  {
    type: 'function',
    function: {
      name: 'run_bash',
      description: 'Run a bash command.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
        additionalProperties: false,
      },
    },
  },
];

for await (const _chunk of llm.streamMessages(messages, null, { tools })) {
  // Drain stream so the OpenAI SDK sends and parses the request.
}
await llm.cleanup();
await new Promise<void>((resolve) => server.close(() => resolve()));

const body = requests[0]?.body as any;
const result = {
  requestCount: requests.length,
  path: requests[0]?.url,
  parser: process.env.AUTOBYTEUS_STREAM_PARSER,
  hasTools: Array.isArray(body?.tools),
  toolChoice: body?.tool_choice ?? null,
  messages: body?.messages,
  containsLegacyToolResultUserText: JSON.stringify(body?.messages ?? []).includes('[TOOL_RESULT]'),
  containsSyntheticToolExecutionUserText: JSON.stringify(body?.messages ?? []).includes('The following tool executions have completed'),
  roleSequence: (body?.messages ?? []).map((m: any) => m.role),
};
console.log(JSON.stringify(result, null, 2));
