import json,sys,datetime,glob,os
rows=[]
for path in sys.argv[1:]:
    calls={};order=[]
    for line in open(path):
        try:o=json.loads(line)
        except:continue
        if o.get('type')!='assistant':continue
        m=o.get('message') or {};mid=m.get('id');u=m.get('usage')
        if not mid or not u or o.get('isSidechain'):continue
        if mid not in calls:order.append(mid)
        calls[mid]=(o.get('timestamp'),u,m.get('model'))
    if len(order)<20:continue
    t=dict(i=0,r=0,w=0,w5=0,w1=0);prev=None;g5=g60=0;big=0;prevprompt=None;spikew=0
    for mid in order:
        ts,u,model=calls[mid]
        i=u.get('input_tokens',0);r=u.get('cache_read_input_tokens',0);w=u.get('cache_creation_input_tokens',0)
        cc=u.get('cache_creation') or {}
        t['i']+=i;t['r']+=r;t['w']+=w;t['w5']+=cc.get('ephemeral_5m_input_tokens',0);t['w1']+=cc.get('ephemeral_1h_input_tokens',0)
        tm=datetime.datetime.fromisoformat(ts.replace('Z','+00:00'))
        if prev:
            d=(tm-prev).total_seconds(); g5+=d>300; g60+=d>3600
        prev=tm
        if prevprompt and w>0.5*prevprompt: big+=1; spikew+=w
        prevprompt=i+r+w
    G=t['i']+t['r']+t['w']
    rows.append((os.path.basename(os.path.dirname(path))[-40:],model,len(order),round(100*t['r']/G,1),t['w5'],t['w1'],g5,g60,big,round(100*spikew/G,1)))
print('project|model|calls|hit%|w5m|w1h|gaps>5m|gaps>1h|rewrite_spikes|spike_write%')
for r in sorted(rows,key=lambda r:-r[2])[:25]:print(*r,sep='|')
