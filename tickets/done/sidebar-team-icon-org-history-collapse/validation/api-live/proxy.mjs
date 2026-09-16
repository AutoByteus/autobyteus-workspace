import http from 'node:http';import net from 'node:net';import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2];if(!root?.endsWith('/.local/api-sidebar'))throw Error('Owned root required');
const log=(v)=>fs.appendFileSync(path.join(root,'requests.jsonl'),JSON.stringify({at:new Date().toISOString(),...v})+'\n');
let id=0;
const server=http.createServer(async(req,res)=>{
 const rid=++id;const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);let op=null;try{if(req.url?.includes('graphql'))op=JSON.parse(body.toString());}catch{}
 log({kind:'request',id:rid,method:req.method,url:req.url,bytes:body.length,...(op?{operation:op.operationName,variables:op.variables}: {})});
 if(req.url?.startsWith('/fixtures/')){const n=path.basename(req.url.split('?')[0]);if(['avatar-blue.png','avatar-green.png'].includes(n)){res.writeHead(200,{'content-type':'image/png','access-control-allow-origin':'*'});res.end(fs.readFileSync(path.join(root,'assets',n)));}else{res.writeHead(404,{'access-control-allow-origin':'*'});res.end('Missing test avatar');}return;}
 let control={};try{control=JSON.parse(fs.readFileSync(path.join(root,'fault-control.json'),'utf8'));}catch{}
 const match=(control.target==='upload'&&req.url?.includes('upload-file'))||(control.target&&control.target===op?.operationName);
 if(match&&control.reject){log({kind:'fault-reject',id:rid});res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({detail:'Test-owned controlled temporary failure'}));return;}
 const upstream=http.request({host:'127.0.0.1',port:50581,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:50581'}},async reply=>{
  const out=[];for await(const c of reply)out.push(c);const response=Buffer.concat(out);log({kind:'response',id:rid,status:reply.statusCode,bytes:response.length});
  if(match&&control.delayMs){log({kind:'response-delayed',id:rid,ms:control.delayMs});await new Promise(r=>setTimeout(r,control.delayMs));}
  res.writeHead(reply.statusCode,reply.headers);res.end(response);
 });upstream.on('error',e=>{log({kind:'upstream-error',id:rid,message:e.message});if(!res.headersSent)res.writeHead(502);res.end('Test backend unavailable');});upstream.end(body);
});
server.on('upgrade',(req,socket,head)=>{const upstream=net.connect(50581,'127.0.0.1',()=>{upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());});
server.listen(50582,'127.0.0.1',()=>console.log('Owned observation proxy50582 -> realbackend50581'));
