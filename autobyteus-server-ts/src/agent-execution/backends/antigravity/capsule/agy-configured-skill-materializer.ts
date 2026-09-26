import fs from "node:fs/promises";
import { constants, type BigIntStats } from "node:fs";
import path from "node:path";
import type { DetailedConfiguredSkillResolution } from "../../../../skills/domain/configured-agent-skill-binding.js";
import { fingerprintConfiguredSkillSource } from "../../../../skills/services/configured-skill-source-fingerprint.js";

export type AgySkillSnapshot = { name: string; relativePath: string };

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const safeName = (value: string): string => {
  const name = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) throw new Error(`AGY_SKILL_NAME_INVALID: ${name}`);
  return name;
};
const failure = (code: string, name: string): Error => new Error(`${code}: ${name}`);
const contains = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};
const same = (a: BigIntStats, b: BigIntStats): boolean =>
  a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.size === b.size
  && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;

/** Copy one checked source tree into a newly created capsule path, never dereferencing a directory link. */
const snapshotSkill = async (binding: Extract<DetailedConfiguredSkillResolution, { kind: "resolved" }>, target: string, name: string): Promise<void> => {
  const descriptor = binding.source;
  if (!descriptor || !["agent_private", "team_shared", "global"].includes(descriptor.origin)
    || !path.isAbsolute(descriptor.sourceRoot) || !path.isAbsolute(descriptor.trustedRoot))
    throw failure("AGY_SKILL_SOURCE_PROVENANCE_INVALID", name);
  const sourcePath = binding.skill.rootPath;
  let sourceRoot: string;
  try { sourceRoot = await fs.realpath(sourcePath); }
  catch { throw failure("AGY_SKILL_SOURCE_CHANGED", name); }
  const sourceTreeHash = (): string => {
    try { return fingerprintConfiguredSkillSource(sourceRoot, trustedRoot); }
    catch { throw failure("AGY_SKILL_SOURCE_CHANGED", name); }
  };
  const trustedRoot = await fs.realpath(descriptor.trustedRoot);
  const targetRoot = path.join(await fs.realpath(path.dirname(target)), path.basename(target));
  const parts = path.relative(trustedRoot, sourceRoot).split(path.sep);
  const expectedLayout = descriptor.origin === "global" ? trustedRoot === sourceRoot
    : descriptor.origin === "team_shared" ? parts.length === 2 && parts[0] === "skills" && parts[1] === name
      : (parts.length === 2 && parts[0] === "skills" && parts[1] === name)
        || (parts.length === 4 && parts[0] === "agents" && !!parts[1] && parts[2] === "skills" && parts[3] === name);
  if (sourceRoot !== descriptor.sourceRoot || trustedRoot !== descriptor.trustedRoot
    || !contains(trustedRoot, sourceRoot) || !expectedLayout
    || !(await fs.lstat(sourcePath)).isDirectory()
    || contains(trustedRoot, targetRoot))
    throw failure("AGY_SKILL_SOURCE_PROVENANCE_INVALID", name);
  if (sourceTreeHash() !== binding.sourceTreeSha256)
    throw failure("AGY_SKILL_SOURCE_CHANGED", name);

  const checks: Array<() => Promise<void>> = [];
  const verify = async (entry: string, before: BigIntStats, canonical: string): Promise<void> => {
    try {
      if (!same(before, await fs.lstat(entry, { bigint: true })) || await fs.realpath(entry) !== canonical)
        throw failure("AGY_SKILL_SOURCE_CHANGED", name);
    } catch { throw failure("AGY_SKILL_SOURCE_CHANGED", name); }
  };
  const copyFile = async (entry: string, destination: string, before: BigIntStats): Promise<void> => {
    let canonical: string;
    try { canonical = await fs.realpath(entry); }
    catch { throw failure("AGY_SKILL_SOURCE_LINK_INVALID", name); }
    if (!contains(trustedRoot, canonical)) throw failure("AGY_SKILL_SOURCE_OUT_OF_BOUNDS", name);
    const targetBefore = await fs.lstat(canonical, { bigint: true });
    if (!targetBefore.isFile()) throw failure("AGY_SKILL_SOURCE_LINK_INVALID", name);
    const handle = await fs.open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW);
    let bytes: Buffer;
    try {
      const opened = await handle.stat({ bigint: true });
      if (!opened.isFile() || !same(opened, targetBefore)) throw failure("AGY_SKILL_SOURCE_CHANGED", name);
      const chunks: Buffer[] = [];
      let length = 0;
      while (true) {
        const chunk = Buffer.allocUnsafe(64 * 1024);
        const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        length += bytesRead;
        if (length > MAX_FILE_BYTES) throw failure("AGY_SKILL_SOURCE_TOO_LARGE", name);
        chunks.push(chunk.subarray(0, bytesRead));
      }
      if (!same(opened, await handle.stat({ bigint: true }))) throw failure("AGY_SKILL_SOURCE_CHANGED", name);
      bytes = Buffer.concat(chunks, length);
    } finally { await handle.close(); }
    await verify(entry, before, canonical);
    if (!same(targetBefore, await fs.lstat(canonical, { bigint: true })))
      throw failure("AGY_SKILL_SOURCE_CHANGED", name);
    await fs.writeFile(destination, bytes, { flag: "wx", mode: (targetBefore.mode & 0o111n) === 0n ? 0o600 : 0o700 });
    checks.push(async () => {
      await verify(entry, before, canonical);
      if (!same(targetBefore, await fs.lstat(canonical, { bigint: true })))
        throw failure("AGY_SKILL_SOURCE_CHANGED", name);
    });
  };
  const copyDirectory = async (source: string, destination: string): Promise<void> => {
    const before = await fs.lstat(source, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink()) throw failure("AGY_SKILL_SOURCE_LINK_INVALID", name);
    const canonical = await fs.realpath(source);
    if (!contains(sourceRoot, canonical)) throw failure("AGY_SKILL_SOURCE_OUT_OF_BOUNDS", name);
    await fs.mkdir(destination, { mode: 0o700 });
    const names = new Set<string>();
    for (const entry of await fs.readdir(source)) {
      const folded = entry.normalize("NFC").toLowerCase();
      if (names.has(folded)) throw failure("AGY_SKILL_SOURCE_COLLISION", name);
      names.add(folded);
      const child = path.join(source, entry);
      const childStat = await fs.lstat(child, { bigint: true });
      const output = path.join(destination, entry);
      if (childStat.isDirectory()) await copyDirectory(child, output);
      else if (childStat.isFile() || childStat.isSymbolicLink()) await copyFile(child, output, childStat);
      else throw failure("AGY_SKILL_SOURCE_INVALID", name);
    }
    await verify(source, before, canonical);
    checks.push(() => verify(source, before, canonical));
  };
  await copyDirectory(sourcePath, target);
  if (!(await fs.lstat(path.join(target, "SKILL.md"))).isFile())
    throw failure("AGY_SKILL_SOURCE_INVALID", name);
  for (const check of checks) await check();
  if (sourceTreeHash() !== binding.sourceTreeSha256)
    throw failure("AGY_SKILL_SOURCE_CHANGED", name);
};

export const materializeAgyConfiguredSkills = async (input: {
  capsulePath: string;
  workspacePath: string;
  bindings: readonly DetailedConfiguredSkillResolution[];
  enabled: boolean;
  runId: string;
  agentDefinitionId: string;
}): Promise<AgySkillSnapshot[]> => {
  if (!input.enabled) return [];
  const names = new Set<string>();
  const snapshots: AgySkillSnapshot[] = [];
  const targetRoot = path.join(input.capsulePath, ".agents", "skills");
  await fs.mkdir(targetRoot, { recursive: true, mode: 0o700 });
  for (const binding of input.bindings) {
    if (binding.kind === "certified_absent") {
      console.warn(`AGY configured skill skipped: run=${input.runId}, agent=${input.agentDefinitionId}, skill=${binding.name}, disposition=skipped-missing`);
      continue;
    }
    if (binding.kind === "invalid_candidate") throw failure("AGY_CONFIGURED_SKILL_INVALID_CANDIDATE", binding.name);
    const name = safeName(binding.skill.name);
    if (names.has(name.toLowerCase())) throw failure("AGY_SKILL_NAME_COLLISION", name);
    names.add(name.toLowerCase());
    const workspaceSkill = path.join(input.workspacePath, ".agents", "skills", name);
    try { await fs.lstat(workspaceSkill); throw failure("AGY_SKILL_NAME_COLLISION", name); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const relativePath = path.join(".agents", "skills", name);
    try { await snapshotSkill(binding, path.join(input.capsulePath, relativePath), name); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith("AGY_SKILL_")) throw error;
      throw failure("AGY_SKILL_SOURCE_INVALID", name);
    }
    snapshots.push({ name, relativePath });
  }
  return snapshots;
};
