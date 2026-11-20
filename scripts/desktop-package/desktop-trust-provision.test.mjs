// Disposable keys and private temp HOME only; no GitHub writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPublicKey } from 'node:crypto';
import { historyFixture } from './test-fixtures/first-use-history.mjs';
import { provision } from './generate-desktop-signing-key.mjs';
import { envName, pub, priv, lock, pattern, anchor, checkPolicy } from './desktop-trust-state.mjs';
function fixture(t,failAt=0) {
  const home=mkdtempSync(join(tmpdir(),'disposable-desktop-')); t.after(()=>rmSync(home,{recursive:true,force:true}));
  const s={claim:null,pem:null,environment:null,secret:null,policies:[]},writes=[];
  function record(action){writes.push(action); if(failAt===writes.length)throw Error('simulated interruption');}
  const history=historyFixture();
  const options={home,historyRequest:history.request,read:()=>structuredClone(s),write:(path,method,body)=>{
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
  return {options,s,writes,home,history};
}
test('ordered first setup, sole backup, no accidental replacement',t=>{
  const {options,writes,home,history}=fixture(t);const m=provision(options);
  assert.equal(history.calls[0],'graphql');
  assert.ok(history.calls.some(p=>p.includes('/attempts/1/jobs?')));
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


for(const [scenario,change] of Object.entries({
  'one prior signed sidecar on an older release':h=>{h.releases.nodes[1].releaseAssets.nodes[0].name='AutoByteus_personal_linux-arm64-1.5.13.AppImage.release.json.sig';},
  'prior signer executed but assets absent':h=>{h.job.conclusion='success';},
  'prior ambiguous execution':h=>{h.job.conclusion='failure';},
  'active managed release':h=>{h.run.status='in_progress';},
  'release metadata denied':h=>{h.denied='graphql';},
  'job metadata denied':h=>{h.denied='/jobs?';},
  'release disappeared':h=>{h.releases.nodes.shift();h.releases.totalCount--;},
  'previously observed run unavailable':h=>{h.runs.length=0;},
  'unknown workflow code':h=>{h.file.sha='e'.repeat(40);},
  'partial release page':h=>{h.releases.totalCount++;},
  'partial asset listing':h=>{h.releases.nodes[1].releaseAssets.pageInfo.hasNextPage=true;},
  'attempt mismatch':h=>{h.job.run_attempt=2;},
  'missing signer':h=>{h.jobs.length=0;},
  'earlier successful attempt later skipped':h=>{h.run.run_attempt=2;h.job.conclusion='success';},
}))test('empty settings do not allow first provisioning: '+scenario,t=>{
  const {options,history,writes,home}=fixture(t);
  change(history);
  assert.throws(()=>provision(options),/Reconcile official release/);
  assert.deepEqual(writes,[]); // claim, settings, stdin upload: all untouched
  assert.deepEqual(readdirSync(home),[]); // no backup directory/file or new key
});

test('complete paginated history with unsigned legacy workflow and originally skipped managed signer permits first setup',t=>{
  const {options,history:h,writes}=fixture(t);
  const legacy={...h.run,id:234,head_sha:'d'.repeat(40),head_branch:'v1.5.13',run_attempt:2};
  h.runs.push(legacy);
  const more=Array.from({length:24},(_,i)=>({...h.releases.nodes[1],id:'historical-'+i}));
  const all=[...more,...h.releases.nodes]; let pages=0;
  options.historyRequest=(path,method,body,...rest)=>{
    if(path==='graphql'){
      const second=++pages===2;
      assert.equal(body.variables.cursor,second?'page-1':null);
      return {data:{repository:{nameWithOwner:'AutoByteus/autobyteus-workspace',releases:{
        nodes:second?all.slice(25):all.slice(0,25),totalCount:26,pageInfo:{hasNextPage:!second,endCursor:'page-1'}
      }}}};
    }
    if(path.endsWith('ref='+legacy.head_sha))return {...h.file,sha:'bac612b9d71a4832bb91945e885e941ec312dc97'};
    return h.request(path,method,body,...rest);
  };
  provision(options);assert.equal(pages,2);assert.equal(writes.at(0),'claim');assert.equal(writes.at(-1),'unlock');
});

test('scope conflict appearing during read-only history inspection still refuses before claim',t=>{
  const {options,history,s,writes,home}=fixture(t);
  options.historyRequest=(...args)=>{s.claim='another-custodian';return history.request(...args);};
  assert.throws(()=>provision(options),/claim conflict/);
  assert.deepEqual(writes,[]);assert.deepEqual(readdirSync(home),[]);
});
