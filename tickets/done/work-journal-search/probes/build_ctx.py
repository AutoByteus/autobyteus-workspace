# Text index with a deterministic context header per chunk: agent, workspace, day, the user request in force.
import glob,json,os,re,sqlite3,time
ROOT='/tmp/wjs-copy/memory'; DB='/tmp/wjs-probe/fts-ctx.sqlite'; MAXC=2000
CJK=re.compile(r'([\u3400-\u9fff\uf900-\ufaff])'); cjk=lambda t: CJK.sub(r' \1 ',t)
ENTRY=re.compile(r'^\[\d\d:\d\d:\d\d\] '); DAY=re.compile(r'^\[(\d{4}-\d\d-\d\d)\]\s*$'); USER=re.compile(r'^\[\d\d:\d\d:\d\d\] (User|Message from [^:]*):\s*(.*)')
ws={}
for f in ('run_history_index.json','team_run_history_index.json','agent_org_run_history_index.json'):
    d=json.load(open(os.path.join(ROOT,f))); rows=d if isinstance(d,list) else d.get('rows',[])
    for r in rows:
        rid=r.get('runId') or r.get('teamRunId') or r.get('orgRunId')
        if rid and r.get('workspaceRootPath'): ws[rid]=os.path.basename(r['workspaceRootPath'].rstrip('/'))
def workspace(run):
    parts=run.split('/')
    try: w=json.load(open(os.path.join(ROOT,run,'run_metadata.json'))).get('workspaceRootPath')
    except Exception: w=None
    if w: return os.path.basename(w.rstrip('/'))
    return ws.get(parts[1],'')
def agent(run): return re.sub(r'_[0-9a-f]{8,}$','',run.split('/')[-1]).replace('_',' ')
def entries(text):
    cur=[];start=1;day='';req=''
    for i,line in enumerate(text.splitlines(keepends=True),1):
        m=DAY.match(line)
        if m: day=m.group(1)
        if ENTRY.match(line) and cur: yield start,''.join(cur),day,req; cur=[]; start=i
        u=USER.match(line)
        if u: req=re.sub(r'\s+',' ',u.group(2))[:200]
        cur.append(line)
    if cur: yield start,''.join(cur),day,req
if os.path.exists(DB): os.remove(DB)
db=sqlite3.connect(DB); db.execute("create virtual table c using fts5(body, run unindexed, file unindexed, line unindexed, day unindexed, tokenize='unicode61')")
t=time.time(); n=0
for f in sorted(glob.glob(ROOT+'/**/work_journal/work_journal_*.md',recursive=True)):
    run=os.path.relpath(f,ROOT).split('/work_journal/')[0]; text=open(f,errors='replace').read()
    head0=f"Agent: {agent(run)} · Workspace: {workspace(run)}"
    first=re.search(r'\[(\d{4}-\d\d-\d\d)',text); fday=first.group(1) if first else ''
    buf='';meta=None;rows=[]
    def flush():
        if buf: s,d,r=meta; rows.append((cjk(f"{head0} · Day: {d or fday}\nRequest: {r}\n{buf}"),run,os.path.basename(f),s,d or fday))
    for s,e,d,r in entries(text):
        while len(e)>MAXC:
            if buf: flush(); buf=''
            meta=(s,d,r); buf=e[:MAXC]; flush(); buf=''; e=e[MAXC:]
        if len(buf)+len(e)>MAXC and buf: flush(); buf=''
        if not buf: meta=(s,d,r)
        buf+=e
    flush()
    db.executemany('insert into c values (?,?,?,?,?)',rows); n+=len(rows)
db.commit(); print(json.dumps({'chunks':n,'build_s':round(time.time()-t,1)}))
