// Inert payloads only. Disposable offline container; never run on host.
// docker run --rm -i --network none --entrypoint node autobyteus/autobyteus-server:beta - < protected-update-feasibility.cjs
const fs=require('node:fs'), cr=require('node:crypto'), cp=require('node:child_process'), assert=require('node:assert/strict');
assert(fs.existsSync('/.dockerenv') && process.getuid()===0);
const root=fs.mkdtempSync('/tmp/autobyteus-model-'), file=root+'/version'; fs.chmodSync(root,0o755);
const {privateKey,publicKey}=cr.generateKeyPairSync('ed25519');
fs.writeFileSync(file,'1',{mode:0o644});
for(const [value,valid] of [['2',true],['3',false],['3',true]]){
 const payload=Buffer.from(value),sig=cr.sign(null,valid?payload:Buffer.from('tampered'),privateKey);
 const src="const fs=require('node:fs');try{fs.writeFileSync(process.env.TARGET,'unexpected');process.exit(11)}catch(e){if(e.code!=='EACCES')throw e} process.stdout.write(process.env.REQUEST)";
 const request=cp.execFileSync(process.execPath,['-e',src],{uid:65534,gid:65534,env:{TARGET:file,REQUEST:JSON.stringify([value,sig.toString('base64')])}});
 const [v,s]=JSON.parse(request), old=fs.readFileSync(file,'utf8');
 const ok=cr.verify(null,Buffer.from(v),publicKey,Buffer.from(s,'base64'));
 if(ok){fs.writeFileSync(file+'.new',v,{mode:0o644,flag:'wx'});fs.renameSync(file+'.new',file)}
 assert.equal(ok,valid);assert.equal(fs.readFileSync(file,'utf8'),valid?v:old);assert.equal(fs.statSync(file).uid,0);
 console.log('uid=65534 direct write refused; request',v,'verified',ok,'installed',fs.readFileSync(file,'utf8'));
}
