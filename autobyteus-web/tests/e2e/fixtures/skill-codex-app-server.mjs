#!/usr/bin/env node
// External Codex process surrogate only. Real server client, adapter, catalog and links are used.
// No inference, credentials, network, or tool execution. Records the bytes exposed to each new thread.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
const log = process.env.SKILL_SOURCE_PROVIDER_RECORD;
if (!log) throw new Error('Owned fixture record is required');
const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
const notify = (method, params) => send({ jsonrpc: '2.0', method, params });
const record = (method, params) => {
  const skill = path.join(process.cwd(), '.codex', 'skills', 'web-writer', 'SKILL.md');
  const content = fs.existsSync(skill) ? fs.readFileSync(skill, 'utf8') : null;
  fs.appendFileSync(log, JSON.stringify({ method, cwd: process.cwd(), threadId: params.threadId, content }) + '\n'); return content;
};
readline.createInterface({ input: process.stdin }).on('line', line => {
  const msg = JSON.parse(line); if (msg.id === undefined) return;
  const p = msg.params || {}; let result = {};
  switch (msg.method) {
    case 'initialize': result = { userAgent: 'skill-source-test-fixture' }; break;
    case 'model/list': result = { data: [{ id: 'skill-fixture-model', model: 'skill-fixture-model', displayName: 'Skill fixture model', isDefault: true }], nextCursor: null }; break;
    case 'account/read': result = { account: { type: 'chatgpt', email: 'fixture@example.invalid', planType: 'test' }, requiresOpenaiAuth: false }; break;
    case 'skills/list': result = { data: [{ cwd: process.cwd(), skills: [] }] }; break;
    case 'thread/start': record(msg.method, p); result = { thread: { id: crypto.randomUUID() } }; break;
    case 'thread/resume': result = { thread: { id: p.threadId } }; break;
    case 'turn/start': {
      const content = record(msg.method, p); const id = crypto.randomUUID();
      result = { turn: { id, status: 'inProgress', items: [] } };
      setTimeout(() => {
        const params = { threadId: p.threadId, turnId: id };
        notify('turn/started', { threadId: p.threadId, turn: { id, status: 'inProgress' } });
        const item = { id: crypto.randomUUID(), type: 'agentMessage', text: content?.includes('version 2') ? 'SKILL_VERSION_TWO' : 'SKILL_VERSION_ONE' };
        notify('item/started', { ...params, item: { ...item, text: '' } });
        notify('item/agentMessage/delta', { ...params, itemId: item.id, delta: item.text });
        notify('item/completed', { ...params, item });
        notify('turn/completed', { threadId: p.threadId, turn: { id, status: 'completed', items: [item] } });
      }, 75); break;
    }
    case 'thread/unsubscribe': case 'turn/interrupt': break;
    default: send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Unsupported fixture method ' + msg.method } }); return;
  }
  send({ jsonrpc: '2.0', id: msg.id, result });
});
