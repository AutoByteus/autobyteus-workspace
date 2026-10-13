import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({configuredSharedWorkspace: vi.fn()}));
vi.mock("../../../../../src/workspaces/shared-workspace-binding.js", async original => ({...await original<object>(),...config}));
import { preparePrivateRuntimeSkills } from "../../../../../src/agent-execution/backends/shared/prepare-private-runtime-skills.js";
let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(),"private-preparation-")); config.configuredSharedWorkspace.mockReset(); });
afterEach(async () => { await fs.rm(root,{recursive:true,force:true}); });
const input = () => ({runtime: "claude" as const, workingDirectory: "/shared/project", memoryDir: root,
  bindings: [], collisionPolicy: "fail" as const, skills: {resolveManagedSkillForMaterialization: vi.fn()},
  guard: {assertAccepting: vi.fn(),ownSkillProfile: vi.fn()} });
describe("shared-only private preparation", () => {
  it("leaves ordinary local publisher selection unchanged", async () => {
    config.configuredSharedWorkspace.mockResolvedValue(null);const args=input();
    expect(await preparePrivateRuntimeSkills(args)).toBeNull();expect(args.guard.ownSkillProfile).not.toHaveBeenCalled();
  });
  it("registers before filesystem staging and cancellation leaves a cleanup receipt", async () => {
    config.configuredSharedWorkspace.mockResolvedValue({mountRoot:"/shared"});const args=input();
    args.guard.ownSkillProfile.mockImplementation(() => {args.guard.assertAccepting.mockImplementation(()=>{throw Error("cancelled");});});
    await expect(preparePrivateRuntimeSkills(args)).rejects.toThrow("cancelled");
    const profile=args.guard.ownSkillProfile.mock.calls[0]![0];await profile.release();
    await expect(fs.access(profile.root)).rejects.toMatchObject({code:"ENOENT"});
  });
  it("refuses a shared memory root or missing exact owner before staging", async () => {
    config.configuredSharedWorkspace.mockResolvedValue({mountRoot:"/shared"});
    await expect(preparePrivateRuntimeSkills({...input(),memoryDir:"/shared/memory"})).rejects.toThrow("node-private");
    await expect(preparePrivateRuntimeSkills({...input(),guard:{assertAccepting:()=>{}}})).rejects.toThrow("exact preparation owner");
  });
});
