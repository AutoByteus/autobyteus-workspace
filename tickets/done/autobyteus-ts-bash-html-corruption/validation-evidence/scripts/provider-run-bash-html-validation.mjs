import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const autobyteusDist = path.join(repoRoot, 'autobyteus-ts/dist');
const evidenceRoot = path.join(repoRoot, 'tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence');
const envPath = path.join(repoRoot, 'autobyteus-ts/.env.test');

function loadEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) return;
  const content = fsSync.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(envPath);

const { OpenAILLM } = await import(path.join(autobyteusDist, 'llm/api/openai-llm.js'));
const { KimiLLM } = await import(path.join(autobyteusDist, 'llm/api/kimi-llm.js'));
const { LLMModel } = await import(path.join(autobyteusDist, 'llm/models.js'));
const { LLMProvider } = await import(path.join(autobyteusDist, 'llm/providers.js'));
const { LLMUserMessage } = await import(path.join(autobyteusDist, 'llm/user-message.js'));
const { LLMConfig } = await import(path.join(autobyteusDist, 'llm/utils/llm-config.js'));
const { ApiToolCallStreamingResponseHandler } = await import(path.join(autobyteusDist, 'agent/streaming/handlers/api-tool-call-streaming-response-handler.js'));
const { OpenAiJsonSchemaFormatter } = await import(path.join(autobyteusDist, 'tools/usage/formatters/openai-json-schema-formatter.js'));
const { defaultToolRegistry } = await import(path.join(autobyteusDist, 'tools/registry/tool-registry.js'));
const { registerRunBashTool } = await import(path.join(autobyteusDist, 'tools/terminal/tools/run-bash.js'));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function classifyProviderAccessError(error) {
  const message = String(error?.message || error).toLowerCase();
  if (message.includes('401') || message.includes('authentication') || message.includes('unauthorized') || message.includes('invalid api key')) return 'invalid_or_missing_credentials';
  if (message.includes('quota') || message.includes('billing') || message.includes('insufficient_quota') || message.includes('insufficient balance') || message.includes('payment required')) return 'quota_or_billing_blocked';
  if (message.includes('429') || message.includes('rate limit') || message.includes('rate_limit')) return 'rate_limited';
  if (message.includes('403') || message.includes('forbidden') || message.includes('permission_denied') || message.includes('access denied') || message.includes('not_found') || message.includes('not found') || message.includes('does not exist') || message.includes('model_not_found') || message.includes('unsupported model') || message.includes('not have access')) return 'model_not_available_or_access_blocked';
  return null;
}

function sanitizeError(error) {
  const message = String(error?.message || error);
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***')
    .replace(/ak-[A-Za-z0-9_-]+/g, 'ak-***')
    .replace(/org-[A-Za-z0-9_-]+/g, 'org-***')
    .replace(/proj-[A-Za-z0-9_-]+/g, 'proj-***')
    .slice(0, 4000);
}

function makeExpectedHtml() {
  const rows = [];
  for (let i = 0; i < 1200; i += 1) {
    rows.push(`<span class="star" data-i="${i}" style="left:${(i * 37) % 100}vw;top:${(i * 53) % 100}vh;animation-delay:${(i % 17) / 10}s"></span>`);
  }
  const enemies = [];
  for (let i = 0; i < 650; i += 1) {
    enemies.push(`{x:${(i * 29) % 1280},y:${(i * 31) % 720},hp:${1 + (i % 7)},vx:${1 + (i % 5)}}`);
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Provider Jet Integrity</title>
<style>html,body{margin:0;background:#031827;color:#dff;height:100%;overflow:hidden;font-family:system-ui}.star{position:absolute;width:2px;height:2px;background:white;border-radius:50%;opacity:.55}canvas{position:fixed;inset:0;width:100vw;height:100vh}#hud{position:fixed;top:1rem;left:1rem;padding:.75rem 1rem;background:rgba(0,0,0,.42);border:1px solid #6ff;border-radius:.75rem}</style></head>
<body><canvas id="game" width="1280" height="720"></canvas><div id="hud">Provider Jet Integrity <b id="score">0</b></div>
${rows.join('\n')}
<script>
const enemies=[${enemies.join(',')}];
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');let tick=0,score=0;function jet(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#7ff';ctx.beginPath();ctx.moveTo(40,0);ctx.lineTo(-24,-18);ctx.lineTo(-10,0);ctx.lineTo(-24,18);ctx.closePath();ctx.fill();ctx.restore()}function frame(){tick++;ctx.clearRect(0,0,1280,720);ctx.fillStyle='rgba(255,96,112,.8)';for(const e of enemies.slice(0,80)){ctx.fillRect((e.x+tick*e.vx)%1280,e.y,14,10)}jet(180+Math.sin(tick/19)*60,360+Math.cos(tick/23)*80);if(tick%13===0)score+=5;document.getElementById('score').textContent=score;requestAnimationFrame(frame)}frame();
console.log('provider-jet-integrity', enemies.length, document.querySelectorAll('.star').length);
</script></body></html>
`;
}

const expectedHtml = makeExpectedHtml();
const expectedHash = sha256(expectedHtml);
const expectedBytes = Buffer.byteLength(expectedHtml, 'utf8');
const command = `node <<'NODE'\nconst fs = require('node:fs');\nconst crypto = require('node:crypto');\nfunction makeExpectedHtml() {\n  const rows = [];\n  for (let i = 0; i < 1200; i += 1) {\n    rows.push(\`<span class="star" data-i="\${i}" style="left:\${(i * 37) % 100}vw;top:\${(i * 53) % 100}vh;animation-delay:\${(i % 17) / 10}s"></span>\`);\n  }\n  const enemies = [];\n  for (let i = 0; i < 650; i += 1) {\n    enemies.push(\`{x:\${(i * 29) % 1280},y:\${(i * 31) % 720},hp:\${1 + (i % 7)},vx:\${1 + (i % 5)}}\`);\n  }\n  return \`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Provider Jet Integrity</title>\n<style>html,body{margin:0;background:#031827;color:#dff;height:100%;overflow:hidden;font-family:system-ui}.star{position:absolute;width:2px;height:2px;background:white;border-radius:50%;opacity:.55}canvas{position:fixed;inset:0;width:100vw;height:100vh}#hud{position:fixed;top:1rem;left:1rem;padding:.75rem 1rem;background:rgba(0,0,0,.42);border:1px solid #6ff;border-radius:.75rem}</style></head>\n<body><canvas id="game" width="1280" height="720"></canvas><div id="hud">Provider Jet Integrity <b id="score">0</b></div>\n\${rows.join('\\n')}\n<script>\nconst enemies=[\${enemies.join(',')}];\nconst canvas=document.getElementById('game'),ctx=canvas.getContext('2d');let tick=0,score=0;function jet(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#7ff';ctx.beginPath();ctx.moveTo(40,0);ctx.lineTo(-24,-18);ctx.lineTo(-10,0);ctx.lineTo(-24,18);ctx.closePath();ctx.fill();ctx.restore()}function frame(){tick++;ctx.clearRect(0,0,1280,720);ctx.fillStyle='rgba(255,96,112,.8)';for(const e of enemies.slice(0,80)){ctx.fillRect((e.x+tick*e.vx)%1280,e.y,14,10)}jet(180+Math.sin(tick/19)*60,360+Math.cos(tick/23)*80);if(tick%13===0)score+=5;document.getElementById('score').textContent=score;requestAnimationFrame(frame)}frame();\nconsole.log('provider-jet-integrity', enemies.length, document.querySelectorAll('.star').length);\n</script></body></html>\n\`;\n}\nconst html = makeExpectedHtml();\nfs.mkdirSync('provider-jet-game', { recursive: true });\nfs.writeFileSync('provider-jet-game/index.html', html, 'utf8');\nconst bytes = Buffer.byteLength(html, 'utf8');\nconst hash = crypto.createHash('sha256').update(html).digest('hex');\nconsole.log('sha256=' + hash);\nconsole.log('bytes=' + bytes);\nNODE`;
const commandHash = sha256(command);

async function runProvider(provider) {
  const runId = `${provider.name}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const workspace = path.join(evidenceRoot, 'workspaces', `provider-${runId}`);
  await fs.mkdir(workspace, { recursive: true });
  defaultToolRegistry.clear();
  const runBashTool = registerRunBashTool();
  const formatter = new OpenAiJsonSchemaFormatter();
  const toolDef = defaultToolRegistry.getToolDefinition('run_bash') ?? runBashTool.definition;
  const tools = [formatter.provide(toolDef)];
  const system = 'You are a deterministic tool-call relay. Use exactly one tool call and preserve command text exactly.';
  const prompt = `Call run_bash exactly once. Use cwd ${JSON.stringify(workspace)} and timeout_seconds 20. The command argument must match this SHA-256 ${commandHash} and must be exactly the text between BEGIN_COMMAND and END_COMMAND.\nBEGIN_COMMAND\n${command}\nEND_COMMAND`;
  const llm = provider.create();
  const handler = new ApiToolCallStreamingResponseHandler({ turnId: `turn-${runId}` });
  const chunks = [];
  let status = 'unknown';
  let providerError = null;
  let invocationSummary = null;
  let executionSummary = null;
  try {
    const userMessage = new LLMUserMessage({ content: `${system}\n\n${prompt}` });
    for await (const chunk of llm.streamUserMessage(userMessage, { tools, tool_choice: 'required', ...(provider.streamKwargs ?? {}) })) {
      chunks.push({
        contentLength: chunk.content?.length ?? 0,
        reasoningLength: chunk.reasoning?.length ?? 0,
        toolCalls: chunk.tool_calls?.map((call) => ({
          index: call.index,
          name: call.name ?? null,
          call_id: call.call_id ?? null,
          arguments_delta_length: call.arguments_delta?.length ?? 0,
          arguments_delta_sha256: call.arguments_delta ? sha256(call.arguments_delta) : null,
          native_context: call.native_context ?? null
        })) ?? [],
        is_complete: Boolean(chunk.is_complete),
        usage: chunk.usage ?? null
      });
      handler.feed(chunk);
    }
    handler.finalize();
    const invocations = handler.getAllInvocations();
    if (invocations.length !== 1 || invocations[0].name !== 'run_bash') {
      status = 'model_tool_call_mismatch';
      invocationSummary = invocations.map((invocation) => ({ name: invocation.name, id: invocation.id, arguments: invocation.arguments }));
    } else {
      const invocation = invocations[0];
      const args = invocation.arguments ?? {};
      const actualCommand = String(args.command ?? '');
      const actualCwd = args.cwd === undefined || args.cwd === null ? null : String(args.cwd);
      const actualTimeout = args.timeout_seconds ?? args.timeoutSeconds ?? null;
      invocationSummary = {
        name: invocation.name,
        id: invocation.id,
        commandLength: actualCommand.length,
        commandSha256: sha256(actualCommand),
        commandExactMatch: actualCommand === command,
        cwd: actualCwd,
        cwdExactMatch: actualCwd === workspace,
        timeout: actualTimeout,
        hasBackgroundArg: Object.prototype.hasOwnProperty.call(args, 'background')
      };
      if (actualCommand !== command || actualCwd !== workspace || Object.prototype.hasOwnProperty.call(args, 'background')) {
        status = 'model_argument_mismatch';
      } else {
        const result = await runBashTool.execute({ workspaceRootPath: workspace, agentId: `provider-${provider.name}` }, { command: actualCommand, cwd: actualCwd, timeout_seconds: Number(actualTimeout ?? 20) });
        const htmlPath = path.join(workspace, 'provider-jet-game/index.html');
        const written = await fs.readFile(htmlPath, 'utf8');
        const actualHash = sha256(written);
        executionSummary = {
          toolResult: result.toJSON?.() ?? result,
          fileRelativePath: 'provider-jet-game/index.html',
          expectedBytes,
          actualBytes: Buffer.byteLength(written, 'utf8'),
          expectedSha256: expectedHash,
          actualSha256: actualHash,
          exactBytesMatch: written === expectedHtml,
          stdoutContainsExpectedHash: String(result.stdout ?? '').includes(`sha256=${expectedHash}`),
          stdoutContainsExpectedBytes: String(result.stdout ?? '').includes(`bytes=${expectedBytes}`)
        };
        status = executionSummary.exactBytesMatch && executionSummary.stdoutContainsExpectedHash && executionSummary.stdoutContainsExpectedBytes && result.exitCode === 0 && !result.timedOut
          ? 'pass'
          : 'runtime_mismatch';
      }
    }
  } catch (error) {
    const classification = classifyProviderAccessError(error);
    status = classification ? `provider_skipped_${classification}` : 'error';
    providerError = sanitizeError(error);
  } finally {
    await llm.cleanup().catch(() => undefined);
  }

  const evidence = {
    provider: provider.name,
    model: provider.model,
    status,
    workspace,
    envPresence: {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      KIMI_API_KEY: Boolean(process.env.KIMI_API_KEY)
    },
    command: {
      expectedCommandLength: command.length,
      expectedCommandSha256: commandHash,
      expectedHtmlBytes: expectedBytes,
      expectedHtmlSha256: expectedHash
    },
    rawChunkSummary: chunks,
    invocationSummary,
    executionSummary,
    providerError
  };
  const evidencePath = path.join(evidenceRoot, 'logs', `provider-run-bash-html-${runId}.json`);
  await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
  return { provider: provider.name, model: provider.model, status, evidencePath, invocationSummary, executionSummary, providerError };
}

const providers = [
  {
    name: 'openai',
    model: 'gpt-5.5',
    streamKwargs: { temperature: 0 },
    create: () => new OpenAILLM(new LLMModel({ name: 'gpt-5.5', value: 'gpt-5.5', canonicalName: 'gpt-5.5', provider: LLMProvider.OPENAI }), new LLMConfig({ temperature: 0 }))
  },
  {
    name: 'kimi',
    model: 'kimi-k2.6',
    streamKwargs: {},
    create: () => new KimiLLM(new LLMModel({ name: 'kimi-k2.6', value: 'kimi-k2.6', canonicalName: 'kimi-k2.6', provider: LLMProvider.KIMI }), new LLMConfig({ temperature: 0.6 }))
  }
];

const selected = process.argv.slice(2);
const activeProviders = selected.length ? providers.filter((p) => selected.includes(p.name)) : providers;
const results = [];
for (const provider of activeProviders) {
  // eslint-disable-next-line no-await-in-loop
  results.push(await runProvider(provider));
}
console.log(JSON.stringify({ status: 'complete', results }, null, 2));
