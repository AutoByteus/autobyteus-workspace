// Minimal OpenAI-compatible endpoint used as a custom provider for live validation.
// Records every chat request body so the system prompt the runtime sent can be asserted.
import http from 'node:http'; import fs from 'node:fs';
const [port, recordFile] = [Number(process.argv[2]), process.argv[3]];
const MODEL = 'rsam-fake-model';
let n = 0;
http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => { body += d; });
  req.on('end', () => {
    if (req.method === 'GET' && /\/models$/.test(req.url)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ object: 'list', data: [{ id: MODEL, object: 'model', owned_by: 'rsam' }] }));
    }
    if (req.method === 'POST' && /\/chat\/completions$/.test(req.url)) {
      const parsed = JSON.parse(body || '{}'); n += 1;
      fs.appendFileSync(recordFile, JSON.stringify({ n, at: new Date().toISOString(), body: parsed }) + '\n');
      const content = `RSAM_FAKE_REPLY_${n}`;
      const usage = { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 };
      if (parsed.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        const base = { id: `chatcmpl-rsam-${n}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: MODEL };
        res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ ...base, choices: [], usage })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ id: `chatcmpl-rsam-${n}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: MODEL,
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }], usage }));
    }
    fs.appendFileSync(recordFile, JSON.stringify({ unhandled: `${req.method} ${req.url}` }) + '\n');
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":{"message":"not found"}}');
  });
}).listen(port, '127.0.0.1', () => console.log(`fake openai listening on ${port}`));
