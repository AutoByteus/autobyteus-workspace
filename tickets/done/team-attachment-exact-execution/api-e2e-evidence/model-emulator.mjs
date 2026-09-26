// Temporary deterministic provider transport: proves request bytes, not model inference.
import http from 'node:http';
import fs from 'node:fs/promises';
const log = new URL('provider-requests.jsonl', import.meta.url);
const server=http.createServer(async(req,res)=>{
 if(req.url==='/api/v1/models'){res.setHeader('content-type','application/json');res.end(JSON.stringify({models:[{key:'attachment-fixture',max_context_length:32768,loaded_instances:[{config:{context_length:32768}}]}]}));return;}
 if(req.url==='/v1/models'){res.setHeader('content-type','application/json');res.end(JSON.stringify({data:[{id:'attachment-fixture',object:'model'}]}));return;}
 let body=''; for await(const chunk of req) body+=chunk;
 const payload=JSON.parse(body||'{}');await fs.appendFile(log,JSON.stringify({url:req.url,payload})+'\n');
 if(req.url!=='/v1/chat/completions'){res.statusCode=404;res.end();return;}
 if(payload.stream){res.writeHead(200,{'content-type':'text/event-stream'});
 const base={id:'fixture-completion',object:'chat.completion.chunk',created:1,model:'attachment-fixture'};
 for(const part of [{choices:[{index:0,delta:{role:'assistant',content:'Attachment received.'},finish_reason:null}]},{choices:[{index:0,delta:{},finish_reason:'stop'}]}])res.write('data: '+JSON.stringify({...base,...part})+'\n\n');
 res.end('data: [DONE]\n\n');
 }else {res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'fixture',object:'chat.completion',choices:[{index:0,message:{role:'assistant',content:'Attachment received.'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));}
});server.listen(3422,'127.0.0.1',()=>console.log('Isolated model emulator ready 3422'));
