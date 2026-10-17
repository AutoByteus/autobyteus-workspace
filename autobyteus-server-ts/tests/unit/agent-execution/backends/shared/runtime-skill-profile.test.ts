import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RuntimeSkillProfile, type PrivateSkillRuntime } from "../../../../../src/agent-execution/backends/shared/runtime-skill-profile.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
let root: string;
beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "private-skill-profile-")));
  await fs.mkdir(path.join(root,"project"));
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
async function source(name = "writer", generation = "v1") {
  const directory = path.join(root, generation, name);
  await fs.mkdir(directory, {recursive:true});
  await fs.writeFile(path.join(directory,"SKILL.md"), `---\nname: ${name}\ndescription: fixture\n---\nRead support.txt\n`);
  await fs.writeFile(path.join(directory,"support.txt"), generation);
  return new Skill({name, description:"fixture",content:"",rootPath:directory});
}
function profile(skill: Skill, runtime: PrivateSkillRuntime = "claude", overrides = {}) {
  return new RuntimeSkillProfile({privateParent:path.join(root,"private"),workingDirectory:path.join(root,"project"),runtime,
    bindings:[{kind:"resolved",skill}],collisionPolicy:"fail",resolveManagedSkill:()=>skill,assertAccepting:()=>{},warn:vi.fn(),...overrides});
}
describe("private configured skill profiles", () => {
  it.each(["claude","codex","grok"] as const)("%s links whole source without project writes and only cleans its own profile", async runtime => {
    const skill=await source(); const a=profile(skill,runtime),b=profile(skill,runtime);
    await a.prepare();await b.prepare();
    expect(a.root).not.toBe(b.root);
    expect((await fs.lstat(a.exposures[0]!.linkRoot)).isSymbolicLink()).toBe(true);
    await a.release();await a.release();
    expect(await fs.readFile(path.join(b.exposures[0]!.linkRoot,"support.txt"),"utf8")).toBe("v1");
    expect(await fs.readdir(path.join(root,"project"))).toEqual([]);
    await b.release();expect(await fs.readFile(path.join(skill.rootPath,"support.txt"),"utf8")).toBe("v1");
  });
  it("selects current matching managed source without retaining retired bytes", async () => {
    const old=await source(), current=await source("writer","v2");old.managedSource={sourceId:"source",generation:"old"};
    const lookup=vi.fn(()=>current);const p=profile(old,"codex",{resolveManagedSkill:lookup});
    await p.prepare();expect(lookup).toHaveBeenCalledWith("source","writer");
    expect(p.exposures[0]!.sourceRoot).toBe(current.rootPath);
    await fs.rm(current.rootPath,{recursive:true});
    await expect(fs.readFile(path.join(p.exposures[0]!.linkRoot,"support.txt"))).rejects.toMatchObject({code:"ENOENT"});
    await p.release();expect(await fs.readFile(path.join(old.rootPath,"support.txt"),"utf8")).toBe("v1");
  });
  it("preserves even broken project entries; configured fails, all-installed skips", async () => {
    const skill=await source(),collision=path.join(root,"project",".claude","skills");await fs.mkdir(collision,{recursive:true});
    await fs.symlink(path.join(root,"missing"),path.join(collision,"writer"));
    const a=profile(skill);await expect(a.prepare()).rejects.toThrow("Workspace skill path collision");await a.release();
    const b=profile(skill,"claude",{collisionPolicy:"prefer_workspace"});await b.prepare();expect(b.exposures).toEqual([]);await b.release();
    expect((await fs.lstat(path.join(collision,"writer"))).isSymbolicLink()).toBe(true);
  });
  it("cancellation during acquisition awaits staging then removes partial profile", async () => {
    const skill=await source();const p=profile(skill);
    const prepare=p.prepare();const release=p.release();
    await expect(prepare).rejects.toThrow("closing");await release;
    await expect(fs.access(p.root)).rejects.toMatchObject({code:"ENOENT"});
    await expect(p.prepare()).rejects.toThrow("closing");
  });
  it("keeps a registered receipt for partial preparation failure", async () => {
    const skill=await source();const p=profile(skill,"grok",{assertAccepting:vi.fn().mockImplementationOnce(()=>{}).mockImplementationOnce(()=>{}).mockImplementation(()=>{throw new Error("cancelled");})});
    await expect(p.prepare()).rejects.toThrow("cancelled");await p.release();
    await expect(fs.access(p.root)).rejects.toMatchObject({code:"ENOENT"});
    expect(await fs.readFile(path.join(skill.rootPath,"support.txt"),"utf8")).toBe("v1");
  });
});
