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
  for (const line of fsSync.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2] ?? '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
loadEnvFile(envPath);
process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';

const { AgentConfig } = await import(path.join(autobyteusDist, 'agent/context/agent-config.js'));
const { AgentFactory } = await import(path.join(autobyteusDist, 'agent/factory/agent-factory.js'));
const { AgentInputUserMessage } = await import(path.join(autobyteusDist, 'agent/message/agent-input-user-message.js'));
const { AgentStatus } = await import(path.join(autobyteusDist, 'agent/status/status-enum.js'));
const { OpenAILLM } = await import(path.join(autobyteusDist, 'llm/api/openai-llm.js'));
const { LLMModel } = await import(path.join(autobyteusDist, 'llm/models.js'));
const { LLMProvider } = await import(path.join(autobyteusDist, 'llm/providers.js'));
const { LLMConfig } = await import(path.join(autobyteusDist, 'llm/utils/llm-config.js'));
const { registerRunBashTool } = await import(path.join(autobyteusDist, 'tools/terminal/tools/run-bash.js'));
const { MemoryType } = await import(path.join(autobyteusDist, 'memory/models/memory-types.js'));

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sanitize = (text) => String(text).replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***').replace(/ak-[A-Za-z0-9_-]+/g, 'ak-***').replace(/org-[A-Za-z0-9_-]+/g, 'org-***').replace(/proj-[A-Za-z0-9_-]+/g, 'proj-***').slice(0, 4000);

function makeExpectedHtml() {
  const rows = [];
  for (let i = 0; i < 900; i += 1) rows.push(`<i data-star="${i}" style="left:${(i*19)%100}vw;top:${(i*23)%100}vh"></i>`);
  const data = [];
  for (let i = 0; i < 500; i += 1) data.push(`{x:${(i*17)%1200},y:${(i*41)%680},s:${i%9}}`);
  return `<!doctype html>\n<title>OpenAI Full Agent Jet</title>\n<style>body{margin:0;background:#020b18;color:#cff}i{position:absolute;width:2px;height:2px;background:white}.hud{position:fixed;top:0;left:0;padding:12px}</style>\n<div class="hud">OpenAI Full Agent Jet</div>\n${rows.join('\n')}\n<script>const enemies=[${data.join(',')}];console.log('openai-full-agent-jet', enemies.length, document.querySelectorAll('i').length);</script>\n`;
}
const expectedHtml = makeExpectedHtml();
const expectedHash = sha256(expectedHtml);
const expectedBytes = Buffer.byteLength(expectedHtml, 'utf8');
const command = `node <<'NODE'\nconst fs=require('node:fs');const crypto=require('node:crypto');function makeExpectedHtml(){const rows=[];for(let i=0;i<900;i+=1)rows.push(\`<i data-star="\${i}" style="left:\${(i*19)%100}vw;top:\${(i*23)%100}vh"></i>\`);const data=[];for(let i=0;i<500;i+=1)data.push(\`{x:\${(i*17)%1200},y:\${(i*41)%680},s:\${i%9}}\`);return \`<!doctype html>\\n<title>OpenAI Full Agent Jet</title>\\n<style>body{margin:0;background:#020b18;color:#cff}i{position:absolute;width:2px;height:2px;background:white}.hud{position:fixed;top:0;left:0;padding:12px}</style>\\n<div class="hud">OpenAI Full Agent Jet</div>\\n\${rows.join('\\n')}\\n<script>const enemies=[\${data.join(',')}];console.log('openai-full-agent-jet', enemies.length, document.querySelectorAll('i').length);</script>\\n\`; }const html=makeExpectedHtml();fs.mkdirSync('agent-jet-game',{recursive:true});fs.writeFileSync('agent-jet-game/index.html',html,'utf8');console.log('sha256='+crypto.createHash('sha256').update(html).digest('hex'));console.log('bytes='+Buffer.byteLength(html,'utf8'));\nNODE`;
const commandHash = sha256(command);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const workspace = path.join(evidenceRoot, 'workspaces', `openai-full-agent-${runId}`);
const memoryDir = path.join(evidenceRoot, 'workspaces', `openai-full-agent-memory-${runId}`);
await fs.mkdir(workspace, { recursive: true });
await fs.mkdir(memoryDir, { recursive: true });

let agent = null;
let llm = null;
let status = 'unknown';
let error = null;
let fileSummary = null;
let tracesSummary = null;
try {
  llm = new OpenAILLM(new LLMModel({ name: 'gpt-5.5', value: 'gpt-5.5', canonicalName: 'gpt-5.5', provider: LLMProvider.OPENAI }), new LLMConfig({ temperature: 0 }));
  const runBashTool = registerRunBashTool();
  const config = new AgentConfig(
    'OpenAIFullAgentRunBashHtmlValidation',
    'ValidationAgent',
    'Validates run_bash-only exact HTML creation through the full agent runtime.',
    llm,
    'You are a deterministic tool caller. Use only the run_bash tool. Preserve command text exactly. After the tool result, reply with one short sentence and do not call any more tools.',
    [runBashTool],
    true,
    null,
    null,
    null,
    null,
    null,
    workspace,
    null,
    null,
    null,
    memoryDir
  );
  agent = new AgentFactory().createAgent(config);
  agent.start();
  const startDeadline = Date.now() + 30000;
  while (Date.now() < startDeadline && agent.currentStatus !== AgentStatus.IDLE && agent.currentStatus !== AgentStatus.ERROR) await sleep(100);
  if (agent.currentStatus !== AgentStatus.IDLE) throw new Error(`Agent did not become idle before prompt; status=${agent.currentStatus}`);
  const prompt = `Use run_bash exactly once with cwd ${JSON.stringify(workspace)} and timeout_seconds 20. The command must have SHA-256 ${commandHash} and must be exactly between BEGIN_COMMAND and END_COMMAND.\nBEGIN_COMMAND\n${command}\nEND_COMMAND\nAfter the tool completes, provide a final one-sentence confirmation.`;
  await agent.postUserMessage(new AgentInputUserMessage(prompt));
  const htmlPath = path.join(workspace, 'agent-jet-game/index.html');
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (fsSync.existsSync(htmlPath)) {
      const written = await fs.readFile(htmlPath, 'utf8');
      if (sha256(written) === expectedHash) break;
    }
    if (agent.currentStatus === AgentStatus.ERROR) throw new Error('Agent entered ERROR while waiting for file');
    await sleep(500);
  }
  const written = await fs.readFile(htmlPath, 'utf8');
  fileSummary = { relativePath: 'agent-jet-game/index.html', expectedBytes, actualBytes: Buffer.byteLength(written, 'utf8'), expectedSha256: expectedHash, actualSha256: sha256(written), exactBytesMatch: written === expectedHtml };
  const idleDeadline = Date.now() + 120000;
  while (Date.now() < idleDeadline && agent.currentStatus !== AgentStatus.IDLE && agent.currentStatus !== AgentStatus.ERROR) await sleep(500);
  const rawItems = agent.context.state.memoryManager?.store?.list?.(MemoryType.RAW_TRACE) ?? [];
  tracesSummary = {
    rawTraceCount: rawItems.length,
    traceTypes: [...new Set(rawItems.map((item) => item.traceType))],
    toolCallCount: rawItems.filter((item) => item.traceType === 'tool_call').length,
    toolResultCount: rawItems.filter((item) => item.traceType === 'tool_result').length,
    assistantCount: rawItems.filter((item) => item.traceType === 'assistant').length,
    finalStatus: agent.currentStatus
  };
  status = fileSummary.exactBytesMatch && tracesSummary.toolCallCount >= 1 && tracesSummary.toolResultCount >= 1 && agent.currentStatus === AgentStatus.IDLE ? 'pass' : 'mismatch';
} catch (err) {
  const message = sanitize(err?.message || err);
  if (/429|rate limit|quota|billing|not_found|model|access|403|401/i.test(message)) status = 'provider_skipped_or_blocked';
  else status = 'error';
  error = message;
} finally {
  if (agent) await agent.stop(5).catch(() => undefined);
  if (llm) await llm.cleanup().catch(() => undefined);
}
const evidence = { provider: 'openai', model: 'gpt-5.5', status, workspace, memoryDir, commandSha256: commandHash, commandLength: command.length, fileSummary, tracesSummary, error };
const evidencePath = path.join(evidenceRoot, 'logs', `openai-full-agent-run-bash-html-${runId}.json`);
await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
console.log(JSON.stringify({ status, evidencePath, fileSummary, tracesSummary, error }, null, 2));
