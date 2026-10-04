// Passive local DOM clocks. DOM/layout-ready, not compositor paint or controller timing.
(()=>{if(window.__apiConfigProbe)return;const s=window.__apiConfigProbe={samples:[],last:null};
const settle=()=>{const r=s.last;if(!r)return;const panel=document.querySelector('[data-test="agent-org-run-config"]');if(panel?.getClientRects().length&&r.configDomMs===undefined)r.configDomMs=performance.now()-r.clickedAt;
const option=document.querySelector('#org-run-runtime-kind option[value="codex_app_server"]');if(option&&!option.disabled&&r.codexOfferedMs===undefined)r.codexOfferedMs=performance.now()-r.clickedAt;
const run=document.querySelector('[data-test="run-agent-org"]');if(run&&!run.disabled&&r.selectedConfigReadyMs===undefined)r.selectedConfigReadyMs=performance.now()-r.clickedAt;};
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(b&&b.textContent.trim()==='Run'&&b.closest('[data-test="org-card-autobyteus-org"]')){s.last={clickedAt:performance.now(),timeOrigin:performance.timeOrigin};s.samples.push(s.last);}},true);
document.addEventListener('change',e=>{if(e.target?.id==='org-run-runtime-kind'&&s.last){s.last.runtimeSelectedAt=performance.now();s.last.runtime=e.target.value;}},true);
new MutationObserver(settle).observe(document.documentElement,{subtree:true,childList:true,attributes:true});})();
