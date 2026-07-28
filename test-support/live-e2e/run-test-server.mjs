import { persistentTestRuntimeRoot, startBuiltTestServer } from './test-runtime-bootstrap.mjs';

const server = await startBuiltTestServer({ runtimeRoot: persistentTestRuntimeRoot });
process.stdout.write(`TEST_SERVER_READY ${server.serverUrl}\n`);
server.child.stdout.pipe(process.stdout);
server.child.stderr.pipe(process.stderr);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try {
    await server.stop();
  } finally {
    process.exitCode = 0;
  }
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
const close = await new Promise((resolve) => {
  server.child.once('close', (code, signal) => resolve({ code, signal }));
});
if (!stopping && (close.code !== 0 || close.signal !== null)) {
  process.exitCode = close.code && close.code > 0 ? close.code : 1;
}
