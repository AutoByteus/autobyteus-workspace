// API-04 (API/E2E, temporary probe): live HTTP contract of a running studio server bound to 0.0.0.0,
// reached once from loopback (127.0.0.1) and once from the machine's LAN address (non-loopback socket
// address and Host header, the trusted-network client of SCN-A2). Prints one normalised line per
// request so the base (Fastify 4) and branch (Fastify 5) outputs can be diffed.
// Usage: node api-04-live-http-probe.mjs <port> <lan-ip>
import http from "node:http";

const [port, lanIp] = process.argv.slice(2);
if (!port || !lanIp) throw new Error("Usage: node api-04-live-http-probe.mjs <port> <lan-ip>");

const LOOPBACK_ORIGIN = "http://127.0.0.1:3000";
const FOREIGN_ORIGIN = "https://evil.example";
const gql = JSON.stringify({ query: "{ __typename }" });
const ping = JSON.stringify({ jsonrpc: "2.0", id: "p", method: "ping", params: {} });
const json = { "content-type": "application/json", accept: "application/json" };

const cases = [
  ["GET", "/rest/health", {}],
  ["GET", "/rest/remote-access/status", {}],
  ["POST", "/graphql", { "content-type": "application/json" }, gql],
  ["GET", "/graphql?query=%7B__typename%7D", {}],
  ["GET", "/graphiql", {}],
  ["GET", "/graphiql/main.js", {}],
  ["GET", "/graphiql/config.js", {}],
  ["OPTIONS", "/graphql", { origin: "file://", "access-control-request-method": "POST", "access-control-request-headers": "content-type,authorization" }],
  ["POST", "/graphql", { "content-type": "application/json", origin: LOOPBACK_ORIGIN }, gql],
  ["GET", "/rest/media/does-not-exist.png", {}],
  ["GET", "/no-such-route", {}],
  ["POST", "/mcp/gateway", json, ping],
  ["POST", "/mcp/gateway", { ...json, origin: LOOPBACK_ORIGIN }, ping],
  ["POST", "/mcp/gateway", { ...json, origin: FOREIGN_ORIGIN }, ping],
  ["OPTIONS", "/mcp/gateway", { origin: LOOPBACK_ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "content-type" }],
  ["OPTIONS", "/mcp/gateway", { origin: FOREIGN_ORIGIN, "access-control-request-method": "POST" }],
  ["OPTIONS", "/mcp/gateway", {}],
  ["GET", "/mcp/agent-tools/agtrun_not_on_main", {}],
];

const pickHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers)
      .filter(([k]) => k.startsWith("access-control-") || k === "vary" || k === "content-type")
      .map(([k, v]) => [k, k === "content-type" ? String(v).split(";")[0] : v])
      .sort(([a], [b]) => a.localeCompare(b)),
  );

// Bodies are reduced to what is stable across runs: JSON keys and an error code, the GraphQL data,
// or the first characters of non-JSON text.
const summariseBody = (path, text) => {
  try {
    const parsed = JSON.parse(text);
    if (path.startsWith("/graphql")) return JSON.stringify(parsed);
    if (parsed && typeof parsed === "object") {
      const code = parsed.code ?? parsed.error?.code ?? parsed.error ?? null;
      return `json keys=${Object.keys(parsed).sort().join(",")}${code ? ` code=${typeof code === "string" ? code : JSON.stringify(code)}` : ""}`;
    }
    return `json ${JSON.stringify(parsed)}`;
  } catch {
    return text ? `text ${JSON.stringify(text.slice(0, 40))}${text.length > 40 ? "…" : ""} (${text.length > 200 ? ">200" : text.length} chars)` : "empty";
  }
};

const request = (host, [method, path, headers, body]) =>
  new Promise((resolve) => {
    const req = http.request({ host, port: Number(port), method, path, headers: { ...headers, ...(body ? { "content-length": Buffer.byteLength(body) } : {}) } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { text += c; });
      res.on("end", () => resolve({ status: res.statusCode, headers: pickHeaders(res.headers), body: summariseBody(path, text) }));
    });
    req.on("error", (e) => resolve({ error: String(e) }));
    if (body) req.write(body);
    req.end();
  });

const wsHandshake = (host) =>
  new Promise((resolve) => {
    const ws = new WebSocket(`ws://${host}:${port}/graphql`, "graphql-transport-ws");
    const timer = setTimeout(() => { ws.close(); resolve("timeout"); }, 10000);
    ws.onopen = () => ws.send(JSON.stringify({ type: "connection_init", payload: {} }));
    ws.onmessage = (ev) => { clearTimeout(timer); const t = JSON.parse(String(ev.data)).type; ws.close(); resolve(`protocol=${ws.protocol} first=${t}`); };
    ws.onerror = () => { clearTimeout(timer); resolve("error"); };
  });

// A product WebSocket route (`/ws/projects` change feed, which greets each connection): first frame's
// message type and its top-level keys.
const wsFeedGreeting = (host) =>
  new Promise((resolve) => {
    const ws = new WebSocket(`ws://${host}:${port}/ws/projects`);
    const timer = setTimeout(() => { ws.close(); resolve("timeout"); }, 10000);
    ws.onmessage = (ev) => {
      clearTimeout(timer);
      const msg = JSON.parse(String(ev.data));
      ws.close();
      resolve(`first type=${msg.type} keys=${Object.keys(msg).sort().join(",")}`);
    };
    ws.onerror = () => { clearTimeout(timer); resolve("error"); };
  });

// lan-ip "-" skips the LAN pass (a container port published on 127.0.0.1 only).
for (const [label, host] of [["loopback", "127.0.0.1"], ["lan", lanIp]].filter(([, h]) => h !== "-")) {
  for (const c of cases) {
    const r = await request(host, c);
    const desc = `${c[0]} ${c[1]}${c[2].origin ? ` origin=${c[2].origin}` : ""}`;
    console.log(`${label} | ${desc} | ${r.error ?? `status=${r.status} | ${JSON.stringify(r.headers)} | ${r.body}`}`);
  }
  console.log(`${label} | WS /graphql graphql-transport-ws | ${await wsHandshake(host)}`);
  console.log(`${label} | WS /ws/projects | ${await wsFeedGreeting(host)}`);
}
