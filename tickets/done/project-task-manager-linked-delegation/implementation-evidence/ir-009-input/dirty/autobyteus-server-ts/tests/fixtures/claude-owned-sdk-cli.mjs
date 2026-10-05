// Test-owned CLI protocol peer, no model/provider. Run only through the pinned SDK public hook.
import readline from 'node:readline';
const hold = process.env.TEST_OWNED_HOLD_FOR_RELEASE === '1';
if (hold) { setInterval(() => {}, 1_000); process.on('SIGTERM', () => {}); }
const input = readline.createInterface({ input: process.stdin });
input.on('line', line => {
  const frame = JSON.parse(line);
  if (frame.type === 'control_request') process.stdout.write(JSON.stringify({
    type: 'control_response', response: { subtype: 'success', request_id: frame.request_id,
      response: { commands: [], models: [], account: {}, output_style: 'default', available_output_styles: [] } },
  }) + '\n');
});
input.on('close', () => {
  if (hold) return;
  process.stderr.write('final diagnostic €\n');
  setTimeout(() => { process.stdout.end(); process.stderr.end(); }, 25);
});
