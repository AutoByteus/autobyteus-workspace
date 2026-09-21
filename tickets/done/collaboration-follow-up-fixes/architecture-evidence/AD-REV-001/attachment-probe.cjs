const fs = require('fs');
const path = require('path');
const Module = require('module');
const root = process.cwd();
const old = '/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model';
const deps = old + '/node_modules/.pnpm';
const webRequire = Module.createRequire(old + '/autobyteus-web/package.json');
const { JSDOM } = webRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
for (const key of ['window','document','Node','Element','HTMLElement','SVGElement']) global[key] = dom.window[key];
const vue = require(deps + '/vue@3.5.28_typescript@5.9.3/node_modules/vue');
const ts = webRequire('typescript');
const { mount } = webRequire('@vue/test-utils');
const { parse, compileScript } = require(deps + '/vue@3.5.28_typescript@5.9.3/node_modules/@vue/compiler-sfc');
const opens = [];
window.open = url => { opens.push(url); return null; };
const sourceFile = root + '/autobyteus-web/services/runSubmission/localUserSubmission.ts';
const sfcFile = root + '/autobyteus-web/components/conversation/UserMessage.vue';
const stubs = {
 'vue': vue,
 '~/stores/fileExplorer': {useFileExplorerStore: () => ({openFile(){throw Error('unexpected Files');},openFilePreview(){throw Error('unexpected preview');}})},
 '~/stores/windowNodeContextStore': {useWindowNodeContextStore: () => ({isEmbeddedWindow:false})},
 '~/stores/workspace': {useWorkspaceStore: () => ({activeWorkspace:null})},
 '~/stores/runHistoryStore': {useRunHistoryStore: () => ({applyRunNavigationEffect(){}})},
 '~/services/eventMonitor/recentEventMonitorMutationCoordinator': {commitRecentEventMonitorEffect: ctx => {ctx.state.eventMonitorPresentationRevision++;}},
 '~/utils/runTreeSummary': {resolveFirstUserMessageSummary: () => 'text'},
};
const cache=new Map();
function load(file, source){
 if(cache.has(file)) return cache.get(file).exports;
 const mod = new Module(file,module); cache.set(file,mod); mod.filename=file;
 mod.require=(name)=> {
  if(name in stubs) return stubs[name];
  if(name.startsWith('~/')) return load(root+'/autobyteus-web/'+name.slice(2)+'.ts');
  if(name.startsWith('.')) {let p=path.resolve(path.dirname(file),name); if(!path.extname(p))p+='.ts'; return load(p);}
  return webRequire(name);
 };
 mod._compile(ts.transpileModule(source ?? fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
 return mod.exports;
}
(async()=>{
 const lib=load(sourceFile);
 const sfc=compileScript(parse(fs.readFileSync(sfcFile,'utf8'),{filename:sfcFile}).descriptor,{id:'ad001-probe',inlineTemplate:true});
 const component=load(sfcFile,sfc.content).default;
 const results=[];
 for(const control of [false,true]){
  const ctx=vue.reactive({state:{runId:'temp-1',currentStatus:'idle',eventMonitorPresentationRevision:0,conversation:{messages:[]}},requirement:'hello',contextFilePaths:[],submissionPending:false});
  const draft={kind:'uploaded',phase:'draft',id:'file-1',storedFilename:'ctx_1.txt',displayName:'note.txt',locator:'/context-files/draft/ctx_1.txt',type:'Text'};
  const handle=lib.beginLocalUserSubmission(ctx,{text:'hello',attachments:[draft],navigationTarget:null});
  const message=ctx.state.conversation.messages[0];
  const wrapper=mount(component,{props:{message},global:{mocks:{$t:x=>x}}});
  await vue.nextTick();
  await wrapper.find('button').trigger('click');
  const first=opens.at(-1);
  // Diagnostic only: make the handle retain the same reactive message consumed by the component.
  if(control)handle.message=message;
  const final={...draft,phase:'final',locator:'/context-files/final/ctx_1.txt'};
  lib.finalizeLocalSubmissionAttachments(handle,[final]);
  await vue.nextTick();
  wrapper.vm.$forceUpdate(); await vue.nextTick();
  await wrapper.find('button').trigger('click');
  results.push({control,handleIsReactive:vue.isReactive(handle.message),sameProxy:handle.message===message,beforeOpen:first,afterOpen:opens.at(-1),underlyingLocator:message.contextFilePaths[0].locator,revision:ctx.state.eventMonitorPresentationRevision,messageCount:ctx.state.conversation.messages.length});
  wrapper.unmount();
 }
 if(results[0].afterOpen!==results[0].beforeOpen || !results[1].afterOpen.includes('/final/'))throw Error('Unexpected diagnostic outcome');
 console.log(JSON.stringify({sourceFile,sfcFile,vueVersion:vue.version,scope:'actual current helper and SFC, installed Vue, synthetic reactive context; mocked monitor effect/history/stores; jsdom not hosted runtime/provider or acceptance',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
