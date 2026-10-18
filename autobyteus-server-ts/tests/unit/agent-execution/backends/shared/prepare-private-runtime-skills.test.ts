import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preparePrivateRuntimeSkills } from "../../../../../src/agent-execution/backends/shared/prepare-private-runtime-skills.js";
import type { RuntimeSkillProfile } from "../../../../../src/agent-execution/backends/shared/runtime-skill-profile.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
let root: string;
let skill: Skill;
let profiles: RuntimeSkillProfile[];
beforeEach(async () => {
 root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "private-preparation-")));
 profiles = [];
 for (const name of ["project", "memory", "source"]) await fs.mkdir(path.join(root, name));
 await fs.writeFile(path.join(root, "source", "SKILL.md"), "configured source");
 skill = new Skill({name:"writer", description:"fixture", content:"",rootPath:path.join(root,"source")});
});
afterEach(async () => { for (const p of profiles) await p.release(); await fs.rm(root,{recursive:true,force:true}); });
const input = () => ({runtime: "claude" as const, workingDirectory:path.join(root,"project"), memoryDir:path.join(root,"memory"),
 bindings:[{kind:"resolved" as const,skill}], collisionPolicy:"fail" as const, skills:{resolveManagedSkillForMaterialization:vi.fn()},
 guard:{assertAccepting:vi.fn(),ownSkillProfile:vi.fn((p:RuntimeSkillProfile)=>{profiles.push(p);})} });
describe("filesystem-independent private preparation", () => {
 it("does not acquire or validate private storage with no configured bindings", async () => {
  const args={...input(),bindings:[],memoryDir:null};
  expect(await preparePrivateRuntimeSkills(args)).toBeNull();expect(args.guard.ownSkillProfile).not.toHaveBeenCalled();
  expect(await fs.readdir(args.workingDirectory)).toEqual([]);
 });
 it.each(["claude","codex","grok"] as const)("%s exposes configured skills privately for an ordinary directory",async runtime=>{
  const args={...input(),runtime};const pending=preparePrivateRuntimeSkills(args);
  // Synchronous receipt precedes the first filesystem await.
  expect(args.guard.ownSkillProfile).toHaveBeenCalledOnce();
  const p=await pending;expect(p?.exposures[0]?.sourceRoot).toBe(skill.rootPath);
  expect(await fs.readdir(args.workingDirectory)).toEqual([]);
  expect((await fs.stat(p!.root)).mode & 0o777).toBe(0o700);
 });
 it("keeps an exact receipt when cancelled before staging",async()=>{
  const args=input();args.guard.ownSkillProfile.mockImplementation(p=>{profiles.push(p);args.guard.assertAccepting.mockImplementation(()=>{throw Error("cancelled");});});
  await expect(preparePrivateRuntimeSkills(args)).rejects.toThrow("cancelled");
  await profiles[0]!.release();await expect(fs.access(profiles[0]!.root)).rejects.toMatchObject({code:"ENOENT"});
 });
 it("refuses missing/relative storage and missing exact ownership, without fallback",async()=>{
  for(const memoryDir of [null,"relative"]){await expect(preparePrivateRuntimeSkills({...input(),memoryDir})).rejects.toThrow("application-private");}
  await expect(preparePrivateRuntimeSkills({...input(),guard:{assertAccepting:()=>{}}})).rejects.toThrow("exact preparation owner");
  await expect(preparePrivateRuntimeSkills({...input(),memoryDir:path.join(root,"missing")})).rejects.toMatchObject({code:"ENOENT"});
  expect(await fs.readdir(path.join(root,"project"))).toEqual([]);
 });
 it("rejects project storage and symlink aliases before creating any profile",async()=>{
  await fs.symlink(path.join(root,"project"),path.join(root,"alias"));
  for(const memoryDir of [path.join(root,"project"),path.join(root,"alias")]){
   await expect(preparePrivateRuntimeSkills({...input(),memoryDir})).rejects.toThrow("outside the project");
  }
  await fs.symlink(path.join(root,"project"),path.join(root,"memory","runtime-skill-profiles"));
  await expect(preparePrivateRuntimeSkills(input())).rejects.toThrow("outside the project");
  expect(await fs.readdir(path.join(root,"project"))).toEqual([]);
 });
});
