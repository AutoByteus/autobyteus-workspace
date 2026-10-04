// Disposable investigation-only passive telemetry. No UI automation, API mocking, or production change.
export default defineNuxtPlugin(() => {
  const emit = (event: Record<string, unknown>) => navigator.sendBeacon('http://127.0.0.1:50911', JSON.stringify({at:performance.now(),page:location.pathname,...event}))
  const pending = new Map<string,number>()
  const begin = (phase: string) => { pending.set(phase,performance.now());emit({type:'phase-start',phase}) }
  const end = (phase: string) => {const at=pending.get(phase);if(at!==undefined){pending.delete(phase);emit({type:'phase-end',phase,durationMs:performance.now()-at})}}
  emit({type:'page-init'})
  const observer = new PerformanceObserver(list => list.getEntries().forEach(e=>emit({type:'long-task',start:e.startTime,durationMs:e.duration})))
  observer.observe({entryTypes:['longtask']})
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input,init) => {
    const url = typeof input==='string' ? input : input instanceof URL ? input.href : input.url
    if(!url.includes('/graphql')) return originalFetch(input,init)
    const start=performance.now();let operation='unknown';let runtimeKind:string|undefined
    try {const body=JSON.parse(String(init?.body??''));operation=body.operationName??/\b(?:query|mutation)\s+(\w+)/.exec(body.query??'')?.[1]??'unnamed';runtimeKind=body.variables?.runtimeKind}catch{}
    try {const response=await originalFetch(input,init);emit({type:'graphql-response',operation,runtimeKind,durationMs:performance.now()-start,status:response.status});return response}
    catch(error){emit({type:'graphql-error',operation,durationMs:performance.now()-start});throw error}
  }
  document.addEventListener('click',e=>{
    const button=(e.target as Element)?.closest('button');if(!button)return
    const text=button.textContent?.trim()??''
    emit({type:'click',text:text.slice(0,120),test:button.getAttribute('data-test')})
    if(button.matches('[data-test="run-agent-org"]')) begin('org-launch')
    else if(text==='Run'&&document.querySelector('[data-test="agent-org-experience"]')) {begin('org-config-visible');begin('org-members-ready');begin('codex-runtime-offered')}
    else if(text==='Run'&&document.querySelector('input[placeholder="Search teams by name"]')) begin('team-config-visible')
  },true)
  document.addEventListener('change',e=>{
    const select=e.target as HTMLSelectElement
    if(select.tagName==='SELECT' && select.value==='codex_app_server') begin('codex-catalog-ready')
  },true)
  const settle=()=>{
    const org=document.querySelector('[data-test="agent-org-run-config"]')
    if(org?.querySelector('select')) end('org-config-visible')
    if(org && Array.from(org.querySelectorAll('button')).some(b=>b.textContent?.includes('Member overrides (10)'))) end('org-members-ready')
    if(Array.from(document.querySelectorAll('select option')).some(o=>(o as HTMLOptionElement).value==='codex_app_server')) end('codex-runtime-offered')
    const loading=Array.from(document.querySelectorAll('[role="status"]')).some(el=>el.textContent?.includes('Loading model options'))
    if(pending.has('codex-catalog-ready')&&!loading) end('codex-catalog-ready')
    if(Array.from(document.querySelectorAll('h2')).some(el=>el.textContent==='Choose an Agent or Team'))end('org-launch')
    if(Array.from(document.querySelectorAll('button')).some(el=>el.textContent?.trim()==='Run Team'))end('team-config-visible')
  }
  const mutations=new MutationObserver(settle);mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']})
  window.addEventListener('beforeunload',()=>{observer.disconnect();mutations.disconnect()})
})
