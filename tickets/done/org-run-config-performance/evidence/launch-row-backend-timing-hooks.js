// Disposable timing-only hooks in the exact owned backend, installed via Node inspector, restored after measurements.
(async () => {
  if(globalThis.__orgBackendTiming) throw new Error('Existing hooks must be restored first');
  const {AsyncLocalStorage}=process.getBuiltinModule('node:async_hooks');const requireBackend=process.getBuiltinModule('node:module').createRequire('/Applications/AutoByteus.app/Contents/Resources/server/dist/app.js');const als=new AsyncLocalStorage();
  const t=globalThis.__orgBackendTiming={enabled:false,spans:[],aggregates:{},next:0,restore:[]};
  const modules=[
    ['agent-org-execution/services/agent-org-run-service.js','AgentOrgRunService',['create','validateCompleteConfiguration']],
    ['collaboration-definition-admission/services/definition-admission-service.js','DefinitionAdmissionService',['requireAvailable']],
    ['agent-org-execution/services/agent-org-run-planner.js','AgentOrgRunPlanner',['resolveConfiguration','build']],
    ['agent-execution/services/agent-run-identity-allocator.js','AgentRunIdentityAllocator',['allocateForAgentDefinition']],
    ['agent-org-execution/services/agent-org-execution-tree-location-service.js','AgentOrgExecutionTreeLocationService',['containsRunId']],
    ['llm-management/services/run-model-selection-service.js','RunModelSelectionService',['validateMany']],
    ['llm-management/services/model-catalog-service.js','ModelCatalogService',['runtimeModelSelectionCatalog']],
    ['agent-org-execution/services/agent-org-run-manager.js','AgentOrgRunManager',['create','materialize']],
    ['agent-org-execution/services/agent-org-execution-scope-builder.js','AgentOrgExecutionScopeBuilder',['build']],
    ['run-history/services/root-run-package-readiness-index.js','RootRunPackageReadinessIndex',['admitCurrent','rebuild']],
    ['run-history/services/root-run-package-current-validator.js','RootRunPackageCurrentValidator',['scan']],
    ['run-history/store/agent-org-run-execution-tree-store.js','AgentOrgRunExecutionTreeStore',['read']],
    ['run-history/services/agent-org-run-history-catalog-service.js','AgentOrgRunHistoryCatalogService',['recordCreated']],
  ];
  const labels=[];
  for(const [file,name,methods] of modules){const module=requireBackend('/Applications/AutoByteus.app/Contents/Resources/server/dist/'+file);const prototype=module[name]?.prototype;if(!prototype)throw Error('Missing class '+name);
    for(const method of methods){const original=prototype[method];if(typeof original!=='function')throw Error('Missing method '+name+'.'+method);const label=name+'.'+method;labels.push(label);
      prototype[method]=function(...args){const parent=als.getStore();if(!t.enabled || (!parent&&label!=='AgentOrgRunService.create'))return original.apply(this,args);
        const begin=performance.now(), id=t.next++, ctx={id,label}, leaf=label==='AgentOrgRunExecutionTreeStore.read';
        const finish=failed=>{const durationMs=performance.now()-begin,key=label+' | parent='+(parent?.label??'root'),a=t.aggregates[key]??={count:0,totalMs:0,maxMs:0};a.count++;a.totalMs+=durationMs;a.maxMs=Math.max(a.maxMs,durationMs);if(!leaf)t.spans.push({id,parentId:parent?.id??null,label,start:begin,end:performance.now(),durationMs,failed});};
        return als.run(ctx,()=>{let result;try{result=original.apply(this,args);}catch(error){finish(true);throw error;}if(result&&typeof result.then==='function')return result.then(value=>{finish(false);return value;},error=>{finish(true);throw error;});finish(false);return result;});
      };
      t.restore.push(()=>{prototype[method]=original;});
    }
  }
  return {labels,enabled:t.enabled};
})()
