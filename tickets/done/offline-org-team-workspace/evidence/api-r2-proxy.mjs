import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import {info,evidence} from './api-r2-utils.mjs';
const upstream=new URL(info.serverUrl);
const server=http.createServer(async(req,res)=>{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
 let fault={};try{fault=JSON.parse(await fs.readFile(evidence+'/api-r2-fault.json','utf8'));}catch{}
 let payload;try{payload=JSON.parse(body);}catch{}
 const op=payload?.operationName;
 if(payload?.query?.includes('workspaceMetadata(')&&payload.variables?.rootPath===fault.rootPath){
  await fs.appendFile(evidence+'/api-r2-requests.jsonl',JSON.stringify({time:new Date().toISOString(),operation:op,rootPath:fault.rootPath,fault:true})+'\n');
  res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':req.headers.origin||'*'});res.end(JSON.stringify({errors:[{message:'API-E2E controlled metadata unavailable'}],data:null}));return;
 }
 if(payload)await fs.appendFile(evidence+'/api-r2-requests.jsonl',JSON.stringify({time:new Date().toISOString(),operation:op,variables:payload.variables})+'\n');
 const proxy=http.request({hostname:upstream.hostname,port:upstream.port,path:req.url,method:req.method,headers:{...req.headers,host:upstream.host}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});proxy.on('error',e=>{res.writeHead(502);res.end(String(e));});proxy.end(body);
});
server.on('upgrade',(req,socket,head)=>{
 const target=net.connect(Number(upstream.port),upstream.hostname,()=>{target.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');if(head.length)target.write(head);socket.pipe(target);target.pipe(socket);});target.on('error',()=>socket.destroy());socket.on('error',()=>target.destroy());
});
server.listen(0,'127.0.0.1',async()=>{const url='http://127.0.0.1:'+server.address().port;await fs.writeFile(evidence+'/api-r2-proxy-url.txt',url);console.log(url);});
