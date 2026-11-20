// Inert signed metadata only; all keys are disposable and never enter remote settings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { codePins,check,verifyWitness } from './check-release-trust.mjs';
import { repo,envName,priv,pattern,anchor } from './desktop-trust-state.mjs';
import { encodeRecord, PRODUCT } from './release-record.mjs';
function fixture(){
  const a='2026-01-01T10:00:00Z', b='2026-01-01T10:01:00Z', c='2026-01-01T10:02:00Z';
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  const state={claim:null,pem:publicKey.export({type:'spki',format:'pem'}),publicUpdated:a,secret:{name:priv,created_at:a,updated_at:a},
    environment:{name:envName,id:2,created_at:a,updated_at:a,deployment_branch_policy:{protected_branches:false,custom_branch_policies:true},
    protection_rules:[{type:'branch_policy'}]},policies:[{type:'tag',name:pattern}]};
  const run={id:12,run_attempt:2,head_sha:'a'.repeat(40),head_branch:'v1.5.14-beta.2',event:'push',status:'completed',conclusion:'success',path:'.github/workflows/release-desktop.yml',
    head_repository:{full_name:repo},repository:{full_name:repo},updated_at:c};
  const job={run_id:12,run_attempt:2,head_sha:run.head_sha,name:'Sign authenticated Linux desktop releases',status:'completed',conclusion:'success',started_at:b,
    steps:[{name:'Sign final AppImages and verify metadata against the embedded public anchor',status:'completed',conclusion:'success'}]};
  const release={tag_name:run.head_branch,id:10,draft:false,assets:[]}, files=new Map();
  for(const arch of ['x64','arm64']){
    const record=encodeRecord({format:1,product:PRODUCT,artifact:'AppImage',os:'linux',arch,version:'1.5.14-beta.2',channel:'beta',size:100,sha256:'d'.repeat(64),minWriter:1});
    const signature=Buffer.from(sign(null,record,privateKey).toString('base64'));
    for(const [ext,bytes] of [['',record],['.sig',signature]]){
      const id=files.size+1;files.set(id,bytes);release.assets.push({id,name:'AutoByteus_personal_linux-'+arch+'-1.5.14-beta.2.AppImage.release.json'+ext,state:'uploaded',size:bytes.length,updated_at:c});
    }
  }
  const source={jobs:()=>[job],tagCommit:()=>run.head_sha,codeDigest:(_,p)=>codePins[p],release:()=>release,bytes:(id)=>files.get(id)};
  return {state,run,source,job,release,files,b};
}
test('current generation with both verified architectures; unrelated failed run not authoritative',()=>{
  const x=fixture();
  const result=check({read:()=>x.state,runs:[{...x.run,conclusion:'failure'},x.run],source:x.source});
  assert.equal(result.attempt,2);assert.equal(result.fingerprint,anchor(x.state.pem));
});
for(const [name,change] of Object.entries({
  'missing secret':x=>x.state.secret=null,'branch policy':x=>x.state.policies[0].type='branch',
  'extra policy':x=>x.state.policies.push({type:'tag',name:'*'}),'review gate':x=>x.state.environment.protection_rules.push({type:'required_reviewers'}),
  'setup claim':x=>x.state.claim='ongoing','public-only input':x=>x.state.pem=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}),
  'secret updated at job start':x=>x.state.secret.updated_at=x.b,'later creation':x=>x.state.secret.created_at=x.run.updated_at,
  'recreated env':x=>x.state.environment.created_at=x.b,'anchor overwritten':x=>x.state.publicUpdated=x.b,
  'job failed':x=>x.job.conclusion='failure','wrong attempt':x=>x.job.run_attempt=1,'wrong repo':x=>x.run.head_repository.full_name='other/repo',
  'manual run':x=>x.run.event='workflow_dispatch','unbound tag':x=>x.source.tagCommit=()=>'b'.repeat(40),
  'different signer code':x=>x.source.codeDigest=()=>null,'label only':x=>x.job.steps=[],
  'missing arch':x=>x.release.assets.pop(),'wrong version':x=>x.release.tag_name='v1.5.13',
  'superseded asset':x=>x.release.assets[0].updated_at=x.state.secret.created_at,
  'wrong public key':x=>x.state.pem=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'}),
  'invalid arm64 signature':x=>x.files.set(4,Buffer.alloc(88,97)),
  'metadata not record':x=>x.files.set(1,Buffer.from('bad')),
  'permission failure':x=>x.source.jobs=()=>{throw Error('denied');},
}))test(name+' refuses',()=>{const x=fixture();change(x);assert.throws(()=>verifyWitness(x.state,x.run,x.source));});
test('no successful current witness, including first bootstrap',()=>{const x=fixture();assert.throws(()=>check({read:()=>x.state,runs:[],source:x.source}),/no tag created/);});
