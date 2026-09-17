import http from 'node:http';import net from 'node:net';import fs from 'node:fs'
const root=process.argv[2];if(!root.endsWith('/stopped-org-whole-config/.local/api-whole-org-config'))throw Error('owned only')
let seq=0;const log=v=>fs.appendFileSync(root+'/transport.jsonl',JSON.stringify({at:new Date().toISOString(),...v})+'\n')
const control=()=>{try{return JSON.parse(fs.readFileSync(root+'/control.json','utf8'))}catch{return {}}}
http.createServer(async(req,res)=>{
 const id=++seq;let body=Buffer.alloc(0);for await(const c of req)body=Buffer.concat([body,c]);let payload;try{if(req.url.includes('graphql'))payload=JSON.parse(body)}catch{}
 const op=payload?.operationName||'';const secret=/credential|key|secret|setting/i.test(op);log({id,type:'request',method:req.method,url:req.url,op,payload:secret?{operationName:op,redacted:true}:payload})
 const u=http.request({host:'127.0.0.1',port:51281,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:51281'}},async reply=>{
  let out=Buffer.alloc(0);for await(const c of reply)out=Buffer.concat([out,c]);const c=control();log({id,type:'backend_response',op,status:reply.statusCode,body:secret?'[redacted]':out.toString(),control:c})
  if((c.delayOps||[]).includes(op)&&c.delayMs)await new Promise(r=>setTimeout(r,c.delayMs))
  if((c.failResponseOps||[]).includes(op)){log({id,type:'released_fault',op,status:503});res.writeHead(503,{'content-type':'text/plain','access-control-allow-origin':'*'});res.end('Owned post-forward response fault');return}
  log({id,type:'released',op,status:reply.statusCode});res.writeHead(reply.statusCode,reply.headers);res.end(out)
 });u.on('error',()=>{res.writeHead(502,{'access-control-allow-origin':'*'});res.end('Owned backend unavailable')});u.end(body)
}).on('upgrade',(req,s,h)=>{log({type:'ws_upgrade',url:req.url});const u=net.connect(51281,'127.0.0.1',()=>{u.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');if(h.length)u.write(h);s.pipe(u).pipe(s)});u.on('error',()=>s.destroy());s.on('error',()=>u.destroy())}).listen(51282,'127.0.0.1',()=>console.log('Owned observer51282'))
