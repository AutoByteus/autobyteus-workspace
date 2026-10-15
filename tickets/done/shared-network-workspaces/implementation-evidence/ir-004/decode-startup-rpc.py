"""Evidence-only decoder of complete, single-record IPv4 TCP RPC payloads in
owned guest tcpdump -X text. Not a stream reassembler; skipped/incomplete payloads
are not evidence of absence. No network access or product use.
"""
from pathlib import Path
import re,struct,json,sys
p=Path(sys.argv[1]);rows=[];packet=None
for no,line in enumerate(p.read_text().splitlines()+['END'],1):
 if re.match(r'^\d{4}-',line) or line=='END':
  if packet:
   raw=bytes.fromhex(''.join(packet['hex']))
   if len(raw)>=40 and raw[0]>>4==4 and raw[9]==6:
    ip=(raw[0]&15)*4;tcp=(raw[ip+12]>>4)*4;body=raw[ip+tcp:]
    if len(body)>=28:
     marker=int.from_bytes(body[:4],'big');n=marker&0x7fffffff
     if marker>>31==1 and n==len(body)-4 and n%4==0:
      words=struct.unpack('>'+str(n//4)+'I',body[4:]);kind=words[1]
      row={k:packet[k] for k in ['line','time','flow']};row['xid']=hex(words[0])
      if kind==0 and len(words)>=10:
       row.update(kind='call',program=words[3],version=words[4],procedure=words[5])
       if words[3]==100000:row['argumentsHex']=body[44:].hex()
      elif kind==1 and words[2]==0 and len(words)>=6:
       statusindex=5+(words[4]+3)//4
       if len(words)>statusindex:row.update(kind='accepted-reply',status=words[statusindex],resultsHex=body[4+(statusindex+1)*4:].hex())
      if 'kind' in row:rows.append(row)
  packet=None if line=='END' else {'line':no,'time':line[:26],'hex':[],'flow':''}
 elif packet and line.startswith('    '):packet['flow']=line.strip()
 elif packet and line.startswith('\t0x'):
  m=re.match(r'\t0x[0-9a-f]+:  ((?:[0-9a-f]{4} ?)+)',line)
  if m:packet['hex'].append(m.group(1).replace(' ',''))
out=p.with_name(p.stem+'-rpc.json');out.write_text(json.dumps({'source':p.name,'limits':__doc__,'records':rows},indent=2)+'\n');print(out,len(rows))
