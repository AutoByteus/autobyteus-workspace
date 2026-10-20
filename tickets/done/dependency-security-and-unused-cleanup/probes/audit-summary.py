import json,sys,collections
def load(p):
    d=json.load(open(p)); return d
for label,p in [('ALL','/tmp/audit229-base.json'),('PROD','/tmp/audit229-prod.json')]:
    d=load(p); print('==',label,d['metadata']['vulnerabilities'])
d=load('/tmp/audit229-prod.json')
mods=collections.defaultdict(lambda:{'sev':set(),'n':0,'patched':set(),'importers':set(),'paths':set()})
for a in d['advisories'].values():
    if a['severity'] not in ('critical','high'): continue
    m=mods[a['module_name']]; m['sev'].add(a['severity']); m['n']+=1; m['patched'].add(a.get('patched_versions'))
    for f in a.get('findings',[]):
        for pth in f.get('paths',[]):
            parts=pth.split('>'); m['importers'].add(parts[0]); m['paths'].add('>'.join(parts[:4]))
        m.setdefault('vers',set()).add(f.get('version'))
for k,m in sorted(mods.items(), key=lambda kv:(0 if 'critical' in kv[1]['sev'] else 1, kv[0])):
    print(f"{k:28} {'/'.join(sorted(m['sev'])):14} n={m['n']:2} vers={sorted(m.get('vers',[]))} imp={sorted(m['importers'])}")
    for pth in sorted(m['paths'])[:3]: print('      ',pth)
print('prod modules with high/critical:',len(mods))
