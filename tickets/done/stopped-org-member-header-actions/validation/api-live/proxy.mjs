import http from 'node:http';import net from 'node:net';import fs from 'node:fs';
const root=process.argv[2];if(!root.endsWith('/.local/api-stopped-config'))throw Error('owned only');
let seq=0;const log=v=>fs.appendFileSync(root+'/transport.jsonl',JSON.stringify({at:new Date().toISOString(),...v})+'\n');
http.createServer(async(req,res)=>{
 const id=++seq;let body=Buffer.alloc(0);for await(const c of req)body=Buffer.concat([body,c]);let payload;try{if(req.url.includes('graphql'))payload=JSON.parse(body)}catch{}
 const secret=/credential|key|secret|setting/i.test(payload?.operationName||'');
 log({id,type:'request',method:req.method,url:req.url,payload:secret?{operationName:payload.operationName,redacted:true}:payload});
 let control={};try{control=JSON.parse(fs.readFileSync(root+'/control.json','utf8'))}catch{}
 const exact=/^(AgentOrgMemberModelConfig|UpdateStoppedAgentOrgMemberModelConfig)$/.test(payload?.operationName||'');
 const u=http.request({host:'127.0.0.1',port:51081,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:51081'}},async reply=>{
  let out=Buffer.alloc(0);for await(const c of reply)out=Buffer.concat([out,c]);
  log({id,type:'response',status:reply.statusCode,...(payload?{body:secret?'[redacted]':out.toString()}:{}),edge:exact?control:undefined});
  if(exact&&control.delayMs)await new Promise(r=>setTimeout(r,control.delayMs));
  if(exact&&control.fail){res.writeHead(503,{'content-type':'text/plain','access-control-allow-origin':'*'});res.end('Test-owned reference transport unavailable');return}
  res.writeHead(reply.statusCode,reply.headers);res.end(out);
 });u.on('error',()=>{res.writeHead(502,{'access-control-allow-origin':'*'});res.end('Owned backend unavailable')});u.end(body);
}).on('upgrade',(req,s,h)=>{
 const u=net.connect(51081,'127.0.0.1',()=>{u.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');if(h.length)u.write(h);s.pipe(u).pipe(s)});u.on('error',()=>s.destroy());s.on('error',()=>u.destroy());
}).listen(51082,'127.0.0.1',()=>console.log('Owned observer51082'));
