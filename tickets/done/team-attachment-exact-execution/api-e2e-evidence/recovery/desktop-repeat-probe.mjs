// Temporary real packaged desktop probe; only owned copied state, no production profile.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareElectronE2ELaunch } from '../../../../../autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs';
import { launchPreparedElectronDirect } from '../../../../../autobyteus-web/scripts/electron-e2e/directElectronProcessAdapter.mjs';
const evidence = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.resolve(evidence, '../../../../..');
const base = (await fs.readFile(path.join(evidence, 'installed-copy-root.txt'), 'utf8')).trim();
const root = path.join(base, 'desktop');
if (!base.includes('/autobyteus-recovery-installed-')) throw Error('Not owned');
await fs.unlink(path.join(root,'stop')); 
const env={...process.env, AUTOBYTEUS_AGENT_PACKAGE_ROOTS:'', LMSTUDIO_HOSTS:'http://127.0.0.1:3432'};
for(const key of ['RUST_LOG','DATABASE_URL','DATABASE_URL_TEST','AUTOBYTEUS_MEMORY_DIR','ELECTRON_RUN_AS_NODE']) delete env[key];
const prepared=await prepareElectronE2ELaunch({build:false,webRoot:path.join(worktree,'autobyteus-web'),dataRoot:root,port:3431,sourceEnv:env});
const session=await launchPreparedElectronDirect(prepared);
try {
 const started=Date.now();
 await session.waitUntilReady(600000);
 await fs.writeFile(path.join(evidence,'desktop-repeat-ready.json'),JSON.stringify({...session.metadata,startupMs:Date.now()-started,ready:true},null,2));
 console.log('CANDIDATE_DESKTOP_READY');
 // Remain alive only while the UI validation is in progress.
 while(true){try{await fs.access(path.join(root,'stop'));break;}catch{} await new Promise(resolve=>setTimeout(resolve,1000));}
}finally{
 await fs.writeFile(path.join(evidence,'desktop-repeat-cleanup.json'),JSON.stringify(await session.cleanup(),null,2));
}
