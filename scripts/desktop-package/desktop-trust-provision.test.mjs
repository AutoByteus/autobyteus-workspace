// Disposable keys and private temp HOME only; no GitHub writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPublicKey } from 'node:crypto';
import { provision } from './generate-desktop-signing-key.mjs';
import { envName, pub, priv, lock, pattern, anchor, checkPolicy } from './desktop-trust-state.mjs';
function fixture(t,failAt=0) {
  const home=mkdtempSync(join(tmpdir(),'disposable-desktop-')); t.after(()=>rmSync(home,{recursive:true,force:true}));
  const s={claim:null,pem:null,environment:null,secret:null,policies:[]},writes=[];
  function record(action){writes.push(action); if(failAt===writes.length)throw Error('simulated interruption');}
  const options={home,read:()=>structuredClone(s),write:(path,method,body)=>{
    if(method==='POST' && body.name===lock){assert.equal(s.claim,null);s.claim=body.value;record('claim');}
    else if(method==='PUT'){assert.ok(s.claim);s.environment={name:envName,id:9,deployment_branch_policy:body.deployment_branch_policy,protection_rules:[{type:'branch_policy'}]};record('env');}
    else if(body?.type==='tag'){s.policies.push(body);record('tag');}
    else if(body?.name===pub){checkPolicy(s);s.pem=body.value;record('public');}
    else {assert.equal(method,'DELETE');assert.ok(s.secret);s.claim=null;record('unlock');}
  },upload:bytes=>{
    checkPolicy(s);assert.deepEqual(s.policies,[{type:'tag',name:pattern}]);
    const file=join(home,'.autobyteus-desktop-signing-backup','desktop.pem');
    assert.ok(readFileSync(file).equals(bytes));assert.equal(statSync(file).mode&0o777,0o600);
    assert.equal(anchor(createPublicKey(bytes).export({type:'spki',format:'pem'})),anchor(s.pem));
    s.secret={name:priv,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};record('upload');
  }};
  return {options,s,writes,home};
}
test('ordered first setup, sole backup, no accidental replacement',t=>{
  const {options,writes,home}=fixture(t);const m=provision(options);
  assert.deepEqual(writes,['claim','env','tag','public','upload','unlock']);
  assert.match(m.fingerprint,/^[a-f0-9]{64}$/);assert.doesNotMatch(JSON.stringify(m),/BEGIN PRIVATE/);
  assert.equal(statSync(join(home,'.autobyteus-desktop-signing-backup')).mode&0o777,0o700);
  assert.throws(()=>provision(options));assert.equal(writes.length,6);
});
for(let i=1;i<=6;i++)test('interruption after material write '+i+' cannot regenerate',t=>{
  const {options,s,writes,home}=fixture(t,i);assert.throws(()=>provision(options));
  assert.throws(()=>provision(options));assert.equal(writes.length,i);
  const dir=join(home,'.autobyteus-desktop-signing-backup');
  assert.equal(existsSync(dir)?readdirSync(dir).length:0,i===1?0:1);
  if(i<6)assert.ok(s.claim);
});
test('claimed or partial setup refuses before generation',t=>{
  const {s,options,writes}=fixture(t);s.claim='other';assert.throws(()=>provision(options));
  s.claim=null;s.pem='unexpected';assert.throws(()=>provision(options));assert.deepEqual(writes,[]);
});

import { gh, inventory, base, paged } from './desktop-trust-state.mjs';
import { uploadPrivate } from './generate-desktop-signing-key.mjs';
import { removeSavedBackup } from './desktop-key-custody.mjs';

test('stdin-only exact destination; child diagnostics not surfaced on failure',()=>{
  const input=Buffer.from('disposable secret fixture');
  assert.throws(()=>uploadPrivate(input,(args,bytes)=>gh(args,bytes,1000,(bin,passed,opts)=>{
    assert.deepEqual(passed,['secret','set',priv,'--env',envName,'--repo','AutoByteus/autobyteus-workspace']);
    assert.equal(bin,'gh');assert.equal(opts.input,input);assert.ok(!JSON.stringify(opts.env).includes(input.toString()));
    assert.equal(opts.env.GH_DEBUG,undefined);return {status:1,stdout:input,stderr:input};
  })),err=>err.message.includes('unknown')&&!err.message.includes(input.toString()));
});
test('claim race is create-only; second operator cannot create file',t=>{
  const {options,home}=fixture(t);
  options.write=(path,method,body)=>{assert.equal(method,'POST');assert.equal(body.name,lock);throw Error('create conflict');};
  assert.throws(()=>provision(options));assert.equal(existsSync(join(home,'.autobyteus-desktop-signing-backup')),false);
});
test('explicit saved confirmation and exact backup identity required',t=>{
  const {options}=fixture(t),m=provision(options);
  const arg={file:m.backup,home:options.home,fingerprint:m.fingerprint,identity:m.backupIdentity};
  for(const change of [{},{saved:true,identity:'other'},{saved:true,fingerprint:'0'.repeat(64)}]){
    assert.throws(()=>removeSavedBackup({...arg,...change}));assert.ok(existsSync(m.backup));
  }
  removeSavedBackup({...arg,saved:true});assert.equal(existsSync(m.backup),false);
});
test('inventory fails closed on wider declarations, shadow/claim, denied or truncated lists',()=>{
  function read(bad){
    return inventory((path)=>{
      if(path===base)return {full_name:'AutoByteus/autobyteus-workspace',admin:true};
      if(path===base+'/actions/variables/'+pub)return null;
      const endpoint=path.slice(base.length).split('?')[0];
      if(endpoint==='/actions/secrets' && bad==='denied')throw Error('denied');
      if(endpoint==='/actions/secrets' && bad==='truncated')return {total_count:1,items:[]};
      let items=[];
      if(bad===endpoint)items=[endpoint.includes('variables')?pub:priv];
      if(endpoint==='/environments')items=[{id:1,name:'other'}];
      if(endpoint==='/environments/other/secrets'&&bad===endpoint)items=[{name:priv}];
      return {total_count:items.length,items};
    });
  }
  for(const bad of ['denied','truncated','/actions/variables','/actions/organization-variables','/actions/organization-secrets','/actions/secrets','/environments/other/variables','/environments/other/secrets'])assert.throws(()=>read(bad));
  assert.equal(read('clean').pem,null);
  let calls=0;
  const rows=paged('test','names','.',()=>({total_count:101,items:++calls===1?Array.from({length:100},(_,i)=>String(i)):['last']}));
  assert.equal(rows.length,101);assert.equal(calls,2);
});
test('disposable rotation checks the prior witness and fingerprint; unused on production',t=>{
  const {options,s}=fixture(t);const initial=provision(options);
  removeSavedBackup({saved:true,home:options.home,file:initial.backup,identity:initial.backupIdentity,fingerprint:initial.fingerprint});
  const rotate={...options,expected:initial.fingerprint,existingWitness:()=>({fingerprint:initial.fingerprint}),
    upload:bytes=>{assert.equal(anchor(createPublicKey(bytes).export({type:'spki',format:'pem'})),anchor(s.pem));
      s.secret={...s.secret,updated_at:'2026-01-02T00:00:00Z'};}};
  assert.throws(()=>provision({...rotate,expected:'0'.repeat(64)}));
  assert.throws(()=>provision({...rotate,existingWitness:()=>{throw Error('unproven');}}));
  const next=provision(rotate);assert.notEqual(next.backup,initial.backup);assert.notEqual(next.fingerprint,initial.fingerprint);
});

test('unsafe directory or existing destination never overwritten',t=>{
  const {options,writes,home}=fixture(t),dir=join(home,'.autobyteus-desktop-signing-backup');
  mkdirSync(dir,{mode:0o700});chmodSync(dir,0o755);assert.throws(()=>provision(options));
  chmodSync(dir,0o700);writeFileSync(join(dir,'desktop.pem'),'nonsecret sentinel');
  assert.throws(()=>provision(options));assert.deepEqual(writes,[]);assert.equal(readFileSync(join(dir,'desktop.pem'),'utf8'),'nonsecret sentinel');
});
test('changed protection or lost claim refuses before upload and preserves custody',t=>{
  for(const failure of ['policy','claim']){
    const {options,s,writes,home}=fixture(t);
    const write=options.write;
    options.write=(...args)=>{write(...args);if(args[2]?.name===pub){
      if(failure==='claim')s.claim='other';else s.policies.push({name:'main',type:'branch'});
    }};
    assert.throws(()=>provision(options));assert.ok(!writes.includes('upload'));assert.ok(s.claim);
    assert.equal(readdirSync(join(home,'.autobyteus-desktop-signing-backup')).length,1);
  }
});

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('CLI refuses tracing before it can acquire a claim or generate material',()=>{
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('./generate-desktop-signing-key.mjs',import.meta.url))],{
    env:{PATH:'/usr/bin:/bin',NODE_DEBUG:'child_process'},encoding:'utf8'});
  assert.equal(r.status,1);assert.match(r.stderr,/clean Node invocation/);assert.equal(r.stdout,'');
});
