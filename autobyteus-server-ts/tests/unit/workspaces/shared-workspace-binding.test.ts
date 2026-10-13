import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {SharedWorkspaceBinding,parseSharedMountBinding,isWithinSharedRoot} from "../../../src/workspaces/shared-workspace-binding.js";
import {parseLinuxSharedMount,parseDarwinSharedMount} from "../../../src/workspaces/shared-workspace-mount-observation.js";
let root:string;
const id="12345678-1234-1234-1234-123456789abc";
beforeEach(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),"shared-binding-"));});
afterEach(async()=>{await fs.rm(root,{recursive:true,force:true});});
async function fixture(){
 const mountRoot=path.join(root,"mount"),project=path.join(mountRoot,"project"),descriptor=path.join(root,"attachment.json");
 const binding={storageId:id,mountRoot,endpoint:"192.168.1.8",export:"/autobyteus/"+id,protocol:"4.1" as const};
 await fs.mkdir(path.join(mountRoot,".autobyteus-nfs"),{recursive:true});await fs.mkdir(project);
 await fs.writeFile(path.join(mountRoot,".autobyteus-nfs","storage.json"),JSON.stringify({storageId:id}));
 await fs.writeFile(descriptor,JSON.stringify(binding));
 return {binding,project,descriptor};
}
describe("new-run shared binding",()=>{
 it("missing descriptor preserves local behavior without mount observation",async()=>{
  const observe=vi.fn();const check=new SharedWorkspaceBinding({descriptorPath:path.join(root,"absent"),observe});
  expect(await check.checkForRun(path.join(root,"project"))).toBeNull();expect(observe).not.toHaveBeenCalled();
 });
 it("checks mount then marker and project access without changing bytes",async()=>{
  const {binding,project,descriptor}=await fixture();const observe=vi.fn(async()=>binding);
  const check=new SharedWorkspaceBinding({descriptorPath:descriptor,observe});expect(await check.checkForRun(project)).toEqual(binding);
  expect(observe).toHaveBeenCalledOnce();expect(await fs.readdir(project)).toEqual([]);
 });
 it.each([null,{endpoint:"wrong",export:"/wrong",protocol:"3"}])("rejects missing/wrong mount before touching source marker",async observed=>{
  const {project,descriptor}=await fixture();const check=new SharedWorkspaceBinding({descriptorPath:descriptor,observe:async()=>observed});
  await expect(check.checkForRun(project)).rejects.toThrow("No local substitute");
 });
 it("rejects wrong storage identity and a file in place of project",async()=>{
  const {binding,project,descriptor}=await fixture();const check=new SharedWorkspaceBinding({descriptorPath:descriptor,observe:async()=>binding});
  await fs.writeFile(path.join(binding.mountRoot,".autobyteus-nfs","storage.json"),'{}');
  await expect(check.checkForRun(project)).rejects.toThrow("storage identity differs");
  await fs.writeFile(path.join(binding.mountRoot,".autobyteus-nfs","storage.json"),JSON.stringify({storageId:id}));
  await fs.rmdir(project);await fs.writeFile(project,"not a directory");await expect(check.checkForRun(project)).rejects.toThrow("not a directory");
 });
 it("does not gate unrelated local work on a known-root malformed descriptor",async()=>{
  const {binding,descriptor}=await fixture();await fs.writeFile(descriptor,JSON.stringify({...binding,protocol:"bad"}));
  const check=new SharedWorkspaceBinding({descriptorPath:descriptor,observe:vi.fn()});
  expect(await check.checkForRun(path.join(root,"local"))).toBeNull();
  await expect(check.checkForRun(binding.mountRoot)).rejects.toThrow("invalid attachment");
 });
 it("rejects unreadable shape, not a fabricated local fallback",()=>{
  expect(()=>parseSharedMountBinding({mountRoot:"/",storageId:id})).toThrow();
  expect(isWithinSharedRoot("/shared","/shared-other")).toBe(false);
  expect(isWithinSharedRoot("/shared","/shared/../local")).toBe(false);
 });
 it("reads Linux daemon :/export and escaped mount paths",()=>{
  const row="1 2 0:90 / /Volumes/shared\\040root rw - nfs4 :/autobyteus/x rw,vers=4.1,addr=192.168.1.8";
  expect(parseLinuxSharedMount(row,"/Volumes/shared root")).toEqual({endpoint:"192.168.1.8",export:"/autobyteus/x",protocol:"4.1"});
  expect(parseLinuxSharedMount(row,"/other")).toBeNull();
 });
 it("reads Apple's actual rather than original version",()=>{
  expect(parseDarwinSharedMount("192.168.1.8:/source on /Volumes/shared (nfs, nodev)","-- Original mount options: vers=4.1\n-- Current mount parameters:\n NFS parameters: vers=3,proto=tcp,hard\n","/Volumes/shared")).toEqual({endpoint:"192.168.1.8",export:"/source",protocol:"3"});
 });
});

it("reads the service's cross-language descriptor contract fixture", async () => {
  const file = new URL("../../../../autobyteus-nfs/testdata/attachment.json", import.meta.url);
  const binding = parseSharedMountBinding(JSON.parse(await fs.readFile(file, "utf8")));
  expect(binding.storageId).toBe("5544dadc-86b0-43ba-9799-74728b442227");
  expect(binding.protocol).toBe("4.1");
  expect(binding.mountRoot).toBe("/Volumes/autobyteus-shared");
});
