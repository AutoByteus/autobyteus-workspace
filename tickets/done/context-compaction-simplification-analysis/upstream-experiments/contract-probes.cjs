/* Isolated source-declaration probes, NOT upstream integration suites.
 * Usage: node contract-probes.cjs <clone-root> <typescript-module-path>
 * Selected declarations are compiled unchanged with the TypeScript compiler.
 * Imports are deliberately not evaluated; dependency injection is explicit below.
 * DSH provider is synthetic; no live model, network, credentials, or real history.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = process.argv[2] || __dirname;
const ts = require(process.argv[3]);
const sources = new Map();
function extract(file, names, deps={}) {
  const source = fs.readFileSync(path.join(root,file),'utf8');
  sources.set(file,crypto.createHash('sha256').update(source).digest('hex'));
  const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const wanted = new Set(names), found = new Set();
  const statements = ast.statements.filter(s => {
    const ns = ts.isVariableStatement(s) ? s.declarationList.declarations.map(d=>d.name.getText(ast)) : [s.name?.getText(ast)];
    for (const n of ns) if(wanted.has(n)) found.add(n);
    return ns.some(n=>wanted.has(n));
  });
  assert.deepEqual([...found].sort(),[...wanted].sort(),`missing source declaration ${file}`);
  const code = statements.map(s=>s.getText(ast)).join('\n');
  const js = ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exp = {};
  return new Function('exports',...Object.keys(deps),js+'\nreturn {'+names.join(',')+'};')(exp,...Object.values(deps));
}
const results=[];
async function check(name,body){await body(); results.push({name,status:'PASS'}); console.log('PASS '+name);}
(async()=>{
  const z = extract('zcode/apps/zcode-cli/packages/core/src/compact/prompt.ts',[
    'NO_TOOLS_PREAMBLE','NO_TOOLS_TRAILER','BASE_COMPACT_PROMPT','buildCompactPrompt','formatCompactSummary','buildCompactSummaryMessage']);
  const zh = extract('zcode/apps/zcode-cli/packages/core/src/runtime/methods/compact-active-helpers.ts',[
    'COMPACT_TOOL_USE_DENIAL_MESSAGE','COMPACT_TOOL_USE_DENIAL_REASON','formatCompactSummaryOrThrow'],{
      formatCompactSummary:z.formatCompactSummary,
      CoreErrorType:{ModelError:'ModelError'},
      // Substitute only application error-envelope construction, not validation logic.
      createCoreError:(type,message,options)=>Object.assign(new Error(message),{type,options}),
    });
  const zr = {extractToolCallsFromResult:r=>r.toolCalls||[]};
  await check('ZCode accepts one non-JSON Markdown summary',()=>assert.equal(zh.formatCompactSummaryOrThrow(zr,{text:'## Current work\nRun regression tests.'}),'## Current work\nRun regression tests.'));
  await check('ZCode strips analysis wrapper and retains summary text',()=>assert.equal(z.formatCompactSummary('<analysis>scratch work</analysis>\n<summary>Current task: fix retry.</summary>'),'Summary:\nCurrent task: fix retry.'));
  await check('ZCode rejects empty text at runtime validation boundary',()=>assert.throws(()=>zh.formatCompactSummaryOrThrow(zr,{text:'  '}),/Failed to generate compact summary/));
  await check('ZCode rejects model tool calls even with text',()=>assert.throws(()=>zh.formatCompactSummaryOrThrow(zr,{text:'summary',toolCalls:[{name:'Bash'}]}),/Tool use is not allowed/));
  await check('ZCode preserves transcript pointer and recent-tail notice in wrapper',()=>{
    const out=z.buildCompactSummaryMessage('Check retry',{transcriptPath:'/synthetic/transcript.jsonl',recentMessagesPreserved:true});
    assert.match(out,/Check retry/);assert.match(out,/\/synthetic\/transcript.jsonl/);assert.match(out,/Recent messages are preserved verbatim/);
  });
  await check('ZCode prompt requests text, not episodic/semantic JSON',()=>{
    const p=z.buildCompactPrompt('Keep the user constraint: never delete data.');
    assert.match(p,/TEXT ONLY/);assert.match(p,/never delete data/);assert.doesNotMatch(p,/episodic|semantic|JSON/i);
  });
  const oc = extract('opencode/packages/core/src/session/compaction.ts',['SUMMARY_TEMPLATE','SUMMARY_UPDATE_INSTRUCTIONS','buildPrompt']);
  await check('OpenCode fresh prompt requests one Markdown checkpoint',()=>{
    const p=oc.buildPrompt({context:['User: fix retry.','Assistant: investigated.']});
    assert.match(p,/Markdown/);assert.match(p,/## Objective/);assert.match(p,/fix retry/);assert.doesNotMatch(p,/<prior-summary>/);
  });
  await check('OpenCode next prompt incorporates exactly one previous summary and newer work',()=>{
    const p=oc.buildPrompt({previousSummary:'PRIOR-CONSTRAINT: never delete data.',context:['NEW-WORK: retry fixed; run tests.']});
    assert.equal(p.split('PRIOR-CONSTRAINT').length-1,1);assert.match(p,/NEW-WORK/);
    assert.match(p,/prior-summary> is discarded/);assert.match(p,/conversation wins/);
  });
  await check('OpenCode prompt has no required episodic/semantic/JSON output',()=>assert.doesNotMatch(oc.buildPrompt({context:['synthetic history']}),/episodic|semantic|JSON/i));
  const util = extract('dsh/packages/util/values/src/index.ts',['assertNever','deepFreeze']);
  const brand = extract('dsh/packages/util/brand/src/index.ts',['brandString']);
  const error = extract('dsh/packages/llm/llm/src/error.ts',['HarnessError']);
  const {LlmError} = extract('dsh/packages/llm/llm/src/index.ts',['LlmError'],error);
  const content = extract('dsh/packages/llm/llm/src/content.ts',['contentHasImage']);
  const assembler = extract('dsh/packages/llm/llm/src/assembler.ts',['BlockAssembler'],{
    ...util,...brand,
    // summarizeWithLlm never calls BlockAssembler.message(). Fail if it does.
    createAssistantMessage:()=>{throw new Error('unexpected assembler message() path in probe')},
  });
  const d = extract('dsh/packages/compaction/compaction-basic/src/summarizer.ts',[
    'SUMMARY_OPEN_TAG','SUMMARY_CLOSE_TAG','COMPACTION_INSTRUCTION','CHECKPOINT_PREAMBLE','summarizeWithLlm','frameSummary','finishError','summaryText'],
    {...util,...content,...assembler,LlmError});
  const config = {summarizationProvider:'',summarizationModel:'',maxTokens:1024};
  const agent = {session:{id:'synthetic-session',requestHeader:()=>({config:{provider:'mock',model:'mock-summary'}}),toolHistory:()=>[]},options:{}};
  const input={messages:[{role:'system',content:[{type:'text',text:'Be accurate.'}]},{role:'user',content:[{type:'text',text:'Fix retry; never delete data.'}]}],tools:[{name:'read_file',description:'synthetic',parameters:{type:'object',properties:{}}}]};
  const text='## Current Work\nRetry fixed.\n## Next Step\nRun tests.';
  const finish = kind=>({type:'finish',reason:{kind}});
  const delta = text=>({type:'text-delta',index:0,text});
  let calls=[];
  async function run(chunks,inp=input,ag=agent){return d.summarizeWithLlm({llm:{async *stream(options){calls.push(options);yield* chunks;}}},config,inp,ag)}
  await check('DSH one-shot accepts plain Markdown with real stream assembler',async()=>{
    calls=[];const result=await run([delta(text),finish('stop')]);
    assert.deepEqual(result.summary,[{type:'text',text}]);assert.equal(calls.length,1);
    assert.equal(result.llmStreamCall,true);assert.equal(result.provider,'mock');
  });
  await check('DSH replays original system/messages/tools before final summary directive',()=>{
    const req=calls[0];assert.equal(req.messages[0],input.messages[0]);assert.equal(req.messages[1],input.messages[1]);
    assert.deepEqual(req.tools,input.tools);assert.match(req.messages.at(-1).content[0].text,/Output EXACTLY the Markdown/);
    assert.equal(req.purpose,'compaction');
  });
  await check('DSH second pass receives prior checkpoint and merge instruction',async()=>{
    calls=[];const prior={role:'user',content:d.frameSummary([{type:'text',text:'OLD-CHECKPOINT: constraint retained.'}])};
    await run([delta(text),finish('stop')],{messages:[prior,...input.messages.slice(1)]});
    assert.equal(calls[0].messages[0],prior);
    assert.match(calls[0].messages.at(-1).content[0].text,/PRIOR checkpoint/);
    assert.match(calls[0].messages.at(-1).content[0].text,/single consolidated summary/);
  });
  await check('DSH rejects whitespace-only model output',()=>assert.rejects(()=>run([delta('  '),finish('stop')]),/no text summary/));
  await check('DSH rejects token-truncated nonempty output',()=>assert.rejects(()=>run([delta(text),finish('max-tokens')]),/truncated at the token cap/));
  await check('DSH rejects image output',()=>assert.rejects(()=>run([{type:'block-end',index:0,block:{type:'image'}},finish('stop')]),/cannot contain image/));
  await check('DSH filters reasoning out of checkpoint text',async()=>{
    const result=await run([{type:'reasoning-delta',index:1,text:'synthetic internal text'},delta(text),finish('stop')]);
    assert.deepEqual(result.summary,[{type:'text',text}]);assert.equal(result.rawOutput.length,2);
  });
  await check('DSH fails closed for explicit provider error',()=>assert.rejects(()=>run([{type:'finish',reason:{kind:'error',failure:{message:'synthetic failure',code:'TEST'}}}]),/synthetic failure/));
  await check('DSH rejects missing provider/model before request',()=>assert.rejects(()=>run([] ,input,{session:{requestHeader:()=>undefined},options:{}}),/no provider\/model/));
  await check('DSH framing produces one checkpoint block, not memory categories',()=>{
    const framed=d.frameSummary([{type:'text',text}]).map(b=>b.text).join('\n');
    assert.equal(framed.split('<compacted-summary>').length-1,1);assert.match(framed,/Continue the task/);assert.doesNotMatch(framed,/episodic|semantic|JSON/i);
  });
  const result={date:'2026-09-26',kind:'isolated source-declaration and mock-provider probes',typescript:ts.version,node:process.version,passed:results.length,results,sources:Object.fromEntries(sources),limitations:['Not full application integration suites.','No live-model quality, latency, or recall measurement.','ZCode error envelope construction substituted; DSH provider mocked; DSH uncalled assembler message factory guarded.','OpenCode tests only its actual prompt builder, not Effect orchestration.']};
  fs.writeFileSync(path.join(root,'contract-probe-results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(`TOTAL ${results.length} passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
