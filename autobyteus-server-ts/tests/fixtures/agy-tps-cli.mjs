#!/usr/bin/env node
/** Scripted, NOT provider inference. Three same-turn AGY model calls (end-to-end, generation,
 * and one below the TPS minimum sample) around a real test-owned file read, mirroring a
 * tool-using agent. No credentials/network.
 * Used by tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts. */
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';
const arg = name => process.argv[process.argv.indexOf(name) + 1];
if (process.argv[2] === '--version') console.log('agy version 1.2.16');
else if (process.argv[2] === '--help') console.log('--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions');
else if (process.argv[2] === 'models') console.log('gemini-3.8-flash-low\tScripted TPS model');
else {
  const conversation_id = process.argv.includes('--conversation') ? arg('--conversation') : randomUUID();
  const emit = value => console.log(JSON.stringify(value));
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  emit({ event: 'init', conversation_id, init: { agent: arg('--agent'), model: arg('--model'),
    cwd: process.cwd(), permission_mode: 'always-proceed', tools: [] } });
  let turn = 0;
  for await (const line of readline.createInterface({ input: process.stdin })) {
    if (!line.trim()) continue;
    const content = JSON.parse(line).message.content;
    const base = ++turn * 100;
    const step = (index, state, extra) => emit({ event: 'step_update', step_update: {
      conversation_id, step_index: base + index, step_type: 'agent_response', state, ...extra } });
    const usage = (output, thinking) => ({ input_tokens: 1000, cache_read_tokens: 100,
      output_tokens: output, thinking_tokens: thinking, total_tokens: 1000 + output });
    // Call 1: thinking, so TPS is AGY's own fractional step duration (end to end).
    step(1, 'DONE', { text_delta: 'TPS_CALL_1', duration_seconds: 2.673724, usage: usage(999, 5) });
    const tool = { conversation_id, step_index: base + 2, step_type: 'tool', tool_name: 'view_file' };
    const file = content.replace('TPS_READ:', '').trim();
    emit({ event: 'step_update', step_update: { ...tool, state: 'ACTIVE', tool_info: { parameters: { AbsolutePath: file } } } });
    const output = await readFile(file, 'utf8');
    await pause(1200);
    emit({ event: 'step_update', step_update: { ...tool, state: 'DONE', tool_info: { output } } });
    // Call 3: no thinking and streamed text, so TPS is generation speed (first text_delta -> DONE).
    step(3, 'ACTIVE', { text_delta: 'TPS_CALL_3 ' });
    await pause(900);
    step(3, 'DONE', { text_delta: 'done', duration_seconds: 1.5, usage: usage(200, 0) });
    // Call 4: below the minimum sample, so it carries no TPS and the card keeps call 3.
    step(4, 'DONE', { text_delta: 'TPS_CALL_4', duration_seconds: 0.8, usage: usage(12, 0) });
    emit({ event: 'result', result: { conversation_id, status: 'SUCCESS', response: 'TPS_COMPLETE' } });
  }
}
