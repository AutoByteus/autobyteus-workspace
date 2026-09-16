// Implementation renderer fixture: recorded synthetic read responses, never a live backend.
import http from 'node:http';
import fs from 'node:fs';
const records=fs.readFileSync(new URL('../api-live/transport.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);
const requests=new Map(), responses=new Map();
const key=p=>JSON.stringify([p.operationName,p.variables??{}]);
for(const r of records){if(r.type==='request'&&r.payload)requests.set(r.id,r.payload);if(r.type==='response'&&r.body&&requests.has(r.id))responses.set(key(requests.get(r.id)),r.body)}
let mode='ready';const waiting=[];
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','content-type,apollographql-client-name,apollographql-client-version');
 if(req.method==='OPTIONS'){res.end();return}
 if(req.url.startsWith('/__mode/')){mode=req.url.split('/').pop();while(waiting.length)waiting.shift()();res.end(mode);return}
 if(req.url.includes('/health')){res.setHeader('Content-Type','application/json');res.end('{"status":"ok"}');return}
 if(!req.url.includes('graphql')){res.end('{}');return}
 let text='';for await(const chunk of req)text+=chunk;
 const payload=JSON.parse(text);console.log(payload.operationName,JSON.stringify(payload.variables));
 if(payload.operationName==='GetAgentOrgReferencedTeam'&&mode==='pending')await new Promise(resolve=>waiting.push(resolve));
 res.setHeader('Content-Type','application/json');
 if(payload.operationName==='GetAgentOrgReferencedTeam'&&mode==='error'){res.end('{"errors":[{"message":"Synthetic read unavailable"}]}');return}
 const body=responses.get(key(payload));
 if(!body)console.log('UNRECORDED',payload.operationName);
 res.end(body??'{"errors":[{"message":"Renderer fixture does not execute this operation"}]}');
}).listen(50782,'127.0.0.1',()=>console.log('Owned renderer response fixture on50782'));
