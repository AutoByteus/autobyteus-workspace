// Assert saved observations from real isolated desktop run; no live mutations.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const result=n=>read(n).result.result;
const a=result('after-open-state.json'),b=result('manual-browser-empty.json'),c=result('after-focus-state.json'),native=result('native-page-before-focus.json'),after=result('native-page-after-focus.json');
const opened=read('test-run-traces.json').filter(x=>x.tool_name==='open_tab'&&x.trace_type==='tool_result');
assert.equal(opened.length,1);assert.equal(opened[0].source_event,'TOOL_EXECUTION_SUCCEEDED');
assert.equal(opened[0].tool_result.output.tab_id,'c1c04e');
assert.deepEqual(a.snapshot,{activeTabId:null,sessions:[]});
assert.equal(a.tabs.find(x=>x.text==='Activity').selected,'true');assert.equal(a.tabs.find(x=>x.text==='Browser').selected,'false');
assert.deepEqual(b.snapshot.sessions,[]);
assert.equal(native.title,'Example Domain');assert(native.body.includes('documentation examples'));assert.equal(native.width,0);assert.equal(native.height,0);
assert.equal(c.snapshot.activeTabId,'c1c04e');assert.equal(c.tabs.find(x=>x.text==='Browser').selected,'true');
assert.equal(after.title,'Example Domain');assert.equal(after.url,native.url);assert(after.width>0&&after.height>0);
console.log(JSON.stringify({scenario:'Real UI -> Daily Assistant / gemini-3.8-flash-medium / antigravity_cli -> real MCP open_tab -> native Electron -> UI',outcome:'REPRODUCED missing auto-projection',testRun:'daily_assistant_adf79ed263184529ae67d37d82d70b00',tabId:'c1c04e',assertions:'PASS',checks:['Exactly one successful real open_tab','Original adapter output envelope observed','Activity stays selected; Browser unselected','Native page has Example Domain title and real DOM content','Shell snapshot empty even after manually selecting Browser','Native viewport initially 0 x 0','Diagnostic explicit-focus IPC attaches SAME tab','After focus same page has 626 x 757 viewport and Browser selected'],controlLimitation:'Explicit-focus control is diagnostic IPC, not a source fix or existing recovery UI',fixtureNote:'Initial assertion assumed Example Domain contained an h1; actual DOM has no h1. Corrected to observed title and nonempty documented content. No product assertion relaxed.'},null,2));
