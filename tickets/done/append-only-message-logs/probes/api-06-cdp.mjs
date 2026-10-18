#!/usr/bin/env node
// API-06 (append-only-message-logs): minimal Chrome DevTools Protocol driver for an isolated AutoByteus instance window
// (the renderer tab whose URL contains `/renderer/index.html`), attached through the instance's loopback control port only.
// Usage:
//   node api-06-cdp.mjs <controlPort> eval '<async js expression returning JSON-serializable>'
//   node api-06-cdp.mjs <controlPort> screenshot <output.png>
// Uses Node 22's global WebSocket; never launches a browser.
import fs from "node:fs/promises";

const [port, command, arg] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((target) => target.type === "page" && String(target.url).includes("/renderer/index.html"));
if (!page) throw new Error(`No renderer tab on control port ${port}: ${JSON.stringify(targets.map((t) => t.url))}`);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
});
const send = (method, params = {}) => new Promise((resolve) => { const id = ++nextId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });

if (command === "eval") {
  const result = await send("Runtime.evaluate", { expression: `(async () => (${arg}))()`, awaitPromise: true, returnByValue: true });
  if (result.result?.exceptionDetails) { console.error(JSON.stringify(result.result.exceptionDetails)); process.exitCode = 1; }
  else console.log(JSON.stringify(result.result?.result?.value ?? null, null, 2));
} else if (command === "screenshot") {
  const result = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(arg, Buffer.from(result.result.data, "base64"));
  console.log(arg);
} else throw new Error(`unknown command ${command}`);
socket.close();
