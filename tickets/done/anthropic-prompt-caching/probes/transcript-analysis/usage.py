import json,sys,datetime
path=sys.argv[1]
calls={}  # message.id -> (ts, usage, sidechain)
order=[]
for line in open(path):
    try: o=json.loads(line)
    except: continue
    if o.get('type')!='assistant': continue
    m=o.get('message') or {}
    mid=m.get('id'); u=m.get('usage')
    if not mid or not u: continue
    if mid not in calls: order.append(mid)
    calls[mid]=(o.get('timestamp'), u, o.get('isSidechain'), m.get('model'))
tot={'in':0,'cr':0,'cw':0,'w5':0,'w1':0,'out':0}
prev=None; gaps=[]
for mid in order:
    ts,u,side,model=calls[mid]
    if side: continue
    tot['in']+=u.get('input_tokens',0); tot['cr']+=u.get('cache_read_input_tokens',0); tot['cw']+=u.get('cache_creation_input_tokens',0)
    cc=u.get('cache_creation') or {}; tot['w5']+=cc.get('ephemeral_5m_input_tokens',0); tot['w1']+=cc.get('ephemeral_1h_input_tokens',0)
    tot['out']+=u.get('output_tokens',0)
    t=datetime.datetime.fromisoformat(ts.replace('Z','+00:00'))
    if prev: gaps.append((t-prev).total_seconds())
    prev=t
g=tot['in']+tot['cr']+tot['cw']
print('calls',len([1 for m in order if not calls[m][2]]),'model',calls[order[-1]][3])
print(tot,'hit%%=%.1f'%(100*tot['cr']/g if g else 0))
gaps.sort()
if gaps: print('gaps>300s',sum(1 for x in gaps if x>300),'gaps>3600s',sum(1 for x in gaps if x>3600),'max',max(gaps))
