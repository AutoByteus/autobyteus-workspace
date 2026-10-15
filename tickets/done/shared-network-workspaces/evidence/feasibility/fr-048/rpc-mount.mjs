// Designer-owned MOUNT3 contract probe; no file copying or product command.
import net from 'node:net';
const [host, exportPath] = process.argv.slice(2);
const u32 = x => { const b=Buffer.alloc(4); b.writeUInt32BE(x); return b; };
const str = s => { const b=Buffer.from(s); return Buffer.concat([u32(b.length),b,Buffer.alloc((4-b.length%4)%4)]); };
const xid = 481048;
const payload=Buffer.concat([u32(xid),u32(0),u32(2),u32(100005),u32(3),u32(1),u32(0),u32(0),u32(0),u32(0),str(exportPath)]);
const socket=net.connect({host,port:2049}); let incoming=Buffer.alloc(0);
const timeout=setTimeout(()=>{socket.destroy();process.stderr.write('MOUNT3 deadline\n');process.exitCode=2;},3000);
socket.on('connect',()=>socket.write(Buffer.concat([u32((0x80000000|payload.length)>>>0),payload])));
socket.on('data', data=>{
  incoming=Buffer.concat([incoming,data]); if(incoming.length<4)return;
  const marker=incoming.readUInt32BE(0), length=marker&0x7fffffff;
  if(!(marker>>>31))throw new Error('Unexpected fragmented small reply');
  if(incoming.length<length+4)return;
  const r=incoming.subarray(4,4+length);
  if(r.readUInt32BE(0)!==xid || r.readUInt32BE(4)!==1 || r.readUInt32BE(8)!==0)throw new Error('Rejected/malformed RPC reply');
  const verifierLength=r.readUInt32BE(16), offset=20+((verifierLength+3)&~3);
  if(r.readUInt32BE(offset)!==0)throw new Error('RPC program not accepted');
  process.stdout.write(JSON.stringify({mountStatus:r.readUInt32BE(offset+4),host,exportPath})+'\n');
  clearTimeout(timeout);socket.end();
});
socket.on('error',error=>{clearTimeout(timeout);process.stderr.write(String(error)+'\n');process.exitCode=1;});
