import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {prepareElectronE2ELaunch} from '../../../../../autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs';
import {launchPreparedElectronDirect} from '../../../../../autobyteus-web/scripts/electron-e2e/directElectronProcessAdapter.mjs';
const p=path.dirname(new URL(import.meta.url).pathname),w=path.resolve(p,'../../../../..'),root=(await fs.readFile(path.join(p,'owned-root.txt'),'utf8')).trim();const results=[];
for(const variant of ['baseline','candidate']){
 const dataRoot=path.join(root,variant+'-desktop');await fs.mkdir(dataRoot,{mode:0o700});if(spawnSync('cp',['-cR',path.join(root,'snapshot'),path.join(dataRoot,'server-data')]).status!==0)throw Error('copyfailed');
 const sourceEnv={...process.env,LMSTUDIO_HOSTS:'http://127.0.0.1:3442',AUTOBYTEUS_AGENT_PACKAGE_ROOTS:''};for(const k of ['DATABASE_URL','DATABASE_URL_TEST','AUTOBYTEUS_MEMORY_DIR','RUST_LOG','ELECTRON_RUN_AS_NODE'])delete sourceEnv[k];
 const prepared=await prepareElectronE2ELaunch({build:false,webRoot:path.join(w,'autobyteus-web'),executablePath:variant==='baseline'?'/Applications/AutoByteus.app/Contents/MacOS/AutoByteus':undefined,dataRoot,port:3443,sourceEnv});
 const start=performance.now();const session=await launchPreparedElectronDirect(prepared);
 try{await session.waitUntilReady(600000);results.push({variant,startupMs:performance.now()-start,...session.metadata});await fs.writeFile(path.join(p,'desktop-results.json'),JSON.stringify(results,null,2));console.log(variant+' desktop ready');
 if(variant==='candidate'){while(true){try{await fs.access(path.join(dataRoot,'stop'));break;}catch{}await new Promise(r=>setTimeout(r,500));}}
 }finally{await fs.writeFile(path.join(p,variant+'-desktop-cleanup.json'),JSON.stringify(await session.cleanup(),null,2));}
}
