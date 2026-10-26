# Probe backend for the proposed search_memory tool: text tier (plain 2,000-char chunks) + meaning tier (cards), interleaved; pointers only.
import json,os,re,sqlite3,numpy as np
ROOT='/tmp/wjs-copy/memory'
STOP=set('a an the and or of to in on for with we our my me you your i is are was were be been it its this that these those do did does done have has had where what when who which how why remember earlier set up there here from at by as into about can could would should will just make made please find out whether not no yes look looked'.split())
CJKR=re.compile(r'[㐀-鿿]')
SECRET=[re.compile(p) for p in (r'\bsk-[A-Za-z0-9_\-]{16,}',r'\bgh[pousr]_[A-Za-z0-9]{20,}',r'\bAKIA[0-9A-Z]{16}\b',r'-----BEGIN [A-Z ]*PRIVATE KEY-----',r'\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]*',r'(?i)((?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*)\S+',r'\b[A-Za-z0-9+/]{40,}={0,2}')]
def mask(t):
    for p in SECRET: t=p.sub(lambda m:(m.group(1) if m.groups() and m.group(1) else '')+'[masked]',t)
    return t
def terms(q):
    out=[]
    for w in re.findall(r'[㐀-鿿]+|[a-z0-9_\-\.]+',q.lower()):
        if CJKR.match(w): out+=[w[j]+' '+w[j+1] for j in range(len(w)-1)] or [w]
        elif w not in STOP and len(w)>1: out.append(w)
    return out
class Memory:
    def __init__(self,size=2000,meaning='cards'):
        self.db=sqlite3.connect(f'/tmp/wjs-probe/fts-plain-{size}.sqlite')
        self.meta=[json.loads(l) for l in open(f'/tmp/wjs-probe/{meaning}.jsonl')]
        D=np.fromfile(f'/tmp/wjs-probe/{meaning}.docs.f32',dtype=np.float32).reshape(len(self.meta),-1); self.D=D/np.linalg.norm(D,axis=1,keepdims=True)
        self.catalog={}
        for f in ('run_history_index.json','team_run_history_index.json','agent_org_run_history_index.json'):
            d=json.load(open(os.path.join(ROOT,f))); rows=d if isinstance(d,list) else d.get('rows',[])
            for r in rows:
                rid=r.get('runId') or r.get('teamRunId') or r.get('orgRunId'); self.catalog[rid]=r
    def who(self,run):
        p=run.split('/'); rid=p[-1]; meta={}
        try: meta=json.load(open(os.path.join(ROOT,run,'run_metadata.json')))
        except Exception: pass
        name=re.sub(r'_[0-9a-f]{8,}$','',rid).replace('_',' ')
        out={'agent':(self.catalog.get(rid,{}).get('agentName') or name),'runId':rid}
        if p[0]=='agent_teams': out['team']=re.sub(r'_[0-9a-f]{8,}$','',p[1]).replace('_',' '); out['teamRunId']=p[1]
        if p[0]=='agent_orgs': out['org']=re.sub(r'_[0-9a-f]{8,}$','',p[1]).replace('_',' ')
        w=meta.get('workspaceRootPath') or self.catalog.get(p[1] if len(p)>2 else rid,{}).get('workspaceRootPath')
        if w: out['workspace']=w
        return out
    def search(self,query,qvec,since=None,until=None,limit=5):
        m=' OR '.join('"%s"'%w for w in terms(query)) or '""'
        rows=self.db.execute('select run,file,ls,le,day,body,bm25(c) from c where c match ? order by bm25(c) limit 4000',(m,)).fetchall()
        def ok(day): return (not since or (day or '')>=since) and (not until or (day or '')<=until)
        text={}
        for run,f,ls,le,day,body,s in rows:
            if run.split('/')[-1].startswith('memory_compactor') or not ok(day): continue
            text.setdefault(run,[]).append({'journalFile':os.path.join(ROOT,run,'work_journal',f),'lines':f'{ls}-{le}','day':day,'snippet':body,'matchedBy':'text'})
        sims=self.D@qvec; mean={}
        for j in np.argsort(-sims)[:3000]:
            mm=self.meta[j]; run=mm['run']
            if run.split('/')[-1].startswith('memory_compactor'): continue
            mean.setdefault(run,[]).append(mm)
        order=[];seen=set()
        tl=list(text); ml=list(mean)
        for a,b in zip(tl+[None]*400,ml+[None]*400):
            for r in (a,b):
                if r and r not in seen: seen.add(r); order.append(r)
            if len(order)>=limit: break
        results=[]
        for run in order[:limit]:
            item=self.who(run); matches=[]
            for t in text.get(run,[])[:2]:
                sn=[l for l in t['snippet'].replace(' 　','').split('\n') if l.strip()][:3]
                matches.append({**{k:t[k] for k in ('journalFile','lines','day','matchedBy')},'snippet':mask(re.sub(r' ([㐀-鿿]) ',r'\1','\n'.join(x[:200] for x in sn)))})
            if not matches:
                for mm in mean.get(run,[])[:1]:
                    jf=os.path.join(ROOT,run,'work_journal',mm['file']); matches.append({'journalFile':jf,'lines':'1-60','matchedBy':'meaning','snippet':mask('\n'.join(mm['text'].split('\n')[:3])[:400])})
            days=sorted(t['day'] for t in text.get(run,[]) if t.get('day'))
            if days: item['firstMention']=days[0]; item['latestMention']=days[-1]
            m0=matches[0] if matches else {}
            item['source']=f"{item.get('team','')+' / ' if item.get('team') else ''}{item['agent']} · run {item['runId']} · {m0.get('day') or item.get('latestMention','')} · {os.path.basename(m0.get('journalFile',''))}:{m0.get('lines','')}"
            item['matches']=matches; results.append(item)
        return {'results':results,'meaningSearch':'ready','note':'Pointers to past work, not facts: open journalFile at the given lines with read_file to read what happened; cite run and date.'}
