# Dialogue chunks: User / Agent / teammate-message text of each journal file, in order, cut into pieces of at most MAXC chars at entry boundaries.
import glob,json,os,re,sys
ROOT='/tmp/wjs-copy/memory'; MAXC=int(sys.argv[1]); WITH_MSG=sys.argv[2]=='msg'
HEAD=re.compile(r'^\[\d\d:\d\d:\d\d\] (User|Agent|Message from[^:]*|Command|Write file|Edit file|Search web|Tool|Notice|Tool result[^:]*)')
out=open(f'/tmp/wjs-probe/dialogue-{MAXC}-{sys.argv[2]}.jsonl','w'); n=0; chars=0
for f in sorted(glob.glob(ROOT+'/**/work_journal/work_journal_*.md',recursive=True)):
    run=os.path.relpath(f,ROOT).split('/work_journal/')[0]
    if run.split('/')[-1].startswith('memory_compactor'): continue
    ents=[];cur=None;ln=0
    for i,line in enumerate(open(f,errors='replace'),1):
        m=HEAD.match(line)
        if m:
            k=m.group(1); keep=k in('User','Agent') or (WITH_MSG and k.startswith('Message from'))
            cur=[i,line] if keep else None
            if cur: ents.append(cur)
        elif cur is not None: cur[1]+=line
    buf='';start=None
    for i,t in ents:
        t=t[:MAXC]
        if buf and len(buf)+len(t)>MAXC:
            out.write(json.dumps({'run':run,'file':os.path.basename(f),'line':start,'text':buf})+'\n'); n+=1; chars+=len(buf); buf=''
        if not buf: start=i
        buf+=t
    if buf: out.write(json.dumps({'run':run,'file':os.path.basename(f),'line':start,'text':buf})+'\n'); n+=1; chars+=len(buf)
out.close(); print(json.dumps({'maxc':MAXC,'teammate_messages':WITH_MSG,'chunks':n,'MB':round(chars/1e6,1),'est_embed_hours_at_6KBps':round(chars/6000/3600,1)}))
