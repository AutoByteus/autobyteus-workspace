"""Owned isolated server packet metadata only: NFS3 CREATE mode/verifier/name.
Never records file payloads, credentials, or traffic outside this probe server.
"""
import socket,struct,time,json
s=socket.socket(socket.AF_PACKET,socket.SOCK_RAW,socket.htons(3));s.settimeout(.2)
end=time.monotonic()+45
print(json.dumps({'event':'READY'}),flush=True)
while time.monotonic()<end:
    try:p=s.recv(65535)
    except socket.timeout:continue
    try:
        if p[12:14]!=b'\x08\x00':continue
        ip=p[14:];ihl=(ip[0]&15)*4
        if ip[9]!=6:continue
        tcp=ip[ihl:];src,dst=struct.unpack('!HH',tcp[:4])
        if dst!=2049:continue
        data=tcp[(tcp[12]>>4)*4:]
        if len(data)<36:continue
        marker=struct.unpack('!I',data[:4])[0]
        if marker>>31!=1 or marker&0x7fffffff>len(data)-4:continue
        r=data[4:4+(marker&0x7fffffff)]
        u=lambda off:struct.unpack('!I',r[off:off+4])[0]
        if u(4)!=0 or u(12)!=100003 or u(16)!=3 or u(20)!=8:continue
        cred_len=u(28);off=32+((cred_len+3)&~3)
        verifier_len=u(off+4);off+=8+((verifier_len+3)&~3)
        fh_len=u(off);off+=4+((fh_len+3)&~3)
        name_len=u(off);name=r[off+4:off+4+name_len].decode();off+=4+((name_len+3)&~3)
        mode=u(off);verifier=r[off+4:off+12].hex() if mode==2 else None
        if name.startswith('race-'):
            print(json.dumps({'name':name,'createMode':mode,'verifier':verifier,'sourceIp':socket.inet_ntoa(ip[12:16]),'sourcePort':src,'xid':u(0)}),flush=True)
    except (IndexError,ValueError,struct.error):continue
