"""Read-only focused decoder of archived tcpdump -X, not a general RPC parser.
Only complete single-fragment RPC-over-TCP records and the observed directory
COMPOUND prefix are recognized. Unsupported/truncated layouts are counted, not
assumed decoded. Keeps byte offsets/XIDs for inspection against raw text.
"""
from pathlib import Path
import re,struct,json
E=Path(__file__).resolve().parent
lines=(E/'linux-dir-packets.log').read_text().splitlines();packets=[];current=None
for num,line in enumerate(lines,1):
 if re.match(r'^\d\d:\d\d:\d\d\.',line):
  if current:packets.append(current)
  current={'line':num,'header':line,'hex':''}
 elif current and re.match(r'^\s*0x[0-9a-f]+:',line):
  words=re.match(r'^\s*0x[0-9a-f]+:\s*((?:[0-9a-f]{4}(?:\s+|$)){1,8})',line)
  if words:current['hex']+=''.join(words[1].split())
if current:packets.append(current)
class X:
 def __init__(self,b):self.b=b;self.i=0
 def u(self):v=struct.unpack_from('!I',self.b,self.i)[0];self.i+=4;return v
 def skip(self,n):self.i+=n;assert self.i<=len(self.b)
 def opaque(self):n=self.u();self.skip((n+3)//4*4)
rows=[];ignored=0
for p in packets:
 try:
  b=bytes.fromhex(p['hex']);assert b[0]>>4==4 and b[9]==6
  ip=(b[0]&15)*4;tcp=((b[ip+12]>>4)&15)*4;buf=b[ip+tcp:]
  if len(buf)<4:continue
  x=X(buf);mark=x.u();assert mark>>31 and mark&0x7fffffff==len(buf)-4
  xid=x.u();kind=x.u();ops=[];row={'packetLine':p['line'],'xid':hex(xid),'kind':kind,'ops':ops}
  if kind==0:
   assert [x.u(),x.u(),x.u(),x.u()]==[2,100003,4,1]
   x.u();x.opaque();x.u();x.opaque();x.opaque();row['minor']=x.u();n=x.u();row['opCount']=n
   for i in range(n):
    op=x.u();ops.append(op)
    if op==53:x.skip(32)
    elif op==22:x.opaque()
    elif op==46:rows.append(row);break
    else:break
  elif kind==1:
   assert x.u()==0;x.u();x.opaque();assert x.u()==0
   row['compoundStatus']=x.u();x.opaque();n=x.u();row['opCount']=n
   for i in range(n):
    op=x.u();status=x.u();ops.append({'op':op,'status':status})
    if status:rows.append(row);break
    if op==53:x.skip(36)
    elif op==22:pass
    else:break
 except (AssertionError,IndexError,struct.error,ValueError):ignored+=1
calls={r['xid']:r for r in rows if r['kind']==0}
pairs=[{'call':calls[r['xid']],'reply':r} for r in rows if r['kind']==1 and r['xid'] in calls]
out={'input':'linux-dir-packets.log','limits':'single complete IPv4 TCP RPC record; only SEQUENCE/PUTFH/GET_DIR_DELEGATION prefix; no general reassembly','packetBlocks':len(packets),'unsupportedOrTruncated':ignored,'directoryCalls':[r for r in rows if r['kind']==0],'matchingErrorPairs':pairs}
(E/'packet-decode-result.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'directoryCalls':len(calls),'matchingErrorPairs':len(pairs),'statuses':[r['reply']['compoundStatus'] for r in pairs]}))
