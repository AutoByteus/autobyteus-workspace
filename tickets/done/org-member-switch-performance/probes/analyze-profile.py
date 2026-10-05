import json,sys,collections
p=json.load(open(sys.argv[1]))
nodes={n['id']:n for n in p['nodes']}
parent={}
for n in p['nodes']:
  for c in n.get('children',[]): parent[c]=n['id']
dt=collections.Counter()
samples=p['samples']; deltas=p['timeDeltas']
for s,d in zip(samples,deltas): dt[s]+=d
total=sum(dt.values())/1000
selfc=collections.Counter(); incl=collections.Counter()
def key(n):
  cf=n['callFrame']; u=cf['url'].rsplit('/',1)[-1]
  return f"{cf['functionName'] or '(anon)'} @{u}:{cf['lineNumber']}"
for nid,t in dt.items():
  n=nodes[nid]; selfc[key(n)]+=t
  seen=set(); cur=nid
  while cur is not None:
    k=key(nodes[cur])
    if k not in seen: incl[k]+=t; seen.add(k)
    cur=parent.get(cur)
print('total sampled ms', round(total))
print('--- top self'); [print(round(v/1000), k) for k,v in selfc.most_common(25)]
print('--- top inclusive'); [print(round(v/1000), k) for k,v in incl.most_common(45)]
