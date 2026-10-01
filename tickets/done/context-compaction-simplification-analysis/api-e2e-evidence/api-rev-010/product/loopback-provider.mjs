// Owned deterministic model-protocol emulator. It has NO outbound-network client.
import http from 'node:http';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=process.env.API10_FIXTURE_OUTPUT_DIR ? pathToFileURL(process.env.API10_FIXTURE_OUTPUT_DIR+'/') : new URL('./',import.meta.url);
const prompt=fs.readFileSync("/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md",'utf8');
const log=v=>fs.appendFileSync(new URL('loopback-wire.jsonl',here),JSON.stringify({at:new Date().toISOString(),...v})+'\n');
const state={armed:false,mode:'fail',requests:Number(process.env.API10_INITIAL_REQUESTS||0),parent:Number(process.env.API10_INITIAL_PARENT||0),compaction:Number(process.env.API10_INITIAL_COMPACTION||0),phase:0,closed:false};
let held=[]; let toolIssued=false;
const model='api10-deterministic-32768';
const body=['Goal and constraints','Decisions and findings','Completed work','Current state','Open work and next steps','Essential references'].map((h,i)=>`## ${h}\n- ${[
  'Exercise the API10 synthetic recovery scenario only. No deployment or external action is authorized.',
  'Synthetic evidence anchors remain owner Mira Chen and customer Northwind Helios.',
  'Earlier seed messages were acknowledged. No tools or external work were performed.',
  'Continue the latest retained user request; do not treat planned work as completed.',
  'Handle the retained inputs in order without duplicate dispatch.',
  'API10 fixture; this scripted output is not semantic model-quality evidence.'
][i]}`).join('\n\n');
const json=(res,status,v)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};
const response=(res,input,kind,id)=>{
 if(res.destroyed){log({event:'discard_closed_response',id});return;}
 const last=[...input.messages].reverse().find(m=>m.role==='user')?.content??'';
 const toolRequest=kind==='parent' && !toolIssued && String(last).startsWith('API10-TOOL-READ') && !input.messages.some(m=>m.role==='tool');
 if(toolRequest){
  if(!input.stream || !input.tools?.some(t=>t.function?.name==='read_file'))throw new Error('expected advertised native read_file');
  toolIssued=true;
  const call={index:0,id:'api10_owned_read_once',type:'function',function:{name:'read_file',arguments:JSON.stringify({path:new URL('consumed-tool-source.txt',new URL('./',import.meta.url)).pathname})}};
  const base={id:'api10-tool-'+id,object:'chat.completion.chunk',created:Math.floor(Date.now()/1000),model};
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  res.write('data: '+JSON.stringify({...base,choices:[{index:0,delta:{role:'assistant',tool_calls:[call]},finish_reason:null}]})+'\n\n');
  res.write('data: '+JSON.stringify({...base,choices:[{index:0,delta:{},finish_reason:'tool_calls'}],usage:{prompt_tokens:800,completion_tokens:40,total_tokens:840}})+'\n\n');res.end('data: [DONE]\n\n');
  log({event:'tool_response',id,call});return;
 }
 const text=kind==='compaction'?`<compaction_summary>\n${toolIssued?body.replace('No tools or external work were performed.','The owned read_file result was consumed once; do not replay it. No external work was performed.'):body}\n</compaction_summary>`:`ACK ${String(typeof last==='string'?last:JSON.stringify(last)).match(/API10-[A-Z0-9_-]+/)?.[0]??'API10-INPUT'}`;
 const usage={prompt_tokens:Math.ceil(input.messages.map(m=>typeof m.content==='string'?m.content:JSON.stringify(m.content)).join('\n').length/4)+12*input.messages.length,completion_tokens:Math.ceil(text.length/4),total_tokens:0};usage.total_tokens=usage.prompt_tokens+usage.completion_tokens;
 const base={id:`api10-${id}`,object:'chat.completion',created:Math.floor(Date.now()/1000),model};
 if(input.stream){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});res.write('data: '+JSON.stringify({...base,object:'chat.completion.chunk',choices:[{index:0,delta:{role:'assistant',content:text},finish_reason:null}]})+'\n\n');res.write('data: '+JSON.stringify({...base,object:'chat.completion.chunk',choices:[{index:0,delta:{},finish_reason:'stop'}],usage})+'\n\n');res.end('data: [DONE]\n\n');}
 else json(res,200,{...base,choices:[{index:0,message:{role:'assistant',content:text},finish_reason:'stop'}],usage});
 log({event:'response',id,kind,content:text,usage});
};
const server=http.createServer(async(req,res)=>{
 try{
  if(req.method==='GET'&&req.url==='/api/v1/models')return json(res,200,{models:[{key:model,max_context_length:32768,loaded_instances:[{config:{context_length:32768}}]}]});
  if(req.method==='GET'&&req.url==='/v1/models')return json(res,200,{object:'list',data:[{id:model,object:'model',owned_by:'API10 fixture'}]});
  if(req.url==='/state')return json(res,200,{...state,held:held.length});
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2_000_000)throw new Error('input ceiling');}
  const input=raw?JSON.parse(raw):{};
  if(req.url==='/control'&&req.method==='POST'){
   if(!['fail','success','hold_success','disarm','release'].includes(input.mode))throw new Error('invalid control');
   if(input.mode==='release'){for(const x of held){clearTimeout(x.timer);response(x.res,x.input,'compaction',x.id);}held=[];}
   else{state.armed=input.mode!=='disarm';state.mode=input.mode;state.phase++;}
   log({event:'control',mode:input.mode,phase:state.phase});return json(res,200,{...state,held:held.length});
  }
  if(req.url!=='/v1/chat/completions'||req.method!=='POST')return json(res,404,{error:{message:'unsupported fixture endpoint'}});
  if(!state.armed||state.closed||state.requests>=80)throw new Error('generation not armed or ceiling reached');
  if(input.model!==model||!Array.isArray(input.messages))throw new Error('unexpected model/request');
  const kind=input.messages.some(m=>m.role==='system'&&m.content===prompt)?'compaction':'parent';
  if(kind==='compaction'&&(input.messages.length!==2||input.stream||input.tools||String(input.messages[1].content).startsWith('Summary budget:')))throw new Error('compaction contract guard');
  if(kind==='parent'&&!JSON.stringify(input.messages).includes('API10-'))throw new Error('unexpected parent fixture');
  const id=++state.requests;state[kind]++;
  log({event:'request',id,kind,phase:state.phase,body:input,sha256:createHash('sha256').update(raw).digest('hex')});
  if(kind==='compaction'&&state.mode==='fail'){log({event:'response_error',id,status:503});return json(res,503,{error:{message:'API10 deliberate synthetic compaction failure',type:'api_error',code:'API10_SYNTHETIC_503'}});}
  if(kind==='compaction'&&state.mode==='hold_success'){
   const timer=setTimeout(()=>{log({event:'fixture_hold_timeout',id});json(res,504,{error:{message:'API10 hold deadline'}});held=held.filter(x=>x.id!==id);state.closed=true;},Math.min(120000,Number(process.env.API10_HOLD_MS||120000)));
   held.push({res,input,id,timer});res.on('close',()=>{if(!res.writableEnded){clearTimeout(timer);log({event:'request_aborted',id});}});return;
  }
  response(res,input,kind,id);
 }catch(error){state.closed=true;log({event:'guard_failure',message:String(error.message)});if(!res.headersSent)json(res,400,{error:{message:'API10 fixture guard stopped'}});else res.end();}
});
server.listen(Number(process.env.API10_OWNED_PORT||0),'127.0.0.1',()=>{const port=server.address().port;fs.writeFileSync(new URL('loopback-state.json',here),JSON.stringify({pid:process.pid,port,url:`http://127.0.0.1:${port}`,model,started:new Date().toISOString()},null,2));console.log(`Owned loopback ready at ${port}; generation disarmed`);});
const stop=()=>{state.closed=true;for(const x of held){clearTimeout(x.timer);x.res.destroy();}server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),3000).unref();};
process.on('SIGTERM',stop);process.on('SIGINT',stop);setTimeout(stop,Math.min(3600000,Math.max(1,Date.parse(process.env.API10_DEADLINE||new Date(Date.now()+3600000).toISOString())-Date.now()))).unref();
