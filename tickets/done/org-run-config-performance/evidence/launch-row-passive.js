// Disposable, passive DOM/long-task investigation instrumentation. No request interception or app-state writes.
(() => {
  if (window.__orgLaunchProbe) return;
  const state = window.__orgLaunchProbe = {samples:[],last:null,longTasks:[]};
  const visible = el => { if (!el || !el.getClientRects().length) return false; const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth; };
  const rows = () => [...document.querySelectorAll('[data-test^="agent-org-run-open-"]')];
  const settle = () => {
    const s=state.last;if(!s||s.complete)return;
    const newRow=rows().find(el=>!s.beforeRows.includes(el.getAttribute('data-test')));
    if(newRow && s.rowDomMs===undefined){s.rowDomMs=performance.now()-s.clickAt;s.rowId=newRow.getAttribute('data-test').slice('agent-org-run-open-'.length);}
    if(newRow && visible(newRow) && s.rowVisibleMs===undefined){s.rowVisibleMs=performance.now()-s.clickAt;s.rowText=newRow.textContent.trim();requestAnimationFrame(()=>{s.nextAnimationFrameMs=performance.now()-s.clickAt;});}
    const ready=location.hash.includes('mode=active')&&[...document.querySelectorAll('h2')].some(el=>el.textContent==='Choose an Agent or Team')&&!document.querySelector('[data-test="agent-org-run-config"]');
    if(ready&&s.workspaceMs===undefined){s.workspaceMs=performance.now()-s.clickAt;s.workspaceHash=location.hash;}
    if(s.rowVisibleMs!==undefined&&s.workspaceMs!==undefined)s.complete=true;
  };
  document.addEventListener('click',event=>{const b=event.target?.closest?.('[data-test="run-agent-org"]');if(!b||b.disabled)return;const s={clickAt:performance.now(),timeOrigin:performance.timeOrigin,beforeRows:rows().map(el=>el.getAttribute('data-test')),runtime:document.querySelector('#org-run-runtime-kind')?.value};state.samples.push(s);state.last=s;},true);
  const observe=()=>{const mo=new MutationObserver(settle);mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-expanded','aria-selected']});};
  if(document.documentElement)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
  const po=new PerformanceObserver(list=>state.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));po.observe({type:'longtask',buffered:true});
})();
