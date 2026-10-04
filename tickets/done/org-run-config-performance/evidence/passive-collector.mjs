import http from 'node:http';
import fs from 'node:fs';
const file = new URL('./passive-ui-events.jsonl', import.meta.url);
http.createServer((req,res) => {
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:50910');
  if(req.method==='POST') {
    let body=''; req.on('data',b=>{body+=b;if(body.length>20000)req.destroy();});
    req.on('end',()=>{try { const value=JSON.parse(body);fs.appendFileSync(file,JSON.stringify({receivedAt:new Date().toISOString(),...value})+'\n');res.end('ok');}catch{res.statusCode=400;res.end();}});
  } else res.end('passive collector');
}).listen(50911,'127.0.0.1');
