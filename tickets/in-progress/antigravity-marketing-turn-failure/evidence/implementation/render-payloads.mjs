import fs from 'node:fs/promises';
import { AgyStreamEventConverter } from '../../../../../autobyteus-server-ts/dist/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js';
import { AgentRunEventMessageMapper } from '../../../../../autobyteus-server-ts/dist/services/agent-streaming/agent-run-event-message-mapper.js';
import { resolveClaudeTurnTerminalError } from '../../../../../autobyteus-server-ts/dist/agent-execution/backends/claude/session/claude-session-output-events.js';
const mapper = new AgentRunEventMessageMapper();
const cases = [
  ['quota', 'Individual quota reached for this model. Resets in 3h28m50s.'],
  ['unfamiliar', { message: 'Workspace service temporarily unavailable. Try again later.' }],
  ['markup', '<img src=x onerror=alert("runtime")> Read limit reached. token=PRIVATE_TOKEN'],
  ['fallback', { message: 42 }],
].map(([name, error]) => {
  const converter = new AgyStreamEventConverter('render-owned-run', 'render-owned-conversation', 'test-model');
  converter.startTurn(`render-owned-${name}`);
  const [event] = converter.convert({ event: 'result', result: {
    conversation_id: 'render-owned-conversation', status: 'ERROR', error, response: 'PRIVATE_RESPONSE_MARKER',
  } });
  return { name, payload: mapper.map(event).payload };
});
const claude = resolveClaudeTurnTerminalError({ type: 'result', is_error: true,
  errors: ['Rate limit reached.', 'Try again later. token=PRIVATE_CLAUDE_TOKEN'] });
cases.push({ name: 'claude', payload: { code: claude.code, message: claude.message,
  turn_id: 'render-owned-claude', error_scope: 'turn', error_effect: 'terminal' } });
await fs.writeFile(new URL('./render-payloads.json', import.meta.url), JSON.stringify(cases, null, 2) + '\n');
