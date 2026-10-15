import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeSkillProfile } from "../../../../../src/agent-execution/backends/shared/runtime-skill-profile.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import { discoverCodexPrivateSkills } from "../../../../../src/agent-execution/backends/codex/thread/codex-private-skill-discovery.js";
import { grokPrivateSkills } from "../../../../../src/agent-execution/backends/grok/grok-private-skills.js";
import { validateClaudePrivateSkills } from "../../../../../src/runtime-management/claude/client/claude-private-skill-discovery.js";
let root: string;
let profile: RuntimeSkillProfile;
beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "private-discovery-")));
  await fs.mkdir(path.join(root, "source")); await fs.mkdir(path.join(root, "project"));
  await fs.writeFile(path.join(root, "source", "SKILL.md"), "---\nname: writer\ndescription: fixture\n---\n");
  profile = new RuntimeSkillProfile({runtime: "codex", privateParent: path.join(root,"private"), workingDirectory: path.join(root,"project"),
    bindings: [{kind:"resolved",skill: new Skill({name:"writer",description:"fixture",content:"",rootPath:path.join(root,"source")})}],
    collisionPolicy: "fail", assertAccepting: () => {}, resolveManagedSkill: () => null });
  await profile.prepare();
});
afterEach(async () => { await profile.release(); await fs.rm(root, {recursive:true,force:true}); });
describe("native private skill metadata", () => {
  it.each(["canonical", "linked"])("Codex uses the discovered %s manifest spelling", async spelling => {
    const nativePath = path.join(spelling === "canonical" ? profile.exposures[0]!.sourceRoot : profile.exposures[0]!.linkRoot, "SKILL.md");
    const request = vi.fn(async () => ({data:[{cwd:path.join(root,"project"),skills:[{enabled:true,name:"writer",path:nativePath}]}]}));
    expect(await discoverCodexPrivateSkills({request} as never,path.join(root,"project"),profile)).toContain(`native skill $writer; manifest ${nativePath}`);
    expect(request).toHaveBeenCalledWith("skills/list",{cwds:[path.join(root,"project")],forceReload:true});
  });
  it.each([false,true])("Codex refuses unavailable or unrelated source instead of copying (enabled=%s)", async enabled => {
    const request = vi.fn(async () => ({data:[{cwd:path.join(root,"project"),skills:[{enabled,name:"writer",path:path.join(root,"wrong","SKILL.md")}]}]}));
    await expect(discoverCodexPrivateSkills({request} as never,path.join(root,"project"),profile)).rejects.toThrow("did not discover");
    expect(await fs.readdir(path.join(root,"project"))).toEqual([]);
  });
  it("Grok requires plugin capability and canonical source identity without relocating auth", async () => {
    const extension = vi.fn(async () => ({result:{skills:[{name:"writer",path:path.join(profile.exposures[0]!.linkRoot,"SKILL.md"),enabled:true,plugin_name:"autobyteus-configured"}]}}));
    const caps = {_meta:{"x.ai/pluginDirs":true}};
    expect(grokPrivateSkills.launchArgs(["agent","--no-leader","stdio"],profile)).toEqual(["agent","--plugin-dir",profile.root,"--no-leader","stdio"]);
    await grokPrivateSkills.validate({extension} as never,caps as never,profile);
    expect(extension).toHaveBeenCalledWith("_x.ai/skills/list",{cwd:profile.workingDirectory,refresh:true});
    await expect(grokPrivateSkills.validate({extension} as never,{} as never,profile)).rejects.toThrow("does not support");
    await fs.rm(path.join(root,"source"),{recursive:true});
    await expect(grokPrivateSkills.validate({extension} as never,caps as never,profile)).rejects.toThrow("did not discover");
  });
  it("Claude checks the exact private namespace; unsupported and missing names fail", async () => {
    await validateClaudePrivateSkills({supportedCommands: async () => [{name:"autobyteus-configured:writer"}]},["autobyteus-configured:writer"]);
    await expect(validateClaudePrivateSkills({},[])).rejects.toThrow("UNSUPPORTED");
    await expect(validateClaudePrivateSkills({supportedCommands: async () => [{name:"writer"}]},["autobyteus-configured:writer"])).rejects.toThrow("UNAVAILABLE");
  });
});
