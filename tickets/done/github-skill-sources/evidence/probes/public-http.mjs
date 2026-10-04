// Temporary public GitHub HTTP probe. Requires own isolated-app launch receipt in evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const evidence = path.resolve('tickets/in-progress/github-skill-sources/evidence');
const receipt=JSON.parse(fs.readFileSync(path.join(evidence,'api-isolated-start.json'),'utf8'));
assert.equal(receipt.ok,true);const instance=receipt.result;
const query = async (source,variables={})=>{
  const r=await fetch(instance.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:source,variables})});
  const body=await r.json(); console.log(JSON.stringify({operation:source,variables,status:r.status,result:body}));
  assert.equal(r.status,200);assert.equal(body.errors,undefined);return body.data;
};
const fields='sourceId sourceKind path skillCount isDefault github { repositoryUrl installedRevision latestRevision latestCheckedAt status lastError }';
const mode=process.argv[2]||'import';
if(mode==='import'){
  const rows=[];
  for(const repo of ['blader/humanizer','squirrelscan/skills']){
    const result=await query(`mutation($url:String!){importGitHubSkillSource(repositoryUrl:$url){sources{${fields}} warnings}}`,{url:'https://github.com/'+repo});
    const row=result.importGitHubSkillSource.sources.find(r=>r.github?.repositoryUrl.toLowerCase()==='https://github.com/'+repo);
    assert.ok(row);assert.ok(row.skillCount>0);assert.equal(row.github.status,'UP_TO_DATE');
    if(repo==='blader/humanizer')assert.equal(row.skillCount,1);
    rows.push(row);
    const duplicate=await query(`mutation($url:String!){importGitHubSkillSource(repositoryUrl:$url){sources{${fields}} warnings}}`,{url:'https://github.com/'+repo+'.git/'});
    assert.ok(duplicate.importGitHubSkillSource.warnings.some(w=>w.includes('Already imported')));
  }
  const catalog=await query('{ skills { name rootPath fileCount } }');
  assert.ok(catalog.skills.some(s=>s.name==='humanizer'));assert.ok(catalog.skills.length>=3);
  for(const row of rows)assert.ok(fs.existsSync(row.path));
  await query(`mutation {checkGitHubSkillSourceUpdates{sources{${fields}} warnings}}`);
  const reload=await query(`mutation {reloadSkillCatalog{skillSources{${fields}} skills{name rootPath} skillSourceRegistryError}}`);
  assert.equal(reload.reloadSkillCatalog.skillSourceRegistryError,null);
  fs.writeFileSync(path.join(evidence,'api-public-installed.json'),JSON.stringify({instanceId:instance.instanceId,rows,catalog},null,2)+'\n');
  console.log('PUBLIC_IMPORT_CHECK_RELOAD_PASS');
}else if(mode==='restart'){
  const expected=JSON.parse(fs.readFileSync(path.join(evidence,'api-public-installed.json'),'utf8'));
  assert.equal(expected.instanceId,instance.instanceId);
  const result=await query(`{skillSources{${fields}} skillSourceRegistryError}`);
  assert.equal(result.skillSourceRegistryError,null);
  for(const row of expected.rows)assert.deepEqual(result.skillSources.find(r=>r.sourceId===row.sourceId),row);
  console.log('PUBLIC_RESTART_PERSISTENCE_PASS');
}else if(mode==='remove'){
  const expected=JSON.parse(fs.readFileSync(path.join(evidence,'api-public-installed.json'),'utf8'));
  for(const row of expected.rows){
    const result=await query(`mutation($id:String!){removeGitHubSkillSource(sourceId:$id){sources{${fields}} warnings}}`,{id:row.sourceId});
    assert.equal(result.removeGitHubSkillSource.sources.some(r=>r.sourceId===row.sourceId),false);
    assert.equal(fs.existsSync(row.path),false);
  }
  console.log('PUBLIC_REMOVAL_PASS');
}
