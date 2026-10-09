import json,sys,datetime,os
P=dict(inp=4.0,read=0.2,w5=5.0,w1=8.0)
def load(path):
    calls={};order=[]
    for line in open(path):
        try:o=json.loads(line)
        except:continue
        if o.get('type')!='assistant' or o.get('isSidechain'):continue
        m=o.get('message') or {};mid=m.get('id');u=m.get('usage')
        if not mid or not u:continue
        if mid not in calls:order.append(mid)
        calls[mid]=(o.get('timestamp'),u)
    out=[]
    for mid in order:
        ts,u=calls[mid]
        out.append((datetime.datetime.fromisoformat(ts.replace('Z','+00:00')),u.get('input_tokens',0)+u.get('cache_read_input_tokens',0)+u.get('cache_creation_input_tokens',0)))
    return out
def sim(seq,ttl,wprice):
    cost=0;prev=None
    for t,p in seq:
        if prev and (t-prev[0]).total_seconds()<=ttl:
            r=min(prev[1],p); w=p-r
        else: r=0;w=p
        cost+=r*P['read']/1e6+w*wprice/1e6; prev=(t,p)
    return cost
tot={'none':0,'5m':0,'1h':0}
for path in sys.argv[1:]:
    seq=load(path)
    if len(seq)<20:continue
    a=sum(p for _,p in seq)*P['inp']/1e6; b=sim(seq,300,P['w5']); c=sim(seq,3600,P['w1'])
    tot['none']+=a;tot['5m']+=b;tot['1h']+=c
    print(os.path.basename(path)[:8],len(seq),'none $%.2f  5m $%.2f  1h $%.2f'%(a,b,c))
print('TOTAL none $%.2f  5m $%.2f  1h $%.2f'%(tot['none'],tot['5m'],tot['1h']))
