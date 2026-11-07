// Disposable validation of the personal-settings data contract (autobyteus-95).
// Reads package trees read-only; writes nothing outside /tmp/sd-contract-95.
// Usage: node validate-contract.mjs <baseRoot> <newRoot> [localRoot...]
import fs from "node:fs";
import path from "node:path";

const [baseRoot, newRoot, ...localRoots] = process.argv.slice(2);
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failures++; };

// ---- Contract: identity (the existing definition-ID rules) ----
const enc = encodeURIComponent;
const dirs = (p) => (fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name) : []);
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

/** Every definition in one package root: { key, kind, configPath }. */
function definitionsOf(root) {
  const out = [];
  const add = (kind, id, configPath) => { if (fs.existsSync(configPath)) out.push({ key: `${kind}:${id}`, kind, configPath }); };
  for (const a of dirs(path.join(root, "agents"))) add("agent", a, path.join(root, "agents", a, "agent-config.json"));
  for (const t of dirs(path.join(root, "agent-teams"))) {
    add("agent_team", t, path.join(root, "agent-teams", t, "team-config.json"));
    for (const a of dirs(path.join(root, "agent-teams", t, "agents"))) add("agent", `team-local-agent:${enc(t)}:${enc(a)}`, path.join(root, "agent-teams", t, "agents", a, "agent-config.json"));
  }
  for (const o of dirs(path.join(root, "agent-orgs"))) {
    add("agent_org", o, path.join(root, "agent-orgs", o, "org-config.json"));
    for (const a of dirs(path.join(root, "agent-orgs", o, "agents"))) add("agent", `agent-org-owned-agent:${enc(o)}:${enc(a)}`, path.join(root, "agent-orgs", o, "agents", a, "agent-config.json"));
    for (const t of dirs(path.join(root, "agent-orgs", o, "agent-teams"))) {
      const teamId = `agent-org-owned-team:${enc(o)}:${enc(t)}`;
      add("agent_team", teamId, path.join(root, "agent-orgs", o, "agent-teams", t, "team-config.json"));
      for (const a of dirs(path.join(root, "agent-orgs", o, "agent-teams", t, "agents"))) add("agent", `team-local-agent:${enc(teamId)}:${enc(a)}`, path.join(root, "agent-orgs", o, "agent-teams", t, "agents", a, "agent-config.json"));
    }
  }
  return out;
}

// ---- Contract: record shape and tolerant reader ----
const FIELDS = {
  agent: ["toolsAdded", "toolsRemoved", "skillsAdded", "skillsRemoved", "avatarUrl", "defaultLaunchConfig"],
  agent_team: ["avatarUrl", "defaultLaunchConfig"],
  agent_org: ["avatarUrl", "defaultLaunchConfig"],
};
const LISTS = ["toolsAdded", "toolsRemoved", "skillsAdded", "skillsRemoved"];
const isNameList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x.trim() === x && x.length > 0) && new Set(v).size === v.length;
const isLaunch = (v) => v && typeof v === "object" && !Array.isArray(v)
  && Object.keys(v).sort().join() === "llmConfig,llmModelIdentifier,runtimeKind"
  && typeof v.runtimeKind === "string" && v.runtimeKind && typeof v.llmModelIdentifier === "string" && v.llmModelIdentifier
  && (v.llmConfig === null || (typeof v.llmConfig === "object" && !Array.isArray(v.llmConfig)));

/** Tolerant read: keeps valid fields of valid records; returns { records, skipped }. */
function readSettings(raw) {
  const records = {}; const skipped = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { records, skipped: ["<file>"] };
  for (const [key, rec] of Object.entries(raw)) {
    const kind = key.slice(0, key.indexOf(":"));
    if (!FIELDS[kind] || key.length <= kind.length + 1 || !rec || typeof rec !== "object" || Array.isArray(rec)) { skipped.push(key); continue; }
    const kept = {};
    for (const [field, value] of Object.entries(rec)) {
      const ok = FIELDS[kind].includes(field) && (LISTS.includes(field) ? isNameList(value)
        : field === "avatarUrl" ? typeof value === "string" && value.length > 0 : isLaunch(value));
      if (ok) kept[field] = value; else skipped.push(`${key}.${field}`);
    }
    if (kind === "agent" && kept.toolsAdded && kept.toolsRemoved && kept.toolsAdded.some((t) => kept.toolsRemoved.includes(t))) { delete kept.toolsAdded; delete kept.toolsRemoved; skipped.push(`${key}.tools(overlap)`); }
    if (kind === "agent" && kept.skillsAdded && kept.skillsRemoved && kept.skillsAdded.some((t) => kept.skillsRemoved.includes(t))) { delete kept.skillsAdded; delete kept.skillsRemoved; skipped.push(`${key}.skills(overlap)`); }
    if (Object.keys(kept).length) records[key] = kept; else skipped.push(key);
  }
  return { records, skipped };
}

// ---- Contract: effective values ----
const listMerge = (pkg = [], added = [], removed = []) => { const base = pkg.filter((x) => !removed.includes(x)); return [...base, ...added.filter((x) => !base.includes(x))]; };
function effective(kind, pkg, rec = {}) {
  const out = { avatarUrl: rec.avatarUrl ?? pkg.avatarUrl ?? null, defaultLaunchConfig: rec.defaultLaunchConfig ?? pkg.defaultLaunchConfig ?? null };
  if (kind === "agent") {
    out.toolNames = listMerge(pkg.toolNames, rec.toolsAdded, rec.toolsRemoved);
    out.skillNames = listMerge(pkg.skillNames, rec.skillsAdded, rec.skillsRemoved);
  }
  return out;
}

// ---- Contract: capture of edits already in package files (vs the installed revision) ----
function capture(kind, installed, user, existing = {}) {
  const rec = { ...existing };
  const lists = [["toolNames", "toolsAdded", "toolsRemoved"], ["skillNames", "skillsAdded", "skillsRemoved"]];
  if (kind === "agent") for (const [f, a, r] of lists) {
    const i = installed[f] ?? [], u = user[f] ?? [];
    const add = u.filter((x) => !i.includes(x)), rem = i.filter((x) => !u.includes(x));
    const A = [...new Set([...(rec[a] ?? []), ...add])].filter((x) => !(rec[r] ?? []).includes(x) || add.includes(x));
    const R = [...new Set([...(rec[r] ?? []), ...rem])].filter((x) => !A.includes(x));
    if (A.length) rec[a] = A; else delete rec[a];
    if (R.length) rec[r] = R; else delete rec[r];
  }
  for (const f of ["avatarUrl", "defaultLaunchConfig"]) {
    const changed = JSON.stringify(user[f] ?? null) !== JSON.stringify(installed[f] ?? null);
    if (changed && rec[f] === undefined && user[f] != null) rec[f] = user[f]; // an existing personal value wins
  }
  return rec;
}

// ============ Validation ============
console.log("== V-A identity: keys per root and across roots");
const roots = { base: baseRoot, new: newRoot, ...Object.fromEntries(localRoots.map((r) => [path.basename(r), r])) };
const allKeys = new Map();
for (const [name, root] of Object.entries(roots)) {
  const defs = definitionsOf(root);
  const keys = defs.map((d) => d.key);
  check(new Set(keys).size === keys.length, `${name}: ${keys.length} definitions, keys unique within the root`);
  check(keys.every((k) => FIELDS[k.slice(0, k.indexOf(":"))]), `${name}: every key parses to a known kind at its first ':'`);
  if (name !== "base") for (const k of keys) (allKeys.get(k) ?? allKeys.set(k, []).get(k)).push(name);
}
const shared = [...allKeys.entries()].filter(([, v]) => v.length > 1);
console.log(`   keys present in more than one of [new, local roots]: ${shared.length}`, shared.slice(0, 5));
const teamOrgDup = shared.filter(([k]) => !k.startsWith("agent:"));
console.log(`   of them Team/Org keys (the app refuses these as DEFINITION_IDENTITY_DUPLICATED): ${teamOrgDup.length}`);

console.log("== V-B tolerant reader");
const sample = {
  "agent:solution-designer": { toolsAdded: ["github_create_issue"], avatarUrl: "/rest/files/images/a.png" },
  "agent_team:software-engineering-team": { defaultLaunchConfig: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null } },
  "agent_team:bad-field": { toolsAdded: ["x"] },
  "agent:empty-list": { toolsAdded: [] },
  "agent:dup-list": { toolsAdded: ["a", "a"] },
  "agent:overlap": { toolsAdded: ["a"], toolsRemoved: ["a"] },
  "agent:bad-launch": { defaultLaunchConfig: { runtimeKind: "x" } },
  "unknown:thing": { avatarUrl: "x" },
  "agent:": { avatarUrl: "x" },
};
const { records, skipped } = readSettings(sample);
check(Object.keys(records).length === 2, `valid records kept: ${Object.keys(records).join(", ")}`);
const droppedRecords = Object.keys(sample).filter((k) => !records[k]).sort();
check(JSON.stringify(droppedRecords) === JSON.stringify(["agent:", "agent:bad-launch", "agent:dup-list", "agent:empty-list", "agent:overlap", "agent_team:bad-field", "unknown:thing"]), `exactly the 7 invalid records dropped: ${droppedRecords.join(", ")} (skip log: ${skipped.length} entries)`);
check(readSettings(null).skipped[0] === "<file>" && Object.keys(readSettings([]).records).length === 0, "unreadable file shape → no personal settings");

console.log("== V-C real update: user edits on the installed revision survive the update to the new revision");
const baseDefs = new Map(definitionsOf(baseRoot).map((d) => [d.key, d]));
const newDefs = new Map(definitionsOf(newRoot).map((d) => [d.key, d]));
// pick an agent the author changed between the two revisions (toolNames differ), else any common agent
const common = [...baseDefs.keys()].filter((k) => k.startsWith("agent:") && newDefs.has(k));
const changed = common.find((k) => JSON.stringify(readJson(baseDefs.get(k).configPath)?.toolNames) !== JSON.stringify(readJson(newDefs.get(k).configPath)?.toolNames)) ?? common[0];
const installed = readJson(baseDefs.get(changed).configPath);
const authorNew = readJson(newDefs.get(changed).configPath);
const removedByUser = installed.toolNames[0];
const user = { ...installed, toolNames: [...installed.toolNames.filter((t) => t !== removedByUser), "github_create_issue"], avatarUrl: "/rest/files/images/mine.png", defaultLaunchConfig: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-opus", llmConfig: null } };
const rec = capture("agent", installed, user);
console.log(`   subject ${changed}; author added ${JSON.stringify((authorNew.toolNames ?? []).filter((t) => !installed.toolNames.includes(t)))}, removed ${JSON.stringify(installed.toolNames.filter((t) => !(authorNew.toolNames ?? []).includes(t)))}`);
console.log(`   captured record ${JSON.stringify(rec)}`);
const eff = effective("agent", authorNew, rec);
check(eff.toolNames.includes("github_create_issue"), "user's added tool present after update");
check(!eff.toolNames.includes(removedByUser), "user's removed tool absent after update");
check((authorNew.toolNames ?? []).filter((t) => t !== removedByUser).every((t) => eff.toolNames.includes(t)), "every tool of the new revision present (except the user's removal)");
check(eff.avatarUrl === "/rest/files/images/mine.png" && eff.defaultLaunchConfig.runtimeKind === "claude_agent_sdk", "user's avatar and runtime/model kept as one unit");
check(JSON.stringify(eff.skillNames) === JSON.stringify(authorNew.skillNames ?? []), "skills follow the new revision when the user changed none");
check(readSettings({ [changed]: rec }).skipped.length === 0, "the captured record passes the reader");
check(Object.keys(capture("agent", authorNew, authorNew)).length === 0, "capture on an unchanged file yields nothing (safe to run at every update)");
check(JSON.stringify(capture("agent", authorNew, authorNew, rec)) === JSON.stringify(rec), "capture keeps an existing record unchanged");
const gone = [...baseDefs.keys()].find((k) => !newDefs.has(k));
check(gone ? !newDefs.has(gone) : true, `a definition the new revision dropped (${gone ?? "none"}) leaves its record unused, not an error`);

console.log("== V-D every real config reads into the four package values");
let n = 0, bad = 0;
for (const d of newDefs.values()) { const c = readJson(d.configPath); n++; const e = effective(d.kind, c ?? {}, {}); if (!c || (d.kind === "agent" && !Array.isArray(e.toolNames))) bad++; }
check(bad === 0, `${n} config files of the new revision read; effective values with no personal record equal the package's`);

console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
process.exitCode = failures ? 1 : 0;
