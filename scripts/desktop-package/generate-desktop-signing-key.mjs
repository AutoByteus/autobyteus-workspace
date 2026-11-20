#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { constants, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, realpathSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { userInfo } from 'node:os';
import { pathToFileURL } from 'node:url';
import { api, gh, envName, envPath, base, repo, priv, pub, lock, pattern, anchor, complete, checkPolicy, inventory, requireState } from './desktop-trust-state.mjs';

import { check } from './check-release-trust.mjs';
import { removeSavedBackup } from './desktop-key-custody.mjs';

const vars=base+'/actions/variables';
export function uploadPrivate(bytes,invoke=gh) { invoke(['secret','set',priv,'--env',envName,'--repo',repo],bytes); }
export function provision({read=inventory,write=api,upload=uploadPrivate,
  home=userInfo().homedir,expected=null,existingWitness=check}={}) {
  process.umask(0o077);
  const h=lstatSync(home), uid=process.getuid(), nonce=randomUUID();
  requireState(uid!==0 && realpathSync(home)===home && h.uid===uid && !(h.mode&0o022),'Trusted login home required');
  for(let p=home;;p=dirname(p)){
    requireState(!existsSync(join(p,'.git')),'Backup must be outside Git');
    if(dirname(p)===p)break;
  }
  const dir=join(home,'.autobyteus-desktop-signing-backup'),file=join(dir,expected?'desktop-'+nonce+'.pem':'desktop.pem');
  function local() {
    requireState(lstatSync(dir,{throwIfNoEntry:false})===undefined,
      'Backup directory already exists; stop and inspect custody before proceeding');
  }
  function prior(s,claim) {
    requireState(s.claim===claim,'Provisioning claim conflict; inspect before recovery');
    if(expected) requireState(/^[a-f0-9]{64}$/.test(expected)&&complete(s)===expected,'Existing configuration/fingerprint differs');
    else requireState(s.pem===null && !s.environment && !s.secret,'Existing or partial desktop trust; do not replace it');
  }
  local();const initial=read();prior(initial,null);
  if(expected)requireState(existingWitness().fingerprint===expected,'Rotation requires proof of existing configuration');
  function samePrior(claim) {
    const state=read();prior(state,claim);
    requireState(state.publicUpdated===initial.publicUpdated && state.environment?.id===initial.environment?.id && state.environment?.updated_at===initial.environment?.updated_at &&
      JSON.stringify(state.secret)===JSON.stringify(initial.secret),'Existing generation changed');
  }
  // POST is create-only. Never clean up on ambiguous writes or after a partial setup.
  write(vars,'POST',{name:lock,value:nonce}); samePrior(nonce);local();
  mkdirSync(dir,{mode:0o700});
  const fd=openSync(file,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  let bytes,publicPem;
  try {
    const {privateKey,publicKey}=generateKeyPairSync('ed25519');
    publicPem=publicKey.export({type:'spki',format:'pem'});
    const challenge=Buffer.from(nonce);
    requireState(verify(null,challenge,publicKey,sign(null,challenge,privateKey)),'Local pair verification failed');
    bytes=Buffer.from(privateKey.export({type:'pkcs8',format:'pem'}));
    writeFileSync(fd,bytes);fsyncSync(fd);
  } finally {closeSync(fd);}
  try {
    const dfd=openSync(dir,'r');try{fsyncSync(dfd);}finally{closeSync(dfd);}
    samePrior(nonce);
    if(!expected) {
      write(envPath,'PUT',{deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}});
      write(envPath+'/deployment-branch-policies','POST',{name:pattern,type:'tag'});
    }
    const policy=read();checkPolicy(policy);
    requireState(policy.claim===nonce && (expected?complete(policy)===expected:policy.pem===null&&!policy.secret),'Trust changed before anchor write');
    write(expected?vars+'/'+pub:vars,expected?'PATCH':'POST',{name:pub,value:publicPem});
    const pre=read();checkPolicy(pre);
    const fingerprint=anchor(publicPem);
    requireState(pre.claim===nonce && pre.environment.id===policy.environment.id && anchor(pre.pem)===fingerprint &&
      JSON.stringify(pre.secret)===JSON.stringify(policy.secret),'Trust changed before secret upload');
    upload(bytes);
    const final=read();
    requireState(final.claim===nonce && final.environment.id===pre.environment.id && complete(final)===fingerprint,'Post-upload verification incomplete');
    write(vars+'/'+lock,'DELETE');
    const done=read();
    requireState(done.claim===null && done.environment.id===final.environment.id && complete(done)===fingerprint &&
      done.secret.updated_at===final.secret.updated_at,'Final footprint changed');
    const st=lstatSync(file);
    return {backupIdentity:[st.dev,st.ino].join(':'),repo,environment:envName,id:done.environment.id,policies:done.policies,publicVariable:pub,secret:done.secret,fingerprint,
      verifiedAt:new Date().toISOString(),localPairVerified:true,backup:file,mode:'0600'};
  } finally {bytes.fill(0);}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);
  try {
    // NODE_DEBUG=child_process can print spawn options in the *parent*, including stdin.
    requireState(!process.execArgv.length && !['NODE_DEBUG','NODE_DEBUG_NATIVE','NODE_OPTIONS','NODE_V8_COVERAGE'].some(k=>process.env[k]),
      'Use a clean Node invocation without debugging, injection or tracing.');
    const core=spawnSync('/bin/sh',['-c','ulimit -c'],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'}});
    requireState(core.status===0 && core.stdout.trim()==='0','Disable core dumps (ulimit -c 0) before handling desktop keys.');
    if(args[0]==='--remove-saved-backup' && args.length===4) {
      removeSavedBackup({saved:true,fingerprint:args[1],identity:args[2],file:args[3]});
      console.log('Confirmed backup removed.');
    } else {
      requireState(args.length===0 || (args.length===2&&args[0]==='--replace'&&/^[a-f0-9]{64}$/.test(args[1])),'Usage: generator [--replace EXPECTED_OLD_SHA256] or --remove-saved-backup SHA256 DEV:INO PATH');
      console.log(JSON.stringify(provision({expected:args[1]})));
    }
  } catch(e){console.error('Stopped:',e.message);process.exitCode=1;}
}
