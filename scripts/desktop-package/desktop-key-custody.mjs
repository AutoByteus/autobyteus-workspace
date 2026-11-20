// Operator invokes ONLY after explicit founder confirmation. Never print key data.
import { constants,closeSync,existsSync,fstatSync,lstatSync,openSync,readFileSync,realpathSync,readdirSync,rmdirSync,unlinkSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createPublicKey } from 'node:crypto';
import { userInfo } from 'node:os';
import { anchor,requireState } from './desktop-trust-state.mjs';
export function removeSavedBackup({file,identity,fingerprint,saved,home=userInfo().homedir}) {
  const dir=join(home,'.autobyteus-desktop-signing-backup');
  requireState(saved===true && dirname(file)===dir && realpathSync(dir)===dir &&
    /^desktop(?:-[a-f0-9-]{36})?\.pem$/.test(basename(file)),'Explicit saved confirmation and exact local backup required');
  const d=lstatSync(dir), uid=process.getuid();
  requireState(uid!==0 && d.uid===uid && (d.mode&0o777)===0o700,'Unexpected custody directory');
  function owned(st){return st.isFile()&&st.uid===uid&&st.nlink===1&&(st.mode&0o777)===0o600&&[st.dev,st.ino].join(':')===identity && st.size<=1024;}
  requireState(owned(lstatSync(file)),'Unexpected backup identity');
  const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    requireState(owned(fstatSync(fd)),'Backup changed');
    const bytes=readFileSync(fd);
    try {requireState(anchor(createPublicKey(bytes).export({type:'spki',format:'pem'}))===fingerprint,'Backup fingerprint differs');}
    finally{bytes.fill(0);}
    requireState(owned(lstatSync(file)),'Backup changed before removal');
    unlinkSync(file);
  }finally{closeSync(fd);}
  if(!readdirSync(dir).length)rmdirSync(dir);
  requireState(!existsSync(file),'Backup removal not verified');
}
