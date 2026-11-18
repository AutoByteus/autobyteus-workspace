import json,time,urllib.request
files=open('/tmp/wjs-probe/speed-files.txt').read().split()
chunks=[]
for f in files:
    t=open(f,errors='replace').read()
    for i in range(0,len(t)-2400,50000):
        chunks.append(t[i:i+2400])
chunks=chunks[8:208]
for bs in (16,):
    t=time.time()
    for i in range(0,len(chunks),bs):
        body={"model":"text-embedding-nomic-embed-text-v1.5","input":["search_document: "+c[:1800] for c in chunks[i:i+bs]]}
        json.load(urllib.request.urlopen(urllib.request.Request('http://localhost:1234/v1/embeddings',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=600))
    el=time.time()-t; print(json.dumps({"model":"nomic-embed-text-v1.5 (LM Studio, GPU)","items":len(chunks),"chars":1800,"seconds":round(el,1),"perSecond":round(len(chunks)/el,1)}))
