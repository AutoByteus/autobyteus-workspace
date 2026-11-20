// Run from the official reviewed worktree. Prints no PEMs or private material.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const src = pathToFileURL(resolve('scripts/desktop-package') + '/');
const {api,inventory,complete} = await import(new URL('desktop-trust-state.mjs',src));
const {requireFirstUse} = await import(new URL('desktop-first-use.mjs',src));
const before=inventory((p,m='GET',...args)=>{
  assert.equal(m,'GET');
  return api(p,m,...args);
});
const fingerprint=complete(before);
assert.equal(before.claim,null);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),fingerprint,publicUpdated:before.publicUpdated,
  environment:before.environment.name,environmentId:before.environment.id,policy:before.policies,
  secretName:before.secret.name,secretUpdated:before.secret.updated_at,claimAbsent:true}));
let observed=[];
assert.throws(()=>requireFirstUse((p,m,b,j)=>{
  assert.ok(m==='GET' || (p==='graphql' && m==='POST' && b.query.trimStart().startsWith('query(')));
  const data=api(p,m,b,j);
  if(p==='graphql'){
    for(const release of data.data.repository.releases.nodes){
      for(const {name} of release.releaseAssets.nodes){
        if(/^AutoByteus_personal_linux-.*\.AppImage\.release\.json(?:\.sig)?$/i.test(name))
          observed.push([release.tagName,name]);
      }
    }
  }
  return data;
}),/Reconcile official release and signer history/);
assert.ok(observed.length>0,'Need actual conflicting history; access refusal alone is not enough.');
console.log('First-use refused; managed published sidecars observed:',JSON.stringify(observed));
