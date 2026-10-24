// API-05 (API/E2E, temporary probe): multipart upload limits on a running studio server, the way
// the web app uploads (real HTTP, multipart/form-data). For /rest/upload-file (media) and
// /rest/context-files/upload (draft attachments) it sends text/plain files of LIMIT-1, LIMIT,
// LIMIT+1 and LIMIT+1 MiB bytes (LIMIT = CONTEXT_FILE_MAX_BYTES = 25 MiB, the studio's
// multipart fileSize limit) and prints the status, the response's message, and which files of
// at least 1 MiB exist under the server's data dir after the request (persisted or left over).
// Usage: node api-05-upload-limit-probe.mjs <port> <server data dir>
import fs from "node:fs";
import path from "node:path";

const [port, dataDir] = process.argv.slice(2);
if (!port || !dataDir) throw new Error("Usage: node api-05-upload-limit-probe.mjs <port> <data dir>");
const base = `http://127.0.0.1:${port}`;
const LIMIT = 25 * 1024 * 1024;
const sizes = [["LIMIT-1", LIMIT - 1], ["LIMIT", LIMIT], ["LIMIT+1", LIMIT + 1], ["LIMIT+1MiB", LIMIT + 1024 * 1024]];

const largeFiles = () => {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const size = fs.statSync(full).size;
        if (size >= 1024 * 1024) found.push(`${path.relative(dataDir, full).split(path.sep).slice(0, 2).join("/")}/… size=${size}`);
      }
    }
  };
  walk(dataDir);
  return found.sort();
};

const summarise = (text) => {
  try {
    const body = JSON.parse(text);
    if (body.detail !== undefined) return `detail=${JSON.stringify(body.detail)}`;
    return `json keys=${Object.keys(body).sort().join(",")}${body.sizeBytes !== undefined ? ` sizeBytes=${body.sizeBytes}` : ""}`;
  } catch {
    return `text ${JSON.stringify(text.slice(0, 80))}`;
  }
};

const removeLarge = () => {
  // Remove what an accepted upload stored, so every request starts from the same state.
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && fs.statSync(full).size >= 1024 * 1024) fs.rmSync(full);
    }
  };
  walk(dataDir);
};

const routes = [
  ["/rest/upload-file", () => new FormData()],
  ["/rest/context-files/upload", (label) => {
    const form = new FormData();
    form.append("owner", JSON.stringify({ kind: "agent_draft", draftRunId: `api05-${label}` }));
    return form;
  }],
];

for (const [route, makeForm] of routes) {
  for (const [label, size] of sizes) {
    const form = makeForm(label);
    form.append("file", new Blob([new Uint8Array(size).fill(0x61)], { type: "text/plain" }), `api05-${label}.txt`);
    let line;
    try {
      const response = await fetch(`${base}${route}`, { method: "POST", body: form });
      line = `status=${response.status} | ${summarise(await response.text())}`;
    } catch (error) {
      line = `request error ${String(error)}`;
    }
    await new Promise((r) => setTimeout(r, 300));
    console.log(`${route} | ${label} (${size} bytes) | ${line} | files>=1MiB after: ${JSON.stringify(largeFiles())}`);
    removeLarge();
  }
}
