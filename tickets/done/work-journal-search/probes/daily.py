# Bytes of raw trace records per UTC day (from record timestamps), all local runs in the copy. Counts only.
import glob,json,os,collections,datetime,re
ROOT='/tmp/wjs-copy/memory'; day=collections.Counter(); TS=re.compile(r'"ts":\s*([0-9.]+)')
for f in glob.glob(ROOT+'/**/raw_traces_*.jsonl',recursive=True):
    for line in open(f,errors='replace'):
        m=TS.search(line)
        if m:
            t=float(m.group(1)); t=t/1000 if t>1e11 else t
            day[datetime.datetime.utcfromtimestamp(t).date()]+=len(line)
json.dump({str(k):v for k,v in sorted(day.items())},open('/tmp/wjs-probe/daily.json','w'))
ds=sorted(day); last=[d for d in ds if d>=datetime.date(2026,9,21)]
ratio=1709.7/8048.1
v=[day[d] for d in last]
print('days',len(ds),'first',ds[0],'last',ds[-1])
print('last 30 days raw MB/day: mean',round(sum(v)/30/1e6,1),'median',round(sorted(v)[len(v)//2]/1e6,1),'max',round(max(v)/1e6,1))
print('=> journal MB/day (ratio %.2f): mean'%ratio,round(sum(v)/30/1e6*ratio,1),'max',round(max(v)/1e6*ratio,1))
