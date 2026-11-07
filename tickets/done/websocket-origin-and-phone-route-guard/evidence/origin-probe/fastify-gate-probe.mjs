// Probe: does a root onRequest gate refuse WS upgrades (403, handler not run) on Fastify 5 + @fastify/websocket 11,
// including routes registered before the hook and inside prefixed plugins? How does @fastify/cors's delegator interplay?
import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const fastify = require("fastify"); const websocket = require("@fastify/websocket"); const cors = require("@fastify/cors");
const WebSocket = require("ws");
const calls = [];
const app = fastify();
// Route registered BEFORE cors/gate (like registerMcpGatewayRoutes)
await app.register(async (a) => { a.post("/early", async () => { calls.push("early"); return { ok: 1 }; }); });
await app.register(cors, { delegator: (req, cb) => cb(null, { origin: req.headers.origin === "http://localhost:3000" ? req.headers.origin : false, methods: ["GET","POST","OPTIONS"] }) });
await app.register(websocket);
app.addHook("onRequest", async (request, reply) => {
  const o = request.headers.origin;
  if (o && o !== "http://localhost:3000" && o !== "file://") return reply.code(403).send({ code: "REMOTE_ACCESS_ORIGIN_REFUSED" });
});
app.get("/ws/test", { websocket: true }, (socket) => { calls.push("ws/test"); socket.close(1000, "ok"); });
await app.register(async (r) => { r.get("/remote/obs", { websocket: true }, (socket) => { calls.push("rest/remote/obs"); socket.close(1000, "ok"); }); }, { prefix: "/rest" });
await app.listen({ port: 0, host: "127.0.0.1" });
const port = app.server.address().port;
const tryWs = (path, origin) => new Promise((res) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, origin ? { origin } : {});
  ws.on("open", () => { ws.close(); res("open"); });
  ws.on("unexpected-response", (_req, resp) => { let b=""; resp.on("data", d=>b+=d); resp.on("end", ()=>res(`http ${resp.statusCode} ${b}`)); });
  ws.on("error", (e) => res("error " + e.message));
});
const out = {};
for (const [p,o] of [["/ws/test","https://evil.example"],["/ws/test","null"],["/ws/test",null],["/ws/test","file://"],["/rest/remote/obs","https://evil.example"],["/rest/remote/obs",null]]) out[`${p} origin=${o}`] = await tryWs(p,o);
const early = await app.inject({ method: "POST", url: "/early", headers: { origin: "https://evil.example", "content-type": "application/json" }, payload: "{}" });
out["POST /early evil"] = `${early.statusCode} acao=${early.headers["access-control-allow-origin"]}`;
const preEvil = await app.inject({ method: "OPTIONS", url: "/early", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } });
out["OPTIONS evil"] = `${preEvil.statusCode} acao=${preEvil.headers["access-control-allow-origin"]}`;
const preDev = await app.inject({ method: "OPTIONS", url: "/early", headers: { origin: "http://localhost:3000", "access-control-request-method": "POST", "access-control-request-headers": "content-type" } });
out["OPTIONS dev"] = `${preDev.statusCode} acao=${preDev.headers["access-control-allow-origin"]} ah=${preDev.headers["access-control-allow-headers"]}`;
out.handlerCalls = calls;
console.log(JSON.stringify(out, null, 1));
await app.close();
