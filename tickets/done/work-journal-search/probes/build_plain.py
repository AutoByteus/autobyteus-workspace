# Plain entry-aligned chunks (no header, no summary). Fields: run, file, line_start, line_end, day.
import glob,json,os,re,sqlite3,sys,time
ROOT='/tmp/wjs-copy/memory'; MAXC=int(sys.argv[1]); DB=f'/tmp/wjs-probe/fts-plain-{MAXC}.sqlite'
CJK=re.compile(r'([\u3400-\u9fff\uf900-\ufaff])'); cjk=lambda t: CJK.sub(r' \1 ',t)
ENTRY=re.compile(r'^\[\d\d:\d\d:\d\d\] '); DAY=re.compile(r'^\[(\d{4}-\d\d-\d\d)\]\s*$')
def entries(lines):
    start=0;day=''
    for i,l in enumerate(lines):
        m=DAY.match(l)
        if m: day=m.group(1)
        if ENTRY.match(l) and i>start: yield start,i,day; start=i
    if start<len(lines): yield start,len(lines),day
if os.path.exists(DB): os.remove(DB)
db=sqlite3.connect(DB); db.execute("create virtual table c using fts5(body, run unindexed, file unindexed, ls unindexed, le unindexed, day unindexed, tokenize='unicode61')")
t=time.time(); n=0; spans=[]
for f in sorted(glob.glob(ROOT+'/**/work_journal/work_journal_*.md',recursive=True)):
    run=os.path.relpath(f,ROOT).split('/work_journal/')[0]; lines=open(f,errors='replace').read().splitlines(keepends=True)
    fday=(re.search(r'\[(\d{4}-\d\d-\d\d)','' .join(lines[:12])) or [None,''])[1]
    rows=[]; cs=None; size=0; cday=''
    def flush(a,b,d):
        rows.append((cjk(''.join(lines[a:b])),run,os.path.basename(f),a+1,b,d or fday)); spans.append(b-a)
    for a,b,d in entries(lines):
        el=sum(len(x) for x in lines[a:b])
        if el>MAXC:                       # one long entry: its own chunk(s), split by lines
            if cs is not None: flush(cs,a,cday); cs=None; size=0
            s=a;acc=0
            for k in range(a,b):
                acc+=len(lines[k])
                if acc>MAXC and k>s: flush(s,k,d); s=k; acc=len(lines[k])
            flush(s,b,d); continue
        if cs is not None and size+el>MAXC: flush(cs,a,cday); cs=None; size=0
        if cs is None: cs=a; cday=d
        size+=el
    if cs is not None: flush(cs,len(lines),cday)
    db.executemany('insert into c values (?,?,?,?,?,?)',rows); n+=len(rows)
db.commit(); spans.sort()
print(json.dumps({'maxc':MAXC,'chunks':n,'build_s':round(time.time()-t,1),'lines_per_chunk_median':spans[len(spans)//2],'p90':spans[int(.9*len(spans))],'db_MB':round(os.path.getsize(DB)/1e6)}))
