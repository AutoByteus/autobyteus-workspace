import http from 'node:http';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const embeddedRoot = '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/node_modules/autobyteus-ts/dist';
const url = (rel) => pathToFileURL(path.join(embeddedRoot, rel)).href;
const { LMStudioLLM } = await import(url('llm/api/lmstudio-llm.js'));
const { LLMModel } = await import(url('llm/models.js'));
const { LLMProvider } = await import(url('llm/providers.js'));
const { LLMRuntime } = await import(url('llm/runtimes.js'));
const { LLMConfig } = await import(url('llm/utils/llm-config.js'));
const { Message, MessageRole, ToolCallPayload, ToolResultPayload } = await import(url('llm/utils/messages.js'));

const requests = [];
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  requests.push({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : null });
  res.writeHead(200, {'content-type': 'text/event-stream; charset=utf-8'});
  res.write(`data: ${JSON.stringify({ id:'probe', object:'chat.completion.chunk', created:1, model:'probe', choices:[{ index:0, delta:{ content:'ok' }, finish_reason:null }] })}\n\n`);
  res.write(`data: ${JSON.stringify({ id:'probe', object:'chat.completion.chunk', created:1, model:'probe', choices:[{ index:0, delta:{}, finish_reason:'stop' }] })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';

const llm = new LMStudioLLM(new LLMModel({
  name: 'wire-format-probe', value: 'wire-format-probe', canonicalName: 'wire-format-probe',
  provider: LLMProvider.LMSTUDIO, runtime: LLMRuntime.LMSTUDIO,
  hostUrl: `http://127.0.0.1:${address.port}`,
}), new LLMConfig({ temperature: 0, maxTokens: 16 }));

const messages = [
  new Message(MessageRole.SYSTEM, 'System prompt.'),
  new Message(MessageRole.USER, 'Please inspect the workspace.'),
  new Message(MessageRole.ASSISTANT, { content: null, tool_payload: new ToolCallPayload([{ id:'call_probe_1', name:'run_bash', arguments:{ command:'pwd && ls -la' } }]) }),
  new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload('call_probe_1', 'run_bash', { stdout:'/tmp\n', stderr:'', exitCode:0 }) }),
];
const tools = [{ type:'function', function:{ name:'run_bash', description:'Run a bash command.', parameters:{ type:'object', properties:{ command:{ type:'string' } }, required:['command'], additionalProperties:false } } }];
for await (const _chunk of llm.streamMessages(messages, null, { tools })) {}
await llm.cleanup();
await new Promise((resolve) => server.close(resolve));
const body = requests[0]?.body;
console.log(JSON.stringify({
  embeddedRoot,
  parser: process.env.AUTOBYTEUS_STREAM_PARSER,
  requestCount: requests.length,
  path: requests[0]?.url,
  hasTools: Array.isArray(body?.tools),
  messages: body?.messages,
  containsLegacyToolResultUserText: JSON.stringify(body?.messages ?? []).includes('[TOOL_RESULT]'),
  containsSyntheticToolExecutionUserText: JSON.stringify(body?.messages ?? []).includes('The following tool executions have completed'),
  roleSequence: (body?.messages ?? []).map((m) => m.role),
}, null, 2));
