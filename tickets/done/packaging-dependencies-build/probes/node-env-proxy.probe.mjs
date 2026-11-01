import http from 'node:http';
const seen=[];
const proxy=http.createServer((req,res)=>{seen.push(req.method+' '+req.url);res.end('via-proxy');});
proxy.listen(0,'127.0.0.1',async()=>{
  const port=proxy.address().port;
  process.env.HTTP_PROXY=`http://127.0.0.1:${port}`;
  try{const r=await fetch('http://models.invalid/file.bin');console.log('body',await r.text());}catch(e){console.log('fetch error',e.cause?.code||e.message)}
  console.log('proxy saw',JSON.stringify(seen));proxy.close();
});
