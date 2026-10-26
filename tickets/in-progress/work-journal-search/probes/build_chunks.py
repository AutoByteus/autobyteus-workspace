# Chunk every journal in the isolated copy; build an FTS5 index (full text) and a skeleton chunk file for embedding.
import glob,json,os,re,sqlite3,sys,time
sys.path.insert(0,'/tmp/wjs-probe'); from skeleton import HEAD
ROOT='/tmp/wjs-copy/memory'; DB='/tmp/wjs-probe/fts.sqlite'; MAXC=2000; SKMAX=1200
CJK=re.compile(r'([\u3400-\u9fff\uf900-\ufaff])')
cjk=lambda t: CJK.sub(r' \1 ',t)
ENTRY=re.compile(r'^\[\d\d:\d\d:\d\d\] ')
def entries(text):
    cur=[]; start=1
    for i,line in enumerate(text.splitlines(keepends=True),1):
        if ENTRY.match(line) and cur: yield start,''.join(cur); cur=[]; start=i
        cur.append(line)
    if cur: yield start,''.join(cur)
def chunk(text,maxc):
    buf='';bstart=None
    for start,e in entries(text):
        while len(e)>maxc:
            if buf: yield bstart,buf; buf=''
            yield start,e[:maxc]; e=e[maxc:]
        if len(buf)+len(e)>maxc and buf: yield bstart,buf; buf=''
        if not buf: bstart=start
        buf+=e
    if buf: yield bstart,buf
def skeleton(e):
    out=[]; dialog=False
    for line in e.splitlines(keepends=True):
        m=HEAD.match(line)
        if m:
            k=m.group(1); dialog=k in('User','Agent') or k.startswith('Message from'); out.append(line[:300])
        elif dialog: out.append(line)
    return ''.join(out)
if os.path.exists(DB): os.remove(DB)
db=sqlite3.connect(DB); db.execute("create virtual table c using fts5(body, run unindexed, file unindexed, line unindexed, tokenize='unicode61')")
sk=open(os.devnull,'w')
t=time.time(); n=0; ns=0
for f in sorted(glob.glob(ROOT+'/**/work_journal/work_journal_*.md',recursive=True)):
    rel=os.path.relpath(f,ROOT); run=rel.split('/work_journal/')[0]; text=open(f,errors='replace').read()
    rows=[(cjk(b),run,os.path.basename(f),s) for s,b in chunk(text,MAXC)]
    db.executemany('insert into c values (?,?,?,?)',rows); n+=len(rows)
    sktext=''.join(f'@@{s}\n'+skeleton(e) for s,e in entries(text) if skeleton(e))
    for s,b in chunk(sktext.replace('@@','[00:00:00] @@'),SKMAX):
        m=re.search(r'@@(\d+)',b); body=re.sub(r'\[00:00:00\] @@\d+\n','',b).strip()
        if body: sk.write(json.dumps({'run':run,'file':os.path.basename(f),'line':int(m.group(1)) if m else s,'text':body})+'\n'); ns+=1
db.commit(); 
print(json.dumps({'fts_chunks':n,'skeleton_chunks':ns,'build_s':round(time.time()-t,1),'db_MB':round(os.path.getsize(DB)/1e6,1)}))
