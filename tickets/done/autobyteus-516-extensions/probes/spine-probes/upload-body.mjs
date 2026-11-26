// Probe: can a 3 MB WAV (30 s of mono 16-bit at 48 kHz, the recorder's real format) reach a Fastify 5 route?
// Run with: NODE_PATH=<server node_modules> node upload-body.mjs <path to fastify package>
const Fastify = (await import(process.argv[2])).default;
const wav = Buffer.alloc(30 * 48000 * 2 + 44, 1);
const app = Fastify();
app.post('/default', async (req) => ({ got: req.body?.length ?? null }));
await app.register(async (scope) => {
  scope.addContentTypeParser('audio/wav', { parseAs: 'buffer', bodyLimit: 64 * 1024 * 1024 }, (_req, body, done) => done(null, body));
  scope.post('/with-limit', async (req) => ({ got: req.body.length }));
});
for (const path of ['/default', '/with-limit']) {
  const r = await app.inject({ method: 'POST', url: path, headers: { 'content-type': 'audio/wav' }, payload: wav });
  console.log(`${path}: ${r.statusCode} ${r.body.slice(0, 80)}`);
}
