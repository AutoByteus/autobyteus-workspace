#!/usr/bin/env node
// Temporary API/E2E probe (chat-interface-entry, RSK-003).
// Resolves ALL_INSTALLED against the user's REAL installed skill catalog (read-only)
// through the built SkillService, then materializes it through the real Codex/Claude
// workspace path is not reproduced here; this probe exercises:
//   1. regular bindings (AutoByteus/Codex/Claude/ACP path)
//   2. detailed bindings + the AGY capsule materializer (size/provenance/collision limits)
// Owned state: a temp data dir + temp capsule/workspace, removed at the end.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = path.resolve(process.argv[2]);
const skillsPaths = process.argv[3] ?? '';
const packageRoots = process.argv[4] ?? '';
const collisionWorkspace = process.argv[5] ?? '';
const imp = (p) => import(pathToFileURL(path.join(dist, p)).href);

const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-entry-real-catalog-'));
const out = { owned, skillsPaths, packageRoots, cases: {} };
try {
  process.env.AUTOBYTEUS_SKILLS_PATHS = skillsPaths;
  process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = packageRoots;
  const { appConfigProvider } = await imp('config/app-config-provider.js');
  appConfigProvider.initialize({ appDataDir: path.join(owned, 'data') });
  const { SkillService } = await imp('skills/services/skill-service.js');
  const { materializeAgyConfiguredSkills } = await imp('agent-execution/backends/antigravity/capsule/agy-configured-skill-materializer.js');
  const service = new SkillService();
  const definition = { id: 'autobyteus-daily-assistant', name: 'Daily Assistant', skillNames: [], skillScope: 'ALL_INSTALLED' };

  const records = service.listInstalledSkillRecords();
  const listed = service.listSkills();
  const byOrigin = records.reduce((acc, r) => { acc[r.origin] = (acc[r.origin] ?? 0) + 1; return acc; }, {});
  out.cases.catalog = { installedRecords: records.length, listSkills: listed.length, byOrigin,
    sameNames: JSON.stringify(records.map((r) => r.skill.name).sort()) === JSON.stringify(listed.map((s) => s.name).sort()) };

  let t = Date.now();
  const regular = service.resolveConfiguredSkillBindingsForAgent(definition);
  out.cases.regular = { bindings: regular.length, kinds: [...new Set(regular.map((b) => b.kind))], ms: Date.now() - t,
    hasEffectiveSkills: service.hasEffectiveSkills(definition),
    bundledAgentPrivate: regular.filter((b) => b.source?.origin === 'agent_private').length };

  t = Date.now();
  let detailed;
  try {
    detailed = service.resolveConfiguredSkillBindingsForAgentDetailed(definition);
    const kinds = detailed.reduce((acc, b) => { acc[b.kind] = (acc[b.kind] ?? 0) + 1; return acc; }, {});
    out.cases.detailed = { result: 'resolved', bindings: detailed.length, kinds, ms: Date.now() - t,
      invalid: detailed.filter((b) => b.kind !== 'resolved').map((b) => ({ name: b.name, kind: b.kind, reason: b.reason })) };
  } catch (error) {
    out.cases.detailed = { result: 'threw', error: String(error?.message ?? error), ms: Date.now() - t };
  }

  const materialize = async (label, workspacePath, requestStrength = 'all_installed') => {
    if (!detailed) return { result: 'skipped (detailed resolution threw)' };
    const capsulePath = path.join(owned, `capsule-${label}`);
    await fs.mkdir(capsulePath, { recursive: true });
    const started = Date.now();
    try {
      const snaps = await materializeAgyConfiguredSkills({ capsulePath, workspacePath, bindings: detailed, enabled: true, runId: `probe-${label}`, agentDefinitionId: definition.id, requestStrength });
      const du = async (dir) => { let total = 0; for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); total += e.isDirectory() ? await du(p) : (await fs.stat(p)).size; } return total; };
      return { result: 'materialized', snapshots: snaps.length, capsuleBytes: await du(capsulePath), ms: Date.now() - started };
    } catch (error) {
      return { result: 'threw', error: String(error?.message ?? error), ms: Date.now() - started };
    }
  };
  const emptyWorkspace = path.join(owned, 'workspace');
  await fs.mkdir(emptyWorkspace, { recursive: true });
  out.cases.agyCapsuleTempWorkspace = await materialize('temp', emptyWorkspace);
  if (collisionWorkspace) {
    out.cases.agyCapsuleRepoWorkspaceWeak = { workspace: collisionWorkspace, ...(await materialize('repo-weak', collisionWorkspace, 'all_installed')) };
    out.cases.agyCapsuleRepoWorkspaceStrong = { workspace: collisionWorkspace, ...(await materialize('repo-strong', collisionWorkspace, 'configured')) };
  }
} finally {
  await fs.rm(owned, { recursive: true, force: true });
  out.cleanup = 'removed owned temp dir';
  console.log(JSON.stringify(out, null, 2));
}
