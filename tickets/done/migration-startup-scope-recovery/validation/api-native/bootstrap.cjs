// Validation-only safety bootstrap around unchanged production main/window-first path.
const fs=require('node:fs'),path=require('node:path');
const {app,BrowserWindow}=require('electron');
const root=process.env.API_NATIVE_ROOT;
if(!root || !root.includes('/migration-startup-scope-recovery/.local/api-native-'))throw new Error('Unsafe validation root');
if(process.env.HOME!==path.join(root,'home'))throw new Error('HOME isolation missing');
for(const name of ['userData','sessionData','crashDumps','downloads']){const dir=path.join(root,'electron',name);fs.mkdirSync(dir,{recursive:true});app.setPath(name,dir);}
fs.mkdirSync(path.join(root,'electron','logs'),{recursive:true});app.setAppLogsPath(path.join(root,'electron','logs'));
const web=process.cwd();
const events=[];let manager,bridge,childCount=0,polls=0,latestDom='',latestWindowId=null;
const event=(kind,data={})=>{events.push({at:new Date().toISOString(),kind,...data});fs.writeFileSync(path.join(root,'events.json'),JSON.stringify(events,null,2));};
const {BaseServerManager}=require(path.join(web,'dist/electron/server/baseServerManager.js'));
const baseEmit=BaseServerManager.prototype.emit;
BaseServerManager.prototype.emit=function(kind,...args){if(['ready','startup-delayed','error','stopped'].includes(kind))event('manager-'+kind,{generation:this.startupGeneration,pid:this.serverProcess?.pid??null,message:args[0]?.message??args[0]});return baseEmit.call(this,kind,...args);};
const health=BaseServerManager.prototype.checkServerHealth;
BaseServerManager.prototype.checkServerHealth=function(...args){polls++;return health.apply(this,args);};
const {ServerStatusManager}=require(path.join(web,'dist/electron/server/serverStatusManager.js'));
const bridgeEmit=ServerStatusManager.prototype.emit;
ServerStatusManager.prototype.emit=function(kind,...args){bridge=this;if(kind==='status-change')event(kind,{snapshot:args[0]});return bridgeEmit.call(this,kind,...args);};
const {MacOSServerManager}=require(path.join(web,'dist/electron/server/macOSServerManager.js'));
const launch=MacOSServerManager.prototype.launchServerProcess;
MacOSServerManager.prototype.launchServerProcess=async function(...args){
 await launch.apply(this,args);manager=this;childCount++;
 const proc=this.serverProcess;
 event('child-spawn',{pid:proc.pid,generation:this.startupGeneration,childCount});
 const hold=!fs.existsSync(path.join(root,'no-hold'));
 if(hold){process.kill(proc.pid,'SIGSTOP');event('child-held',{pid:proc.pid,generation:this.startupGeneration});}
 proc.once('close',(code,signal)=>event('child-close',{pid:proc.pid,code,signal}));
};
app.on('browser-window-created',(_e,win)=>{latestWindowId=win.id;event('window-created',{windowId:win.id});win.webContents.on('did-finish-load',()=>event('window-load',{windowId:win.id,url:win.webContents.getURL()}));});
app.on('before-quit',()=>event('before-quit'));
app.on('will-quit',()=>event('will-quit'));
app.on('quit',(_e,code)=>event('quit',{code}));
let busy=false;
setInterval(async()=>{
 if(busy)return;busy=true;
 try{
 const cmdPath=path.join(root,'control.json');
 if(fs.existsSync(cmdPath)){
  const c=JSON.parse(fs.readFileSync(cmdPath,'utf8'));fs.unlinkSync(cmdPath);
  if(c.action==='release'&&manager?.serverProcess){process.kill(manager.serverProcess.pid,'SIGCONT');event('child-released',{pid:manager.serverProcess.pid,generation:manager.startupGeneration});}
  if(c.action==='terminate-child'&&manager?.serverProcess){const pid=manager.serverProcess.pid;process.kill(pid,'SIGTERM');process.kill(pid,'SIGCONT');event('failure-injected-process-exit',{pid});}
  if(c.action==='capture'){
   const win=BrowserWindow.getAllWindows()[0];if(win){fs.writeFileSync(path.join(root,c.label+'.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(root,c.label+'-dom.txt'),await win.webContents.executeJavaScript('document.body.innerText'));event('capture',{label:c.label});}
  }
 }
 const win=BrowserWindow.getAllWindows()[0];
 if(win&&!win.webContents.isLoadingMainFrame())latestDom=await win.webContents.executeJavaScript('document.body.innerText').catch(()=>latestDom);
 const state={at:new Date().toISOString(),mainPid:process.pid,profile:'production',home:process.env.HOME,userData:app.getPath('userData'),baseData:path.join(process.env.HOME,'.autobyteus'),childCount,pid:manager?.serverProcess?.pid??null,generation:manager?.startupGeneration??null,ready:manager?.isRunning()??false,pending:!!manager?.pendingStartup,polls,snapshot:bridge?.getStatus(),windowId:latestWindowId,dom:latestDom};
 fs.writeFileSync(path.join(root,'state.json'),JSON.stringify(state,null,2));
 }catch(e){event('observer-error',{message:e.message});}finally{busy=false;}
},500).unref();
event('bootstrap',{mainPid:process.pid,home:process.env.HOME,version:process.versions.electron});
require(path.join(web,'dist/electron/main.js'));
