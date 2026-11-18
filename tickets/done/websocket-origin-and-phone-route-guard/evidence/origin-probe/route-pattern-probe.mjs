// Probe: request.routeOptions.url in a root onRequest hook (WS upgrade, incl. mercurius /graphql) and inside a WS handler.
import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const fastify = require("fastify"); const websocket = require("@fastify/websocket"); const mercurius = require("mercurius"); const WebSocket = require("ws");
const seen = [];
const app = fastify(); await app.register(websocket);
app.addHook("onRequest", async (req) => { seen.push(["hook", req.url, req.routeOptions?.url]); });
app.get("/ws/terminal/:sessionId", { websocket: true }, (socket, req) => { seen.push(["handler", req.url, req.routeOptions?.url]); socket.close(); });
await app.register(mercurius, { schema: "type Query { a: Int }", path: "/graphql", subscription: true });
await app.listen({ port: 0, host: "127.0.0.1" }); const port = app.server.address().port;
const go = (p, proto) => new Promise((r) => { const w = new WebSocket(`ws://127.0.0.1:${port}${p}`, proto); w.on("open", () => { w.close(); r(); }); w.on("error", r); w.on("unexpected-response", () => r()); });
await go("/ws/terminal/abc?access_token=mra_x"); await go("/graphql", "graphql-transport-ws");
await new Promise((r) => setTimeout(r, 200));
console.log(JSON.stringify(seen)); await app.close();
