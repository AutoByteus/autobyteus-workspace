// Fake Anthropic-Messages endpoint for dsh (no real model). Logs each request body.
// Usage: node mock-anthropic.mjs <port> <requests.jsonl>
import http from "node:http";
import fs from "node:fs";
const [port, logPath] = process.argv.slice(2);
let n = 0;
const sse = (res, events) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  for (const [type, data] of events) res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  res.end();
};
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    fs.appendFileSync(logPath, JSON.stringify({ n, method: req.method, url: req.url, headerNames: Object.keys(req.headers), upstreamKeyOk: req.headers["x-api-key"] === process.env.EXPECT_KEY, body: (() => { try { return JSON.parse(body); } catch { return body; } })() }) + "\n");
    if (!req.url.includes("/messages")) { res.writeHead(404); res.end(); return; }
    const msg = { id: `msg_${n}`, type: "message", role: "assistant", model: "deepseek-v4-flash", content: [], stop_reason: null, usage: { input_tokens: 1200, output_tokens: 1 } };
    const parsed = (() => { try { return JSON.parse(body); } catch { return {}; } })();
    const last = parsed.messages?.at(-1);
    const hasToolResult = Array.isArray(last?.content) && last.content.some((b) => b.type === "tool_result");
    n += 1;
    if (!hasToolResult) {
      sse(res, [
        ["message_start", { message: msg }],
        ["content_block_start", { index: 0, content_block: { type: "text", text: "" } }],
        ["content_block_delta", { index: 0, delta: { type: "text_delta", text: "I will run a command." } }],
        ["content_block_stop", { index: 0 }],
        ["content_block_start", { index: 1, content_block: { type: "tool_use", id: "toolu_probe_1", name: "bash", input: {} } }],
        ["content_block_delta", { index: 1, delta: { type: "input_json_delta", partial_json: JSON.stringify({ description: "Write a probe file", command: process.env.MOCK_COMMAND ?? "echo probe-output > out.txt && cat out.txt", ...(process.env.MOCK_ESCALATE ? { sandbox_permissions: "danger-full-access", justification: "Probe needs to write outside the workspace." } : {}) }) } }],
        ["content_block_stop", { index: 1 }],
        ["message_delta", { delta: { stop_reason: "tool_use" }, usage: { output_tokens: 42 } }],
        ["message_stop", {}],
      ]);
    } else {
      sse(res, [
        ["message_start", { message: { ...msg, usage: { input_tokens: 1300, output_tokens: 1 } } }],
        ["content_block_start", { index: 0, content_block: { type: "text", text: "" } }],
        ["content_block_delta", { index: 0, delta: { type: "text_delta", text: "Done: " } }],
        ["content_block_delta", { index: 0, delta: { type: "text_delta", text: "the command ran." } }],
        ["content_block_stop", { index: 0 }],
        ["message_delta", { delta: { stop_reason: "end_turn" }, usage: { output_tokens: 7 } }],
        ["message_stop", {}],
      ]);
    }
  });
}).listen(Number(port), "127.0.0.1", () => console.log(`mock on ${port}`));
