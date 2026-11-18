// Focused reviewer probe: actual TS owners, mock OS/updater/writer edges, synthetic profile only.
// Run from worktree root: node tickets/in-progress/ubuntu-appimage-sandbox-startup/evidence/CRR-001-lifecycle-probe.cjs
const fs=require('node:fs'), path=require('node:path'), os=require('node:os'), vm=require('node:vm');
const {createRequire}=require('node:module'), {EventEmitter}=require('node:events');
const root=process.cwd(), req=createRequire(path.join(root,'autobyteus-web/package.json')), ts=req('typescript');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'crr-001-'));
let native=new EventEmitter(); const noop=()=>{};
const app={isPackaged:true,getVersion:()=> '1.1.9',getPath:()=>profile,on:noop};
const electron={app,autoUpdater:{on:noop},ipcMain:{removeHandler:noop,handle:noop},BrowserWindow:{getAllWindows:()=>[]},net:{isOnline:()=>true}};
const cache=new Map();
function load(file){
 file=path.resolve(file); if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const local=(id)=>{
  if(id==='electron')return electron;
  if(id==='electron-updater')return {autoUpdater:native};
  if(/(^|\/)logger$/.test(id))return {logger:{info:noop,warn:noop,error:noop,debug:noop}};
  if(id.startsWith('.')){let next=path.resolve(path.dirname(file),id); if(fs.existsSync(next+'.ts'))return load(next+'.ts');}
  return req(id);
 };
 vm.runInThisContext('(function(require,module,exports,__dirname){'+code+'\n})',{filename:file})(local,m,m.exports,path.dirname(file));return m.exports;
}
const {AppUpdater}=load(root+'/autobyteus-web/electron/updater/appUpdater.ts');
const {ManagedUpdateSession}=load(root+'/autobyteus-web/electron/application/managedUpdateSession.ts');
const {ApplicationShutdown}=load(root+'/autobyteus-web/electron/application/applicationShutdown.ts');
const stage={id:'test-stage',baseline:'old',channel:'stable',identity:{version:'1.1.10',sha256:'new'}};
const tick=()=>new Promise(r=>setImmediate(r));
function setup({refuse=false,unknown=false}={}){
 native.removeAllListeners(); native.checkForUpdates=async()=>native.emit('update-available',{version:'1.1.10'});
 let downloads=0,activations=0,quits=0,exits=0,relaunches=0;
 native.downloadUpdate=async()=>{downloads++;native.emit('update-downloaded',{version:'1.1.10',downloadedFile:'/synthetic/cache.AppImage'})};
 native.setFeedURL=noop;native.quitAndInstall=()=>{throw Error('native bypass')};
 const writer={canonicalImage:'/synthetic/canonical.AppImage',stage:async()=>stage,discard:async()=>{},activate:async()=>{activations++;if(refuse||unknown)throw Error('transport or activation refusal');return stage.identity},status:async()=>{if(unknown)throw Error('writer unavailable');return {version:'1.1.9',sha256:'old'}}};
 const session=new ManagedUpdateSession({writer,shutdown:new ApplicationShutdown(async()=>{},noop),serverGone:()=>true,initialSettings:{automaticUpdate:true,updateChannel:'stable'},notifyQuit:noop,quit:()=>quits++,exit:()=>exits++,relaunch:()=>relaunches++,report:noop});
 const updater=new AppUpdater({managedSession:session,platform:'linux',appUpdateConfigPath:null});updater.initialize();updater.setAutomaticUpdate(true);
 return {session,updater,counts:()=>({downloads,activations,quits,exits,relaunches})};
}
(async()=>{try{
 let s=setup({refuse:true});await s.updater.checkForUpdates('manual');await tick();s.session.willQuit({preventDefault:noop});await tick();
 let record=JSON.parse(fs.readFileSync(path.join(profile,'app-update-notification.json'),'utf8'));
 console.log('1. Ordinary-quit activation refusal persists block:',record.automaticFailure);
 s=setup();await s.updater.checkForUpdates('manual');await tick();console.log('2. Next launch check respects block:',s.counts());
 await s.updater.downloadUpdate();await tick();console.log('3. Explicit Download only, no Install and Restart:',s.updater.getState().status,s.counts());
 s.session.willQuit({preventDefault:noop});await tick();record=JSON.parse(fs.readFileSync(path.join(profile,'app-update-notification.json'),'utf8'));
 console.log('4. Ordinary quit nevertheless activates; independent block cleared:',s.counts(),'automaticFailure=',record.automaticFailure);
 fs.rmSync(path.join(profile,'app-update-notification.json'),{force:true});
 s=setup({unknown:true});await s.updater.checkForUpdates('manual');await tick();console.log('5. Manual restart accepted:',s.updater.installUpdateAndRestart());await tick();
 console.log('6. Activation and status fail, no unsafe relaunch:',s.counts());
 let prevented=0;s.session.willQuit({preventDefault:()=>prevented++});await tick();
 console.log('7. Later independent ordinary quit:',{prevented,...s.counts()});
 }finally{fs.rmSync(profile,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
