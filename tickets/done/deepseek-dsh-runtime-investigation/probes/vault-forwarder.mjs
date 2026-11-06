// Stand-in for the credential proxy against the REAL DeepSeek API. The key is read from the test vault into memory
// only; it is never printed, logged or written. dsh gets only PASS. Strips dsh_session_log / dsh_plugin_packages.
// Usage: node vault-forwarder.mjs <listenPort> <openTestVaultJsPath> <vaultDir> <log.jsonl>   (PASS from env)
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const [port, vaultModule, vaultDir, logPath] = process.argv.slice(2);
const { openTestVaultReader } = await import(pathToFileURL(vaultModule).href);
const reader = await openTestVaultReader(vaultDir);
const key = (await reader.readProviderApiKey("DEEPSEEK")).revealToTrustedConsumer();
reader.close?.();
const log = (o) => fs.appendFileSync(logPath, JSON.stringify(o) + "\n");
log({ started: true, keyLoaded: typeof key === "string" && key.length > 0 });
http.createServer((req, res) => {
  const passOk = req.headers["x-api-key"] === process.env.PASS;
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    if (!passOk) { log({ url: req.url, passOk }); res.writeHead(401, { "content-type": "application/json" }); res.end('{"type":"error","error":{"type":"authentication_error","message":"invalid run pass"}}'); return; }
    let body = Buffer.concat(chunks); let stripped = []; let fp = null;
    try { const j = JSON.parse(body.toString("utf8")); const sys = Array.isArray(j.system) ? j.system.map((b) => b.text ?? "").join(" ") : String(j.system ?? ""); const last = j.messages?.at(-1); const lastText = Array.isArray(last?.content) ? last.content.map((b) => b.text ?? "[" + b.type + "]").join(" ") : String(last?.content ?? ""); fp = { systemStart: sys.slice(0, 90), toolCount: Array.isArray(j.tools) ? j.tools.length : 0, messages: j.messages?.length, lastRole: last?.role, lastStart: lastText.slice(0, 110), maxTokens: j.max_tokens, dshHeaders: Object.fromEntries(Object.entries(req.headers).filter(([k]) => k.startsWith("x-deepseek-harness")).map(([k, v]) => [k, k.endsWith("user-id") ? "<id>" : v])) };
    for (const f of ["dsh_session_log", "dsh_plugin_packages"]) if (f in j) { delete j[f]; stripped.push(f); } body = Buffer.from(JSON.stringify(j)); } catch {}
    const headers = { ...req.headers, "x-api-key": key, host: "api.deepseek.com", "content-length": String(body.length) };
    delete headers["accept-encoding"];
    const t0 = Date.now();
    const up = https.request({ host: "api.deepseek.com", path: req.url, method: req.method, headers }, (upRes) => {
      log({ url: req.url, passOk, stripped, fp, upstreamStatus: upRes.statusCode, contentType: upRes.headers["content-type"] });
      res.writeHead(upRes.statusCode, upRes.headers);
      let sseBuf = ""; const usages = []; let chunks = 0;
      upRes.on("data", (c) => { chunks++; sseBuf += c.toString("utf8"); let i; while ((i = sseBuf.indexOf("\n\n")) >= 0) { const ev = sseBuf.slice(0, i); sseBuf = sseBuf.slice(i + 2); const type = /^event: (.*)$/m.exec(ev)?.[1]; const data = /^data: (.*)$/m.exec(ev)?.[1]; if (!data) continue; try { const j = JSON.parse(data); const u = j.usage ?? j.message?.usage; if (u) usages.push({ type, usage: u }); if (type === "message_delta") usages.push({ type: "stop", stop_reason: j.delta?.stop_reason }); } catch {} } });
      upRes.on("end", () => log({ url: req.url, compact: req.headers["x-deepseek-harness-compact"] === "1", chunks, usages }));
      upRes.pipe(res);
      upRes.on("end", () => log({ url: req.url, upstreamDoneMs: Date.now() - t0 }));
    });
    up.on("error", (e) => { log({ url: req.url, upstreamError: e.code ?? e.message }); res.writeHead(502); res.end(); });
    up.end(body);
  });
}).listen(Number(port), "127.0.0.1");
