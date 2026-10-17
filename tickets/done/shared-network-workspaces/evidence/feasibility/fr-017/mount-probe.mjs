// Potentially blocking filesystem work is isolated in this exact child process.
import fs from 'node:fs/promises';
const cfg=JSON.parse(process.argv[2]);
try {
  const stat=await fs.statfs(cfg.mount);
  if (stat.type!==0x6969) throw Object.assign(new Error('Not an NFS filesystem'),{code:'NOT_NFS'});
  const value=JSON.parse(await fs.readFile(cfg.mount+'/.owned-identity/storage.json','utf8'));
  process.stdout.write(JSON.stringify({status:value.storageId===cfg.storageId?'READY':'WRONG_STORAGE',fsType:stat.type,actualStorageId:value.storageId})+'\n');
} catch(error) {
  process.stdout.write(JSON.stringify({status:error.code==='EACCES'?'PERMISSION_DENIED':'INDETERMINATE',code:error.code??'UNKNOWN',message:String(error)})+'\n');
}
