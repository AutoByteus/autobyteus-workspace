import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const repoRoot = process.cwd();
const envPath = path.join(repoRoot, 'autobyteus-ts/.env.test');
if (fss.existsSync(envPath)) {
  const rawEnv = fss.readFileSync(envPath, 'utf8');
  for (const line of rawEnv.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
process.env.AUTOBYTEUS_STREAM_PARSER = process.env.AUTOBYTEUS_STREAM_PARSER || 'api_tool_call';
process.env.AUTOBYTEUS_LOG_LEVEL = process.env.AUTOBYTEUS_LOG_LEVEL || 'info';

const model = process.argv[2] || 'kimi-k2.6';
const label = model.replace(/[^a-zA-Z0-9._-]+/g, '_');
const baseDir = path.resolve('tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/live-agent-runs', label);
const workspace = path.join(baseDir, 'workspace');
const memoryDir = path.join(baseDir, 'memory');
await fs.rm(baseDir, { recursive: true, force: true });
await fs.mkdir(workspace, { recursive: true });
await fs.mkdir(memoryDir, { recursive: true });

function sanitizeText(text) {
  return String(text)
    .replace(/ak-[A-Za-z0-9_-]+/g, 'ak-[REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key[=:]\s*[^\s,]+/gi, 'api_key=[REDACTED]');
}

function sanitizeDeep(value) {
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDeep(v);
    return out;
  }
  return value;
}

const originalConsole = { ...console };
const logStream = fss.createWriteStream(path.join(baseDir, 'console.log'), { flags: 'a' });
for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
  console[method] = (...args) => {
    const rendered = args.map((arg) => {
      if (typeof arg === 'string') return sanitizeText(arg);
      try { return sanitizeText(JSON.stringify(sanitizeDeep(arg))); } catch { return sanitizeText(String(arg)); }
    }).join(' ');
    logStream.write(`[${method}] ${rendered}\n`);
  };
}

const { AgentConfig, AgentFactory, AgentInputUserMessage, AgentEventStream, AgentStatus, LLMFactory } = await import('../../../../autobyteus-ts/dist/index.js');
const { registerRunBashTool } = await import('../../../../autobyteus-ts/dist/tools/terminal/tools/run-bash.js');

function sanitizeEvent(event) {
  const plain = JSON.parse(JSON.stringify(event));
  return sanitizeDeep(plain);
}

async function listFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      const rel = path.relative(root, p);
      if (entry.isDirectory()) await walk(p);
      else {
        const data = await fs.readFile(p);
        out.push({ path: rel, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex'), preview: data.toString('utf8').slice(0, 500) });
      }
    }
  }
  await walk(root);
  return out.sort((a,b)=>a.path.localeCompare(b.path));
}

const events = [];
let finalStatus = null;
let idleSeen = false;
let errorSeen = null;
let agent = null;
let stream = null;
let collectPromise = null;
let error = null;
let turnStartedSeen = false;
let startedAt = new Date().toISOString();
try {
  const llm = await LLMFactory.createLLM(model);
  const runBashTool = registerRunBashTool();
  const systemPrompt = [
    'You are a realistic daily assistant operating in a dedicated workspace.',
    'You have exactly one available tool: run_bash.',
    'When asked to create a file, use run_bash with ordinary Unix shell commands.',
    'Do not use any unavailable tools.',
    'After writing files, verify the file exists and report the path. Keep the workflow concise.'
  ].join(' ');
  const config = new AgentConfig(
    'DailyAssistantRepro',
    'Daily Assistant',
    'Single-tool bash-only repro agent.',
    llm,
    systemPrompt,
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
    [],
    memoryDir
  );
  agent = new AgentFactory().createAgent(config);
  stream = new AgentEventStream(agent);
  collectPromise = (async () => {
    for await (const event of stream.allEvents()) {
      const item = sanitizeEvent(event);
      events.push(item);
      if (item.event_type === 'turn_started') {
        turnStartedSeen = true;
      }
      if (item.event_type === 'agent_status_updated') {
        finalStatus = item.data?.new_status ?? null;
        if (finalStatus === AgentStatus.IDLE && turnStartedSeen) {
          idleSeen = true;
          break;
        }
        if (finalStatus === AgentStatus.ERROR) {
          errorSeen = item;
          break;
        }
      }
    }
  })();
  await agent.postUserMessage(new AgentInputUserMessage('create a jet game in html, put in your own folder'));
  const timeoutMs = Number(process.env.REPRO_AGENT_TIMEOUT_MS || 240000);
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs));
  await Promise.race([collectPromise, timeoutPromise]);
  finalStatus = agent.currentStatus;
  await agent.stop(20).catch(()=>undefined);
  await llm.cleanup().catch(()=>undefined);
} catch (e) {
  error = sanitizeDeep({ message: e?.message ?? String(e), stack: e?.stack ?? null });
  if (agent) await agent.stop(10).catch(()=>undefined);
} finally {
  if (stream) await stream.close().catch(()=>undefined);
  if (collectPromise) await Promise.race([collectPromise.catch(()=>undefined), new Promise(r=>setTimeout(r, 1000))]);
}

const files = await listFiles(workspace);
const report = {
  startedAt,
  completedAt: new Date().toISOString(),
  model,
  workspace,
  memoryDir,
  env: {
    AUTOBYTEUS_STREAM_PARSER: process.env.AUTOBYTEUS_STREAM_PARSER,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    hasKimiKey: Boolean(process.env.KIMI_API_KEY)
  },
  finalStatus,
  idleSeen,
  errorSeen,
  error,
  eventCount: events.length,
  events,
  files
};
await fs.writeFile(path.join(baseDir, 'report.json'), JSON.stringify(sanitizeDeep(report), null, 2));
logStream.end();
originalConsole.log(JSON.stringify(sanitizeDeep({ model, finalStatus, idleSeen, error: error?.message ?? null, eventCount: events.length, files: files.map(f => ({ path:f.path, bytes:f.bytes, sha256:f.sha256, preview:f.preview.slice(0,120) })) }), null, 2));
