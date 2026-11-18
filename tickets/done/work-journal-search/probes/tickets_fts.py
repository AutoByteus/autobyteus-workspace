import glob,os,re,sqlite3,time,json
W='/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search'
docs=[]
for name in ('requirements-doc.md','design-spec.md','investigation-notes.md','release-notes.md','follow-ups.md','solution-revision-record.md'):
    docs+=glob.glob(f'{W}/tickets/done/*/{name}')
docs+=glob.glob('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-results/*/report.md')
CJK=re.compile(r'([㐀-鿿])'); cjk=lambda t: CJK.sub(r' \1 ',t)
db=sqlite3.connect(':memory:'); db.execute("create virtual table s using fts5(body, doc unindexed, heading unindexed)")
n=0;t=time.time();tot=0
for d in docs:
    text=open(d,errors='replace').read(); tot+=len(text)
    secs=re.split(r'(?m)^(?=#{1,4} )',text)
    for sec in secs:
        head=sec.split('\n',1)[0][:80]
        for i in range(0,len(sec),3000): db.execute('insert into s values (?,?,?)',(cjk(sec[i:i+3000]),d.replace(W+'/','').replace('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/',''),head)); n+=1
print(json.dumps({'docs':len(docs),'MB':round(tot/1e6,1),'sections':n,'build_s':round(time.time()-t,1)}))
STOP=set('a an the and or of to in on for with we our my me you your i is are was were be been it its this that why did not do does in our application'.split())
def q(text):
    ts=[w for w in re.findall(r'[a-z0-9\-]+',text.lower()) if w not in STOP and len(w)>1]
    m=' OR '.join('"%s"'%w for w in ts)
    rows=db.execute('select doc,heading,bm25(s) b from s where s match ? order by b limit 300',(m,)).fetchall()
    seen={};
    for d,h,b in rows:
        k=d.split('/')[2] if d.startswith('tickets') else d
        if k not in seen: seen[k]=(h,round(b,1))
    return list(seen.items())
for question in ["Why did we not integrate login/sign-in in our application for Claude and Antigravity?",
                 "why is there no Claude sign-in button","provider subscription terms for using Claude and Codex accounts"]:
    r=q(question); print('Q:',question)
    for k,(h,b) in r[:5]: print('   ',k[:60],'|',h[:50],'|',b)
