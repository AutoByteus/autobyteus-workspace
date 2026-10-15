/** Task-owned native SDK capability probe. No application production file is patched.
 * Owned project and private plugin only; default permission mode remains enabled.
 * JSON-line protocol: ready, turn receipts, close. No environment/auth/debug dump.
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

const [root, pluginRoot, executable, resumeId] = process.argv.slice(2);
const pluginName = 'autobyteus-fixture';
const skill = `${pluginName}:read-proof`;
const sessionId = resumeId || randomUUID();
const report = value => process.stdout.write(JSON.stringify(value) + '\n');
let current = null, stopped = false, receiver = null;
const queue = [];
const input = {
  [Symbol.asyncIterator]() { return this; },
  next() {
    if (queue.length) return Promise.resolve({ value: queue.shift(), done: false });
    if (stopped) return Promise.resolve({ done: true });
    return new Promise(resolve => { receiver = resolve; });
  },
};
const enqueue = prompt => {
  const value = { type: 'user', message: { role: 'user', content: prompt },
    parent_tool_use_id: null, session_id: sessionId };
  if (receiver) { const resolve = receiver; receiver = null; resolve({ value, done: false }); }
  else queue.push(value);
};
const within = (value, parent) => typeof value === 'string' &&
  (path.resolve(root, value) === parent || path.resolve(root, value).startsWith(parent + path.sep));
const mayUse = (name, args) => {
  if (name === 'Skill') return args.skill === skill;
  if (name === 'Read') return within(args.file_path, root) || within(args.file_path, pluginRoot);
  if (name === 'Write' || name === 'Edit') return within(args.file_path, root);
  return false; // no Bash, network, delegate, or unrelated private-home reads
};
const sdk = query({
  prompt: input,
  options: {
    model: 'haiku', cwd: root, pathToClaudeCodeExecutable: executable,
    ...(resumeId ? { resume: resumeId } : { sessionId }),
    permissionMode: 'default',
    tools: ['Read', 'Write', 'Edit', 'Skill'],
    settingSources: ['user', 'project', 'local'],
    plugins: [{ type: 'local', path: pluginRoot }],
    maxTurns: 20,
    systemPrompt: 'Perform requested real filesystem operations using native tools. ' +
      'Only the owned workspace and configured fixture plugin are authorized. ' +
      'Never read home, credentials, environment or network. Report exact results; do not simulate.',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(ANTHROPIC_|CLAUDE_CODE_USE_|AWS_|AZURE_|GOOGLE_|AUTOBYTEUS_)/.test(key))),
    canUseTool: async (name, args) => mayUse(name, args)
      ? { behavior: 'allow', updatedInput: args }
      : { behavior: 'deny', message: 'Outside task-owned native capability scope' },
    stderr: data => { // Keep diagnostic text, but refuse obvious credential fragments.
      if (/accessToken|refreshToken|sk-ant-|Bearer\s|eyJ[A-Za-z0-9_-]{20}/.test(data)) return;
      process.stderr.write(data);
    },
  },
});
const reader = createInterface({ input: process.stdin });
reader.on('line', line => {
  try {
    const cmd = JSON.parse(line);
    if (cmd.action === 'turn') {
      if (current) throw new Error('turn already pending');
      current = { label: cmd.label, events: [], permissions: 'default with task-owned allow callback' };
      enqueue(cmd.prompt);
    } else if (cmd.action === 'close') {
      stopped = true;
      if (receiver) { receiver({ done: true }); receiver = null; }
      sdk.close(); reader.close();
    }
  } catch (error) { report({ event: 'ERROR', message: String(error) }); process.exitCode = 1; }
});
try {
  const initialized = await sdk.initializationResult();
  const commands = await sdk.supportedCommands();
  report({ event: 'READY', sessionId, cwdRequested: root,
    configuredPlugins: [{name: pluginName, path: pluginRoot}], commands,
    pluginsApplied: initialized.plugins_applied, publicInitializationKeys: Object.keys(initialized),
    readinessEvidence: 'public SDK control initialization + discovered commands; native system/init checked on first turn' });
  for await (const message of sdk) {
    if (current && (['assistant', 'user', 'result'].includes(message.type) || (message.type === 'system' && message.subtype === 'init'))) {
      current.events.push(message);
    }
    if (current && message.type === 'result') {
      const receipt = current; current = null;
      report({ event: 'TURN_COMPLETED', ...receipt, resultError: Boolean(message.is_error) });
    }
  }
} catch (error) {
  if (!stopped) { report({ event: 'ERROR', message: String(error) }); process.exitCode = 1; }
} finally { reader.close(); sdk.close(); }
