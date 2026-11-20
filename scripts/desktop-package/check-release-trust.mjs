#!/usr/bin/env node
// Read-only GitHub evidence. Never consult the backup, decrypt a secret or run tagged code.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { api, base, complete, gh, inventory, paged, repo, requireState } from './desktop-trust-state.mjs';
import { channelFor, verifyRecord } from './release-record.mjs';

const workflow='.github/workflows/release-desktop.yml';
const jobName='Sign authenticated Linux desktop releases';
const stepName='Sign final AppImages and verify metadata against the embedded public anchor';
// Reviewed at a728fbcad3: tag-only push entry, tagged checkout, protected job,
// private/public equality and verification of both final images. Review changes to these pins.
export const codePins=Object.freeze({
  [workflow]:'70da78493e048bfba5549709a4b185172cf78d2a49a7fc1e77d82de8ac3c3736',
  'scripts/desktop-package/sign-release.mjs':'4350754fce07acb6d5ce21f6aa22174fc3222b05f634efab606f62c45160ef1e',
  'scripts/desktop-package/release-record.mjs':'4f46536cb2de9c8d1eda118b164d81a34718326a21e04c801b17c24f2814a722',
  'scripts/desktop-package/verify-release.mjs':'5e4d9bcda89c527e6788a9768754fdf45e44be926110e39156db028562d4c20f',
  'scripts/validate_linux_updater_metadata.py':'edcf60cda28b01cd443f97e8820e72e49092b0af6ff39d4a12bb2d060ddc182a',
});
class Unproven extends Error {}
const proof=(ok)=>{if(!ok)throw new Unproven('Production signing not yet proven for this key; no tag created. Check the protected tagged release, signer code and both published signatures.');};
const id=n=>Number.isSafeInteger(n)&&n>0;
const timestamp=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s)?Date.parse(s):NaN;
function configured(s){
  requireState(s.claim===null,'Desktop trust setup is in progress; contact the custodian.');return complete(s);
}
export function verifyWitness(s,run,source) {
  const fingerprint=configured(s);
  proof(run.event==='push' && run.status==='completed' && run.conclusion==='success' &&
    run.repository?.full_name===repo && run.head_repository?.full_name===repo && run.path===workflow &&
    id(run.id)&&id(run.run_attempt)&&/^[0-9a-f]{40}$/.test(run.head_sha) &&
    typeof run.head_branch==='string' && /^v\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(run.head_branch));
  const tag=run.head_branch, version=tag.slice(1);
  try{channelFor(version);}catch{proof(false);}
  const jobs=source.jobs(run).filter(j=>j.name===jobName);
  proof(jobs.length===1);
  const j=jobs[0],start=timestamp(j.started_at);
  proof(start<=timestamp(run.updated_at) && j.run_id===run.id && j.run_attempt===run.run_attempt && j.head_sha===run.head_sha && j.status==='completed' && j.conclusion==='success' &&
    j.steps?.filter(x=>x.name===stepName && x.status==='completed' && x.conclusion==='success').length===1);
  for(const t of [s.publicUpdated,s.secret.created_at,s.secret.updated_at,s.environment.created_at,s.environment.updated_at])proof(timestamp(t)<start);
  proof(source.tagCommit(tag)===run.head_sha);
  for(const [file,pin] of Object.entries(codePins))proof(source.codeDigest(run.head_sha,file)===pin);
  const release=source.release(tag);
  proof(release.tag_name===tag && release.draft===false && id(release.id) && Array.isArray(release.assets));
  function asset(name,max){
    const matches=release.assets.filter(a=>a.name===name);proof(matches.length===1);
    const a=matches[0];proof(id(a.id)&&a.state==='uploaded'&&id(a.size)&&a.size<=max&&timestamp(a.updated_at)>=start);
    const data=source.bytes(a.id,max);proof(data.length===a.size);return data;
  }
  for(const arch of ['x64','arm64']){
    const name='AutoByteus_personal_linux-'+arch+'-'+version+'.AppImage.release.json';
    const bytes=asset(name,4096),signature=asset(name+'.sig',88);
    try {const r=verifyRecord(bytes,signature.toString('latin1'),s.pem);proof(r.version===version && r.arch===arch);}
    catch{proof(false);}
  }
  return {fingerprint,tag,sha:run.head_sha,runId:run.id,attempt:run.run_attempt};
}
const github={
  jobs:run=>paged(base+'/actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs','jobs'),
  tagCommit(tag){
    const ref=api(base+'/git/ref/tags/'+tag);proof(ref.ref==='refs/tags/'+tag);let o=ref.object;
    for(let i=0;i<4&&o.type==='tag';i++){proof(/^[0-9a-f]{40}$/.test(o.sha));o=api(base+'/git/tags/'+o.sha).object;}
    proof(o.type==='commit');return o.sha;
  },
  codeDigest(sha,file){
    const f=api(base+'/contents/'+file+'?ref='+sha);
    proof(f.type==='file'&&f.encoding==='base64'&&f.path===file&&f.size<=131072);
    const bytes=Buffer.from(f.content,'base64');proof(bytes.length===f.size);
    return createHash('sha256').update(bytes).digest('hex');
  },
  release:tag=>api(base+'/releases/tags/'+tag),
  bytes:(asset,limit)=>gh(['api','--hostname','github.com','-H','Accept: application/octet-stream',base+'/releases/assets/'+asset],undefined,limit),
};
function* candidates(runId) {
  if(runId!==undefined){
    requireState(/^[1-9]\d*$/.test(runId)&&id(Number(runId)),'Invalid explicit signing witness run ID');
    const run=api(base+'/actions/runs/'+runId);proof(run.id===Number(runId));yield run;return;
  }
  for(let page=1;page<=3;page++){
    const result=api(base+'/actions/workflows/release-desktop.yml/runs?event=push&status=success&per_page=20&page='+page);
    requireState(Array.isArray(result.workflow_runs),'Unable to inspect release runs');
    yield* result.workflow_runs;
    if(result.workflow_runs.length<20)return;
  }
}
export function check({read=inventory,runs=candidates(process.env.DESKTOP_RELEASE_WITNESS_RUN_ID),source=github}={}){
  const state=read(),fingerprint=configured(state);
  for(const run of runs){
    try{
      if(timestamp(run.updated_at)<=timestamp(state.secret.updated_at))continue;
      const witness=verifyWitness(state,run,source);
      const current=read();
      requireState(configured(current)===fingerprint && current.environment.id===state.environment.id && current.publicUpdated===state.publicUpdated &&
        current.environment.updated_at===state.environment.updated_at && current.secret.updated_at===state.secret.updated_at &&
        current.secret.created_at===state.secret.created_at,'Trust configuration changed during inspection');
      return witness;
    }catch(e){if(!(e instanceof Unproven))throw e;}
  }
  proof(false);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    for(const args of [[],['--push']]){
      const remote=spawnSync('git',['-C',fileURLToPath(new URL('../../',import.meta.url)),'remote','get-url','--all',...args,'origin'],{encoding:'utf8'});
      requireState(remote.status===0 && /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)AutoByteus\/autobyteus-workspace(?:\.git)?$/.test(remote.stdout.trim()),'Verify the official origin fetch/push destinations.');
    }
    console.log('Desktop signing witness:',check());
  }
  catch(err){console.error(err.message,'Verify official GitHub access and desktop signing configuration before retrying.');process.exitCode=1;}
}
