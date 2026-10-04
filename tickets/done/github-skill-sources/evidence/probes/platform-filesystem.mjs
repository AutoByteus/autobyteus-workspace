// Temporary platform probe; run against copied CURRENT built modules, not installed application.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { create, Header } from 'tar';
import { gzipSync } from 'node:zlib';
import { extractSkillRepositoryArchive } from './dist/skills/installers/skill-repository-archive.js';
import { assertOwnedDirectory } from './dist/skills/installers/managed-skill-paths.js';
import { WorkspaceSkillMaterializer } from './dist/agent-execution/backends/shared/workspace-skill-materializer.js';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'github-platform-'));
const write = (p, value) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, value); };
const record = (name, details={}) => console.log(JSON.stringify({case:name,result:'Pass',platform:process.platform,arch:process.arch,...details}));
try {
  const input = path.join(root,'input'), owned = path.join(root,'owned'); fs.mkdirSync(owned);
  write(path.join(input,'repo','SKILL.md'),'---\nname: platform\ndescription: fixture\n---\n');
  write(path.join(input,'repo','run.sh'),'#!/bin/sh\ntouch SHOULD_NOT_EXIST\n'); fs.chmodSync(path.join(input,'repo','run.sh'),0o755);
  fs.symlinkSync('run.sh',path.join(input,'repo','alias'));
  const archive=path.join(root,'safe.tgz'); await create({file:archive,cwd:input,gzip:true},['repo']);
  const output=path.join(owned,'extract');fs.mkdirSync(output);
  const extracted=await extractSkillRepositoryArchive(archive,output,owned);
  assert.equal(fs.statSync(path.join(extracted,'run.sh')).mode&0o777,0o755);
  assert.equal(fs.readFileSync(path.join(extracted,'alias'),'utf8'),fs.readFileSync(path.join(extracted,'run.sh'),'utf8'));
  assert.equal(fs.existsSync(path.join(extracted,'SHOULD_NOT_EXIST')),false);
  record('archive-safe-link-mode-no-execution');
  const blocks=[];
  for(const spec of [{path:'repo/',type:'Directory'},{path:'../outside',type:'File'}]) {const h=Buffer.alloc(512);new Header({...spec,mode:0o755,size:0}).encode(h);blocks.push(h);}
  blocks.push(Buffer.alloc(1024)); const bad=path.join(root,'bad.tgz');fs.writeFileSync(bad,gzipSync(Buffer.concat(blocks)));
  const badOutput=path.join(owned,'bad');fs.mkdirSync(badOutput);
  await assert.rejects(extractSkillRepositoryArchive(bad,badOutput,owned));assert.deepEqual(fs.readdirSync(badOutput),[]);
  record('archive-traversal-rejected');
  const external=path.join(root,'external');fs.mkdirSync(external);write(path.join(external,'keep'),'keep');
  fs.symlinkSync(external,path.join(owned,'substitute'),'dir');
  assert.throws(()=>assertOwnedDirectory(owned,path.join(owned,'substitute')));assert.equal(fs.readFileSync(path.join(external,'keep'),'utf8'),'keep');
  record('owned-directory-substitution-rejected');
  for(const retain of [false,true]) for(const reverse of [false,true]) for(const policy of ['fail','prefer_workspace']) {
    const dir=path.join(root,`case-${retain}-${reverse}-${policy}`), g1=path.join(dir,'g1'),g2=path.join(dir,'g2'),workspace=path.join(dir,'workspace');
    write(path.join(g1,'SKILL.md'),'g1');write(path.join(g2,'SKILL.md'),'g2');
    let skill={name:'writer',rootPath:g1,managedSource:{sourceId:'source',generation:'g1'}};
    const materializer=new WorkspaceSkillMaterializer({runtimeLabel:'probe',workspaceSkillsRootSegments:['.codex','skills']},{resolveManagedSkill:()=>skill});
    const run=()=>materializer.materializeConfiguredWorkspaceSkills({runId:'probe',workingDirectory:workspace,workspaceCollisionPolicy:policy,requests:[{kind:'expose-resolved',skill}]});
    const a=await run();if(!retain)fs.rmSync(g1,{recursive:true});skill={...skill,rootPath:g2,managedSource:{sourceId:'source',generation:'g2'}};
    const b=await run(),link=b.materializedSkills[0].materializedRootPath;
    assert.equal(fs.readFileSync(path.join(link,'SKILL.md'),'utf8'),'g2');
    const order=reverse?[b,a]:[a,b];await materializer.cleanupMaterializedWorkspaceSkills(order[0].materializedSkills);assert.equal(fs.lstatSync(link).isSymbolicLink(),true);
    await materializer.cleanupMaterializedWorkspaceSkills(order[1].materializedSkills);assert.equal(fs.existsSync(link),false);
    record('native-link-transfer-release',{retain,reverse,policy});
  }
  // Unprivileged native permission denial, not an injected filesystem exception.
  const dir=path.join(root,'permission'), g1=path.join(dir,'g1'),g2=path.join(dir,'g2'),workspace=path.join(dir,'workspace');
  write(path.join(g1,'SKILL.md'),'g1');write(path.join(g2,'SKILL.md'),'g2');
  let skill={name:'writer',rootPath:g1,managedSource:{sourceId:'source',generation:'g1'}};
  const materializer=new WorkspaceSkillMaterializer({runtimeLabel:'probe',workspaceSkillsRootSegments:['.codex','skills']},{resolveManagedSkill:()=>skill});
  const run=()=>materializer.materializeConfiguredWorkspaceSkills({runId:'probe',workingDirectory:workspace,requests:[{kind:'expose-resolved',skill}]});
  const a=await run(),link=a.materializedSkills[0].materializedRootPath, parent=path.dirname(link);
  skill={...skill,rootPath:g2,managedSource:{sourceId:'source',generation:'g2'}};
  fs.chmodSync(parent,0o555);
  try {await assert.rejects(run(),/EACCES|EPERM/);} finally {fs.chmodSync(parent,0o755);}
  assert.equal(fs.readFileSync(path.join(link,'SKILL.md'),'utf8'),'g1');
  const b=await run();await materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);assert.equal(fs.readFileSync(path.join(link,'SKILL.md'),'utf8'),'g2');
  await materializer.cleanupMaterializedWorkspaceSkills(b.materializedSkills);assert.equal(fs.existsSync(link),false);
  record('native-permission-failure-retains-holders-and-retry');
} finally {fs.rmSync(root,{recursive:true,force:true});console.log(JSON.stringify({cleanup:!fs.existsSync(root)}));}
