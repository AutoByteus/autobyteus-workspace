#!/usr/bin/env node
// autobyteus-484 probe: value-match leak scan. Reads every configured test-vault secret in memory and reports
// which files under the given roots contain one (raw, base64 or base64url). Prints secret IDs, paths and counts
// only, never a value or a fragment of one. Needs AUTOBYTEUS_TEST_VAULT and an autobyteus-ts build:
//
//   AUTOBYTEUS_TEST_VAULT=<dir> node leak-scan.mjs --autobyteus-ts=<autobyteus-ts package dir> <root>...
//
// In the server image the package is found automatically under /opt/autobyteus/server-package.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const pkgArg = args.find((a) => a.startsWith("--autobyteus-ts="))?.slice("--autobyteus-ts=".length);
const roots = args.filter((a) => !a.startsWith("--"));
const findPackage = () => {
  if (pkgArg) return path.resolve(pkgArg);
  const pnpm = "/opt/autobyteus/server-package/node_modules/.pnpm";
  const dir = fs.readdirSync(pnpm).find((d) => d.startsWith("autobyteus-ts@"));
  return path.join(pnpm, dir, "node_modules", "autobyteus-ts");
};
const vaultDir = process.env.AUTOBYTEUS_TEST_VAULT;
if (!vaultDir || roots.length === 0) { console.error("usage: AUTOBYTEUS_TEST_VAULT=<dir> node leak-scan.mjs <root>..."); process.exit(2); }

const dist = path.join(findPackage(), "dist", "secrets", "vault");
const { openVerifiedTestVault } = await import(pathToFileURL(path.join(dist, "open-test-vault.js")).href);
const { readSecretEntry } = await import(pathToFileURL(path.join(dist, "read-secret-entry.js")).href);
const { FIXED_PROVIDER_SECRET_IDS } = await import(pathToFileURL(path.join(dist, "provider-secret-id.js")).href);

const ids = [...new Set([...FIXED_PROVIDER_SECRET_IDS, "search.serpapi.api-key", "search.serper.api-key",
  "search.vertex-ai.api-key", "test.github.token"])];
const vault = await openVerifiedTestVault(vaultDir);
const needles = [];
for (const id of ids) {
  try {
    const value = (await readSecretEntry(vault.store, vault.rootKey, vault.metadata, id)).revealToTrustedConsumer();
    for (const form of [value, Buffer.from(value).toString("base64"), Buffer.from(value).toString("base64url")]) {
      needles.push({ id, bytes: Buffer.from(form) });
    }
  } catch { /* not configured */ }
}
vault.close();

const hits = new Map();
let files = 0;
let bytes = 0;
const vaultReal = fs.realpathSync(vaultDir);
const walk = (p) => {
  let st;
  try { st = fs.lstatSync(p); } catch { return; }
  if (st.isSymbolicLink()) return;
  if (st.isDirectory()) {
    if (fs.realpathSync(p) === vaultReal || p.startsWith("/proc") || p.startsWith("/sys")) return;
    let entries = [];
    try { entries = fs.readdirSync(p); } catch { return; }
    for (const e of entries) walk(path.join(p, e));
    return;
  }
  if (!st.isFile() || st.size > 200 * 1024 * 1024) return;
  let buf;
  try { buf = fs.readFileSync(p); } catch { return; }
  files += 1; bytes += buf.length;
  for (const n of needles) {
    if (buf.indexOf(n.bytes) !== -1) {
      const list = hits.get(n.id) ?? new Set(); list.add(p); hits.set(n.id, list);
    }
  }
  buf.fill(0);
};
for (const root of roots) walk(path.resolve(root));
// --proc-environ: which running processes hold a secret in their environment (counts by command name only).
const envHolders = [];
if (args.includes("--proc-environ")) {
  for (const pid of fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
    let env;
    try { env = fs.readFileSync(`/proc/${pid}/environ`); } catch { continue; }
    const holds = [...new Set(needles.filter((n) => env.indexOf(n.bytes) !== -1).map((n) => n.id))];
    env.fill(0);
    if (holds.length) {
      let comm = "?";
      try { comm = fs.readFileSync(`/proc/${pid}/comm`, "utf8").trim(); } catch { /* gone */ }
      envHolders.push(`${comm}(${pid}): ${holds.join(",")}`);
    }
  }
  console.log(`process environments holding a secret: ${envHolders.length ? envHolders.join("; ") : "none"}`);
}
for (const n of needles) n.bytes.fill(0);

console.log(`scanned ${files} files (${(bytes / 1048576).toFixed(1)} MiB) for ${new Set(needles.map((n) => n.id)).size} configured secrets`);
if (hits.size === 0) console.log("LEAK_SCAN CLEAN");
for (const [id, paths] of hits) for (const p of paths) console.log(`LEAK_SCAN HIT ${id} in ${p}`);
process.exitCode = hits.size === 0 ? 0 : 3;
