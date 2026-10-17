import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Skill } from "../../../skills/domain/models.js";
import type { ConfiguredAgentSkillBinding } from "../../../skills/domain/configured-agent-skill-binding.js";
import type { WorkspaceCollisionPolicy } from "./workspace-skill-collision-policy.js";

export type PrivateSkillRuntime = "claude" | "codex" | "grok";
export type RuntimeSkillExposure = Readonly<{
  skill: Skill;
  linkRoot: string;
  sourceRoot: string;
}>;

type ProfileInput = {
  privateParent: string;
  workingDirectory: string;
  runtime: PrivateSkillRuntime;
  bindings: readonly ConfiguredAgentSkillBinding[];
  collisionPolicy: WorkspaceCollisionPolicy;
  resolveManagedSkill(sourceId: string, name: string): Skill | null;
  assertAccepting(): void;
  warn?: (message: string) => void;
};

const segment = (name: string): string => name.replace(/\s+/g, " ").trim().toLowerCase()
  .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "skill";
const missing = (error: unknown): boolean => ["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "");
const exists = async (entry: string): Promise<boolean> => {
  try { await fs.lstat(entry); return true; }
  catch (error) { if (missing(error)) return false; throw error; }
};

/** An exact execution's private wrappers/links. This is NOT a lease on source bytes.
 * Register the object with the preparation owner before calling prepare(). Native
 * process owners must prove close before release(); an interrupted prepare is also
 * awaited here so a late filesystem acquisition cannot outlive its receipt.
 */
export class RuntimeSkillProfile {
  readonly id = randomUUID();
  readonly root: string;
  readonly skillsRoot: string;
  readonly runtime: PrivateSkillRuntime;
  readonly workingDirectory: string;
  readonly exposures: RuntimeSkillExposure[] = [];
  private preparation: Promise<void> | null = null;
  private releaseAttempt: Promise<void> | null = null;
  private closing = false;
  private created = false;
  private released = false;

  constructor(private readonly input: ProfileInput) {
    if (!path.isAbsolute(input.privateParent)) throw new Error("Runtime skill profile parent must be absolute.");
    this.runtime = input.runtime;
    this.workingDirectory = input.workingDirectory;
    this.root = path.join(input.privateParent, this.id);
    this.skillsRoot = path.join(this.root, "skills");
  }

  prepare(): Promise<void> {
    if (this.closing) return Promise.reject(new Error("Runtime skill profile is closing."));
    return this.preparation ??= this.stage();
  }

  release(): Promise<void> {
    this.closing = true;
    if (this.released) return Promise.resolve();
    if (this.releaseAttempt) return this.releaseAttempt;
    const attempt = (async () => {
      await this.preparation?.catch(() => undefined);
      if (this.created) {
        // Node rm unlinks directory symlinks rather than traversing their targets.
        // No source deletion, source-manager callback or peer-profile enumeration.
        await fs.rm(this.root, { recursive: true, force: true });
      }
      this.released = true;
    })();
    this.releaseAttempt = attempt;
    void attempt.finally(() => { if (this.releaseAttempt === attempt) this.releaseAttempt = null; }).catch(() => undefined);
    return attempt;
  }

  private assertAccepting(): void {
    if (this.closing) throw new Error("Runtime skill profile is closing.");
    this.input.assertAccepting();
  }

  private async stage(): Promise<void> {
    this.assertAccepting();
    await fs.mkdir(this.input.privateParent, { recursive: true, mode: 0o700 });
    this.assertAccepting();
    await fs.mkdir(this.root, { mode: 0o700 });
    this.created = true;
    this.assertAccepting();
    await fs.mkdir(this.skillsRoot, { mode: 0o700 });
    if (this.runtime !== "codex") {
      const manifestRoot = path.join(this.root, ".claude-plugin");
      await fs.mkdir(manifestRoot, { mode: 0o700 });
      await fs.writeFile(path.join(manifestRoot, "plugin.json"), JSON.stringify({
        name: "autobyteus-configured", version: "1.0.0", description: "Configured AutoByteus skills",
      }) + "\n", { flag: "wx", mode: 0o600 });
    }
    const names = new Set<string>();
    for (const binding of this.input.bindings) {
      this.assertAccepting();
      const initial = binding.kind === "resolved" ? binding.skill : null;
      const skill = initial?.managedSource
        ? this.input.resolveManagedSkill(initial.managedSource.sourceId, initial.name) : initial;
      const name = initial?.name ?? (binding.kind === "unresolved" ? binding.name : "");
      if (!skill) { this.warn(name, "source unavailable"); continue; }
      const folder = segment(skill.name);
      if (names.has(folder)) throw new Error(`Private skill path collision for '${skill.name}'.`);
      names.add(folder);
      const projectEntry = path.join(this.input.workingDirectory, `.${this.runtime}`, "skills", folder);
      if (await exists(projectEntry)) {
        if (this.input.collisionPolicy === "fail") throw new Error(`Workspace skill path collision for '${skill.name}' at '${projectEntry}'.`);
        this.warn(skill.name, "project-owned skill preferred"); continue;
      }
      let sourceRoot: string;
      try {
        sourceRoot = await fs.realpath(skill.rootPath);
        if (!(await fs.stat(sourceRoot)).isDirectory() || !(await fs.stat(path.join(sourceRoot, "SKILL.md"))).isFile()) {
          this.warn(skill.name, "source has no skill manifest"); continue;
        }
      } catch (error) {
        if (!missing(error)) throw error;
        this.warn(skill.name, "source unavailable"); continue;
      }
      this.assertAccepting();
      const linkRoot = path.join(this.skillsRoot, folder);
      await fs.symlink(sourceRoot, linkRoot, "dir");
      this.exposures.push({ skill, linkRoot, sourceRoot });
    }
    this.assertAccepting();
  }

  private warn(name: string, reason: string): void {
    (this.input.warn ?? console.warn)(`${this.runtime} private configured skill '${name}': ${reason}.`);
  }
}
