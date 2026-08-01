const { chromium } = require('playwright-core');
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const OUT_DIR = path.resolve(__dirname);
const SUMMARY_PATH = path.join(OUT_DIR, 'live-native-performance-summary.json');
const EVENTS_PATH = path.join(OUT_DIR, 'live-native-performance-events.jsonl');
const SCREENSHOT_PATH = path.join(OUT_DIR, 'live-native-performance-final.png');
const BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_URL = 'http://127.0.0.1:29695';
const TARGET_CHARS = 30000;
const TARGET_STREAM_MS = 60000;
const MAX_RUN_MS = 14 * 60 * 1000;
const pwNodePath = process.env.NODE_PATH;

const startedWall = Date.now();
const result = {
  probeId: 'LIVE-NATIVE-001',
  startedAt: new Date().toISOString(),
  topology: {
    frontend: BASE_URL,
    backend: BACKEND_URL,
    workspace: 'Temp Workspace (temp_ws_default)',
    teamDefinition: 'Software Engineering Team',
    runtime: 'autobyteus',
    requestedModel: 'deepseek-v4-flash',
    browser: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  },
  launch: {},
  stream: {},
  responsiveness: {},
  cpu: { browserRendererSamples: [], backendSamples: [] },
  health: [],
  localFileOpens: [],
  teamReferenceOpens: [],
  directReferenceReads: [],
  notFound: null,
  cleanup: {},
  errors: [],
};

const appendEvent = (kind, data = {}) => {
  fs.appendFileSync(EVENTS_PATH, JSON.stringify({ at: new Date().toISOString(), elapsedMs: Date.now() - startedWall, kind, ...data }) + '\n');
};
const persist = () => fs.writeFileSync(SUMMARY_PATH, JSON.stringify(result, null, 2));
const percentile = (xs, p) => {
  const ys = xs.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if (!ys.length) return null;
  const idx = Math.max(0, Math.min(ys.length - 1, Math.ceil((p / 100) * ys.length) - 1));
  return ys[idx];
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sh = args => {
  try { return execFileSync(args[0], args.slice(1), {encoding:'utf8'}); } catch { return ''; }
};
const psRows = () => sh(['ps','-axo','pid=,ppid=,%cpu=,command=']).split('\n').map(line => {
  const m=line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/); return m ? {pid:+m[1],ppid:+m[2],cpu:+m[3],command:m[4]} : null;
}).filter(Boolean);
const descendants = (rootPid, rows) => {
  const set = new Set([rootPid]); let changed=true;
  while(changed){ changed=false; for(const r of rows){ if(set.has(r.ppid)&&!set.has(r.pid)){set.add(r.pid);changed=true;} } }
  return set;
};

(async () => {
  fs.writeFileSync(EVENTS_PATH, '');
  let browser;
  let page;
  let cpuTimer;
  let healthTimer;
  let browserPid = null;
  let backendPid = null;
  let teamRunId = null;
  let referenceUrl = null;
  let launchError = null;
  try {
    browser = await chromium.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
    });
    await sleep(250);
    browserPid = psRows().find(r => r.ppid === process.pid && /Google Chrome/.test(r.command))?.pid ?? null;
    result.launch.browserPid = browserPid;
    backendPid = +(sh(['lsof','-nP','-iTCP:29695','-sTCP:LISTEN','-t']).trim().split('\n')[0] || 0) || null;
    result.launch.backendPid = backendPid;
    appendEvent('browser_launched', {browserPid, backendPid});

    page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
    page.on('console', msg => {
      const text = msg.text();
      if (/error|failed|warning/i.test(text)) appendEvent('browser_console', {type: msg.type(), text: text.slice(0, 2000)});
    });
    page.on('pageerror', e => { result.errors.push(`pageerror: ${e.message}`); appendEvent('pageerror',{message:e.message}); persist(); });
    page.on('request', req => {
      const u=req.url();
      if (/team-communication\/messages\/.*\/references\/.*\/content/.test(u)) {
        referenceUrl = u; appendEvent('reference_request',{url:u});
      }
    });
    page.on('response', async resp => {
      const u=resp.url();
      if (/team-communication\/messages\/.*\/references\/.*\/content/.test(u)) appendEvent('reference_response',{url:u,status:resp.status()});
    });

    await page.addInitScript(() => {
      const nativeWS = window.WebSocket;
      const probe = window.__apiE2EProbe = {
        installedAt: Date.now(), wsUrls: [], sockets: {}, sent: [], messageTypes: {}, contentEvents: 0,
        contentChars: 0, firstContentAt: null, lastContentAt: null, contentDeltaLengths: [],
        contentByRoute: {}, recentContentAt: 0, intervalGaps: [], rafGaps: [], maxIntervalGap: 0, maxRafGap: 0,
      };
      window.WebSocket = class ProbeWebSocket extends nativeWS {
        constructor(url, protocols) {
          super(url, protocols);
          const socketUrl = String(url);
          probe.wsUrls.push(socketUrl);
          const socketProbe = probe.sockets[socketUrl] ||= {messageTypes:{},contentEvents:0,contentChars:0,firstContentAt:null,lastContentAt:null,recentContentAt:0,contentDeltaLengths:[],contentByRoute:{}};
          this.addEventListener('message', (event) => {
            try {
              if (typeof event.data !== 'string') return;
              const msg = JSON.parse(event.data);
              const type = String(msg?.type || 'UNKNOWN');
              probe.messageTypes[type] = (probe.messageTypes[type] || 0) + 1;
              socketProbe.messageTypes[type] = (socketProbe.messageTypes[type] || 0) + 1;
              if (type === 'SEGMENT_CONTENT') {
                const delta = typeof msg?.payload?.delta === 'string' ? msg.payload.delta : '';
                const now = performance.now();
                probe.contentEvents += 1;
                probe.contentChars += delta.length;
                socketProbe.contentEvents += 1;
                socketProbe.contentChars += delta.length;
                probe.firstContentAt ??= now;
                probe.lastContentAt = now;
                probe.recentContentAt = now;
                socketProbe.firstContentAt ??= now;
                socketProbe.lastContentAt = now;
                socketProbe.recentContentAt = now;
                if (probe.contentDeltaLengths.length < 100000) probe.contentDeltaLengths.push(delta.length);
                if (socketProbe.contentDeltaLengths.length < 100000) socketProbe.contentDeltaLengths.push(delta.length);
                const route = msg?.payload?.member_route_key || msg?.payload?.source_route_key || (Array.isArray(msg?.payload?.member_path) ? msg.payload.member_path.join('/') : '') || '<single>';
                probe.contentByRoute[route] ||= {events:0,chars:0};
                probe.contentByRoute[route].events += 1;
                probe.contentByRoute[route].chars += delta.length;
                socketProbe.contentByRoute[route] ||= {events:0,chars:0};
                socketProbe.contentByRoute[route].events += 1;
                socketProbe.contentByRoute[route].chars += delta.length;
              }
            } catch {}
          });
          const nativeSend = this.send;
          this.send = function(data) {
            try { probe.sent.push(typeof data === 'string' ? JSON.parse(data) : String(data)); } catch { probe.sent.push(String(data)); }
            return nativeSend.call(this, data);
          };
        }
      };
      for (const key of ['CONNECTING','OPEN','CLOSING','CLOSED']) Object.defineProperty(window.WebSocket,key,{value:nativeWS[key]});
      let lastInterval = performance.now();
      setInterval(() => {
        const now=performance.now(); const gap=now-lastInterval; lastInterval=now;
        probe.intervalGaps.push(gap); if (probe.intervalGaps.length>50000) probe.intervalGaps.shift();
        probe.maxIntervalGap=Math.max(probe.maxIntervalGap,gap);
      },50);
      let lastFrame=performance.now();
      const frame=now=>{ const gap=now-lastFrame; lastFrame=now; probe.rafGaps.push(gap); if(probe.rafGaps.length>100000) probe.rafGaps.shift(); probe.maxRafGap=Math.max(probe.maxRafGap,gap); requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    });

    cpuTimer = setInterval(() => {
      const rows=psRows();
      if (browserPid) {
        const tree=descendants(browserPid, rows);
        const renderers=rows.filter(r=>tree.has(r.pid)&&/--type=renderer/.test(r.command));
        result.cpu.browserRendererSamples.push({tMs:Date.now()-startedWall,totalCpu:renderers.reduce((s,r)=>s+r.cpu,0),processes:renderers.map(r=>({pid:r.pid,cpu:r.cpu}))});
      }
      if (backendPid) {
        const row=rows.find(r=>r.pid===backendPid);
        result.cpu.backendSamples.push({tMs:Date.now()-startedWall,cpu:row?.cpu ?? null});
      }
      if (result.cpu.browserRendererSamples.length % 10 === 0) persist();
    },500);
    healthTimer = setInterval(async () => {
      const t=performance.now();
      try { const r=await fetch(`${BACKEND_URL}/rest/health`); await r.text(); result.health.push({tMs:Date.now()-startedWall,status:r.status,latencyMs:performance.now()-t}); }
      catch(e){ result.health.push({tMs:Date.now()-startedWall,status:0,latencyMs:performance.now()-t,error:String(e)}); }
    },500);

    appendEvent('navigate_team_list');
    await page.goto(`${BASE_URL}/agent-teams`, {waitUntil:'networkidle',timeout:60000});
    await page.getByPlaceholder(/Search teams/i).fill('Software Engineering Team');
    await sleep(600);
    const card = page.locator('div.group').filter({hasText:'Software Engineering Team'}).first();
    if (!await card.count()) throw new Error('Software Engineering Team card not found');
    await card.getByRole('button',{name:/^Run$/}).click();
    await page.waitForURL(/\/workspace/, {timeout:30000});
    await sleep(1500);
    await page.getByRole('button',{name:'Select a model'}).click();
    await page.getByPlaceholder('Search models...').fill('deepseek-v4-flash');
    await sleep(500);
    const exactModel = page.getByText('deepseek-v4-flash',{exact:true}).last();
    if (!await exactModel.count()) throw new Error('Exact deepseek-v4-flash model option not found');
    await exactModel.click();
    await sleep(500);
    result.launch.selectedModelLabel = await page.getByRole('button',{name:/deepseek-v4-flash/}).first().innerText();
    await page.getByRole('button',{name:'Run Team'}).click();
    const composer = page.getByPlaceholder('Type a message...');
    await composer.waitFor({state:'visible',timeout:30000});
    const taskPrompt = [
      'API/E2E validation task (do not alter any code repository):',
      'In the Temp Workspace only, create a single Markdown file named api-e2e-validation-marker.md containing a heading and a short marker that this is the 2026-08-01 streaming validation.',
      'Proceed through the normal Software Engineering Team workflow so solution design prepares the ordinary required artifacts and sends a reference-bearing handoff to architecture review; downstream members may validate the one-file result.',
      'Keep every task artifact inside the Temp Workspace. Do not modify source repositories, install dependencies, release, or deploy. This is a disposable one-off validation run.'
    ].join(' ');
    await composer.fill(taskPrompt);
    appendEvent('send_task', {chars:taskPrompt.length});
    await page.getByTitle('Send message').click();

    await page.waitForFunction(() => window.__apiE2EProbe?.wsUrls?.some(u => u.includes('/ws/agent-team')), null, {timeout:30000});
    await sleep(1000);
    const wsUrls = await page.evaluate(() => window.__apiE2EProbe.wsUrls.slice());
    const teamUrl = wsUrls.find(u=>u.includes('/ws/agent-team')) || '';
    const idMatch = teamUrl.match(/\/ws\/agent-team\/([^/?]+)/);
    teamRunId = idMatch ? decodeURIComponent(idMatch[1]) : null;
    result.launch.teamRunId = teamRunId;
    result.launch.wsUrls = wsUrls;
    appendEvent('team_created', {teamRunId,teamUrl});
    persist();

    // Wait for a genuinely active native stream before exercising unrelated file opens.
    await page.waitForFunction((id) => Object.entries(window.__apiE2EProbe?.sockets || {}).some(([u,s]) => u.includes(id) && s.contentEvents >= 20), teamRunId, {timeout:120000});
    appendEvent('native_stream_active');

    async function waitFreshStream() {
      await page.waitForFunction((id) => { const e=Object.entries(window.__apiE2EProbe?.sockets || {}).find(([u])=>u.includes(id)); return !!e && performance.now() - (e[1].recentContentAt || 0) < 2500; }, teamRunId, {timeout:120000}).catch(()=>{});
    }
    async function openLocalFile(name) {
      await waitFreshStream();
      const filesTab = page.locator('[data-test="right-side-tab-list"] button').filter({hasText:/^Files$/}).first();
      if (await filesTab.count()) await filesTab.click();
      const search = page.locator('[data-test="right-side-files-panel"] input[placeholder="Search..."]').first();
      await search.waitFor({state:'visible',timeout:15000});
      await search.fill(name);
      const item = page.locator('[data-test="right-side-files-panel"]').getByText(name,{exact:true}).filter({visible:true}).last();
      await item.waitFor({state:'visible',timeout:30000});
      const t=performance.now();
      await item.click();
      await page.waitForFunction((n) => {
        const active=document.querySelector('[data-test="right-side-files-panel"] [data-event-monitor-active-file-tab="true"]');
        const loading=Array.from(document.querySelectorAll('[data-test="right-side-files-panel"] [role="status"]')).some(e=>/Loading file content/i.test(e.textContent||''));
        return !!active && (active.textContent||'').includes(n) && !loading;
      }, name, {timeout:5000});
      const latency=performance.now()-t;
      result.localFileOpens.push({index:result.localFileOpens.length+1,name,latencyMs:latency,atContentChars:(await page.evaluate((id)=>Object.entries(window.__apiE2EProbe.sockets).find(([u])=>u.includes(id))?.[1]?.contentChars||0,teamRunId))});
      appendEvent('local_file_open',{name,latencyMs:latency}); persist();
      await search.fill('');
      await sleep(200);
    }

    for (let i=0;i<10;i++) {
      try { await openLocalFile(i%2===0?'article.md':'README.md'); }
      catch(e){ result.localFileOpens.push({index:i+1,name:i%2===0?'article.md':'README.md',error:String(e)}); appendEvent('local_file_open_error',{error:String(e)}); }
    }

    // Wait for a reference-bearing inter-member handoff, then re-fetch it through the actual viewer ten times.
    async function exposeTeamReferences() {
      const teamTab=page.locator('[data-test="right-side-tab-list"] button').filter({hasText:/^Team$/}).first();
      if(await teamTab.count()) await teamTab.click();
      const messagesHeader=page.locator('[data-test="team-messages-header"]');
      if(await messagesHeader.count() && await messagesHeader.getAttribute('aria-expanded')==='false') await messagesHeader.click();
    }
    let referenceFound=false;
    const refDeadline=Date.now()+8*60*1000;
    while(Date.now()<refDeadline && !referenceFound){
      await exposeTeamReferences().catch(()=>{});
      if(await page.locator('[data-test="team-communication-reference-row"]').count()) {referenceFound=true;break;}
      await sleep(1500);
    }
    if (!referenceFound) {
      result.errors.push('No team communication reference appeared within 8 minutes');
      appendEvent('reference_unavailable');
    } else {
      const refRow=page.locator('[data-test="team-communication-reference-row"]').first();
      result.launch.referenceLabel=(await refRow.innerText()).trim();
      for(let i=0;i<10;i++){
        await waitFreshStream();
        const t=performance.now();
        await refRow.click();
        try {
          await page.locator('[data-test="team-reference-viewer-shell"]').waitFor({state:'visible',timeout:5000});
          await page.waitForFunction(()=>{
            const shell=document.querySelector('[data-test="team-reference-viewer-shell"]');
            if(!shell) return false;
            const text=shell.textContent||'';
            return !/Loading reference/i.test(text) && (text.trim().length>20 || /unavailable|failed|error/i.test(text));
          },null,{timeout:5000});
          const shellText=(await page.locator('[data-test="team-reference-viewer-shell"]').innerText()).slice(0,300);
          const latency=performance.now()-t;
          result.teamReferenceOpens.push({index:i+1,latencyMs:latency,truthfulState:/unavailable|failed|error/i.test(shellText)?'error':'content',sample:shellText,atContentChars:await page.evaluate((id)=>Object.entries(window.__apiE2EProbe.sockets).find(([u])=>u.includes(id))?.[1]?.contentChars||0,teamRunId)});
          appendEvent('team_reference_open',{latencyMs:latency});
        } catch(e){ result.teamReferenceOpens.push({index:i+1,error:String(e)}); appendEvent('team_reference_open_error',{error:String(e)}); }
        persist(); await sleep(150);
      }
    }

    // Continue until the exact sustained-stream threshold is observed, while keeping the tab live.
    const runDeadline=startedWall+MAX_RUN_MS;
    while(Date.now()<runDeadline){
      const s=await page.evaluate((id)=>{ const e=Object.entries(window.__apiE2EProbe.sockets).find(([u])=>u.includes(id)); const x=e?.[1]||{}; return {chars:x.contentChars||0,events:x.contentEvents||0,first:x.firstContentAt??null,last:x.lastContentAt??null,recent:performance.now()-(x.recentContentAt||0)}; },teamRunId);
      const duration=s.first==null||s.last==null?0:s.last-s.first;
      appendEvent('progress',{chars:s.chars,events:s.events,streamDurationMs:duration,recentContentAgeMs:s.recent});
      if(s.chars>=TARGET_CHARS && duration>=TARGET_STREAM_MS) break;
      await sleep(2000);
    }

    const wholeProbe = await page.evaluate(() => JSON.parse(JSON.stringify(window.__apiE2EProbe)));
    const socketEntry = Object.entries(wholeProbe.sockets || {}).find(([u]) => u.includes(teamRunId));
    const inPage = socketEntry?.[1] || {messageTypes:{},contentEvents:0,contentChars:0,firstContentAt:null,lastContentAt:null,contentDeltaLengths:[],contentByRoute:{}};
    const streamDurationMs = inPage.firstContentAt==null||inPage.lastContentAt==null?0:inPage.lastContentAt-inPage.firstContentAt;
    const intervalDrifts = wholeProbe.intervalGaps.map(g=>Math.max(0,g-50));
    result.stream = {
      contentEvents: inPage.contentEvents, contentChars: inPage.contentChars, streamDurationMs,
      meanCharsPerEvent: inPage.contentEvents ? inPage.contentChars/inPage.contentEvents : null,
      deltaLengthP50: percentile(inPage.contentDeltaLengths,50), deltaLengthP95: percentile(inPage.contentDeltaLengths,95),
      byRoute: inPage.contentByRoute, messageTypes: inPage.messageTypes,
      thresholdMet: inPage.contentChars>=TARGET_CHARS && streamDurationMs>=TARGET_STREAM_MS,
    };
    result.responsiveness = {
      intervalSamples: wholeProbe.intervalGaps.length,
      intervalDriftP50Ms: percentile(intervalDrifts,50), intervalDriftP95Ms: percentile(intervalDrifts,95),
      intervalGapMaxMs: Math.max(...wholeProbe.intervalGaps,0), intervalDriftMaxMs: Math.max(...intervalDrifts,0),
      streamAttributableStallsOver500: wholeProbe.intervalGaps.filter(g=>g>550).length,
      rafSamples: wholeProbe.rafGaps.length, rafGapP95Ms: percentile(wholeProbe.rafGaps,95), rafGapMaxMs:Math.max(...wholeProbe.rafGaps,0),
    };

    const successfulFiles=result.localFileOpens.filter(x=>Number.isFinite(x.latencyMs));
    const successfulRefs=result.teamReferenceOpens.filter(x=>Number.isFinite(x.latencyMs)&&x.truthfulState==='content');
    result.localFileOpenP95Ms=percentile(successfulFiles.map(x=>x.latencyMs),95);
    result.teamReferenceOpenP95Ms=percentile(successfulRefs.map(x=>x.latencyMs),95);
    const rendererDuring = result.cpu.browserRendererSamples.filter(x=>{
      const firstWall = inPage.firstContentAt == null ? 0 : 0; // samples span launch; active-window filtering recorded below from stream wall marks unavailable cross-origin.
      return x.tMs > 0;
    }).map(x=>x.totalCpu);
    result.cpu.browserRenderer = {samples:rendererDuring.length,mean:rendererDuring.reduce((a,b)=>a+b,0)/(rendererDuring.length||1),p50:percentile(rendererDuring,50),p95:percentile(rendererDuring,95),max:Math.max(...rendererDuring,0)};
    const backendCpu=result.cpu.backendSamples.map(x=>x.cpu).filter(Number.isFinite);
    result.cpu.backend={samples:backendCpu.length,mean:backendCpu.reduce((a,b)=>a+b,0)/(backendCpu.length||1),p95:percentile(backendCpu,95),max:Math.max(...backendCpu,0)};
    const h=result.health.filter(x=>x.status===200).map(x=>x.latencyMs);
    result.healthSummary={samples:result.health.length,successes:h.length,p50Ms:percentile(h,50),p95Ms:percentile(h,95),maxMs:Math.max(...h,0)};

    if(referenceUrl){
      result.launch.referenceUrl=referenceUrl;
      for(let i=0;i<10;i++){
        const t=performance.now(); const resp=await fetch(referenceUrl); const body=await resp.arrayBuffer();
        result.directReferenceReads.push({index:i+1,status:resp.status,bytes:body.byteLength,latencyMs:performance.now()-t});
      }
      const u=new URL(referenceUrl); u.pathname=u.pathname.replace(/\/references\/[^/]+\/content$/, '/references/api-e2e-missing-reference/content');
      const nf=await fetch(u); const nfText=await nf.text();
      result.notFound={url:u.toString(),status:nf.status,body:nfText.slice(0,500)};
    }

    await page.screenshot({path:SCREENSHOT_PATH,fullPage:true}).catch(()=>{});
    result.completedAt=new Date().toISOString();
    result.durationMs=Date.now()-startedWall;
    persist();
  } catch (e) {
    launchError=e;
    result.errors.push(e?.stack || String(e));
    appendEvent('fatal_error',{error:e?.stack||String(e)});
    result.completedAt=new Date().toISOString(); result.durationMs=Date.now()-startedWall; persist();
  } finally {
    clearInterval(cpuTimer); clearInterval(healthTimer);
    // Use the same supported GraphQL lifecycle mutation as the product store for owned-run cleanup.
    if (teamRunId) {
      try {
        const resp=await fetch(`${BACKEND_URL}/graphql`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'mutation TerminateAgentTeamRun($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success message } }',variables:{teamRunId}})});
        const body=await resp.json(); result.cleanup.terminateTeam={status:resp.status,body};
        appendEvent('team_terminated',{teamRunId,status:resp.status,body});
      } catch(e){result.cleanup.terminateTeam={error:String(e)};}
    }
    try { await browser?.close(); result.cleanup.browserClosed=true; } catch(e){result.cleanup.browserClosed=false; result.cleanup.browserCloseError=String(e);}
    result.cleanup.completedAt=new Date().toISOString(); persist();
  }
  if (launchError || !result.stream.thresholdMet) process.exitCode=2;
})();
