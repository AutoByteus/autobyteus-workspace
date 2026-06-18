#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { execFile, spawn } from 'node:child_process'
import { createServer, createConnection } from 'node:net'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import process from 'node:process'

const sourceApp = process.argv[2] ? path.resolve(process.argv[2]) : ''
const artifactsDir = process.argv[3] ? path.resolve(process.argv[3]) : ''
const sourcePort = '29695'
const targetPort = '29696'
const summaryPath = path.join(artifactsDir, 'packaged-ui-terminal-visual-summary-round2.json')
const screenshotPath = path.join(artifactsDir, 'packaged-ui-terminal-visual-round2.png')
if (!sourceApp || !artifactsDir) process.exit(2)
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function run(cmd,args,opts={}){return new Promise((res,rej)=>{execFile(cmd,args,opts,(e,stdout,stderr)=>e?rej(Object.assign(e,{stdout,stderr})):res({stdout,stderr}))})}
async function portFree(port){return new Promise((res,rej)=>{const s=createServer();s.once('error',rej);s.listen(Number(port),'127.0.0.1',()=>s.close(res))})}
async function waitPort(port, child){const end=Date.now()+120000;while(Date.now()<end){if(child.exitCode!==null)throw new Error(`app exited ${child.exitCode}`);try{await new Promise((res,rej)=>{const c=createConnection({host:'127.0.0.1',port:Number(port)},()=>{c.end();res()});c.once('error',rej);setTimeout(()=>{c.destroy();rej(new Error('timeout'))},1000) });return true}catch{} await delay(500)}throw new Error(`port ${port} not listening`) }
async function patchApp(){await portFree(targetPort);const tmp=await mkdtemp(path.join(os.tmpdir(),'autobyteus-ui-visual-bin-'));const app=path.join(tmp,'AutoByteus.app');await cp(sourceApp,app,{recursive:true,dereference:false,preserveTimestamps:true});const asarPath=path.join(app,'Contents','Resources','app.asar');const buf=Buffer.from(await readFile(asarPath));let portCount=0;const oldPort=Buffer.from(sourcePort);const newPort=Buffer.from(targetPort);for(let off=buf.indexOf(oldPort);off!==-1;off=buf.indexOf(oldPort,off+newPort.length)){newPort.copy(buf,off);portCount++}const oldRoute=Buffer.from('p("/agents",{replace:!0})');const newRoute=Buffer.from('p("/workspace")/*xxxxxx*/');if(oldRoute.length!==newRoute.length)throw new Error('route replacement length mismatch');let routeCount=0;for(let off=buf.indexOf(oldRoute);off!==-1;off=buf.indexOf(oldRoute,off+newRoute.length)){newRoute.copy(buf,off);routeCount++}if(routeCount<1)throw new Error('route redirect pattern not found');await writeFile(asarPath,buf);const hash=createHash('sha256').update(buf).digest('hex');await run('/usr/libexec/PlistBuddy',['-c',`Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`,path.join(app,'Contents','Info.plist')]);return{tmp,app,hash,portCount,routeCount}}
async function main(){const summary={startedAt:new Date().toISOString(),sourceApp,sourcePort,targetPort,result:'UNKNOWN'};let info=null, child=null, home=null;try{info=await patchApp();summary.patch=info;home=await mkdtemp(path.join(os.tmpdir(),'autobyteus-ui-visual-home-'));summary.home=home;const exe=path.join(info.app,'Contents','MacOS','AutoByteus');const out=path.join(artifactsDir,'packaged-ui-terminal-visual-stdout-round2.log');const err=path.join(artifactsDir,'packaged-ui-terminal-visual-stderr-round2.log');child=spawn(exe,[],{env:{...process.env,HOME:home},stdio:['ignore','pipe','pipe']});child.stdout.pipe(createWriteStream(out));child.stderr.pipe(createWriteStream(err));summary.pid=child.pid;await waitPort(targetPort,child);summary.portListening=true;await delay(20000);try{await run('osascript',['-e',`tell application "System Events" to set frontmost of first process whose unix id is ${child.pid} to true`])}catch(e){summary.frontmostError=e.message}await delay(1000);await run('screencapture',['-x',screenshotPath]);summary.screenshotPath=screenshotPath;summary.result='PASS'}catch(e){summary.result='FAIL';summary.error=e instanceof Error?(e.stack||e.message):String(e);throw e}finally{if(child&&child.exitCode===null){child.kill('SIGTERM');await delay(3000);if(child.exitCode===null)child.kill('SIGKILL')}if(info?.tmp){await rm(info.tmp,{recursive:true,force:true}).catch(()=>{}) ; summary.appCopyRemoved=true}if(home){await rm(home,{recursive:true,force:true}).catch(()=>{});summary.homeRemoved=true}summary.completedAt=new Date().toISOString();await writeFile(summaryPath,JSON.stringify(summary,null,2)+'\n','utf8')}console.log(JSON.stringify(summary,null,2))}
main().catch(e=>{console.error(e instanceof Error?(e.stack||e.message):String(e));process.exit(1)})
