// Component-only causal reproduction using the immutable image's unmodified
// production materializer. No model calls or credential access.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { WorkspaceSkillMaterializer } from './dist/agent-execution/backends/shared/workspace-skill-materializer.js';

const [root, skillJson, runId] = process.argv.slice(2);
const skill = JSON.parse(skillJson);
const owner = new WorkspaceSkillMaterializer({runtimeLabel:'claude-causal-probe',workspaceSkillsRootSegments:['.claude','skills']});
const acquired = await owner.materializeConfiguredWorkspaceSkills({runId,workingDirectory:root,requests:[{kind:'expose-resolved',skill}],workspaceCollisionPolicy:'fail'});
const held = acquired.materializedSkills;
console.log(JSON.stringify({event:'ACQUIRED',held}));
async function inspect() {
  const p = held[0].materializedRootPath;
  const manifest = p + '/SKILL.md';
  let result;
  try {
    const z=await fs.readFile(manifest);
    result={exists:true,sha256:crypto.createHash('sha256').update(z).digest('hex'),linkTarget:await fs.readlink(p)};
  } catch(e) {result={exists:false,error:e.code};}
  result.privateSourceExists=await fs.stat(skill.rootPath+'/SKILL.md').then(()=>true,()=>false);
  return {event:'INSPECT',heldCount:held.length,materializedRoot:p,...result};
}
const lines=readline.createInterface({input:process.stdin});
for await (const line of lines) {
  if(line==='inspect')console.log(JSON.stringify(await inspect()));
  if(line==='release'){
    await owner.cleanupMaterializedWorkspaceSkills(held);
    console.log(JSON.stringify({event:'RELEASED'}));
  }
  if(line==='exit'){lines.close();break;}
}
