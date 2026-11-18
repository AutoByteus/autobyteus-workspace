import glob,json,os,re,sys
sys.path.insert(0,'/tmp/wjs-probe'); from skeleton import HEAD
ROOT='/tmp/wjs-copy/memory'; MAX=2400
out=open('/tmp/wjs-probe/cards.jsonl','w'); n=0
for f in sorted(glob.glob(ROOT+'/**/work_journal/work_journal_*.md',recursive=True)):
    rel=os.path.relpath(f,ROOT); run=rel.split('/work_journal/')[0]; agent=run.split('/')[-1].rsplit('_',1)[0].replace('_',' ')
    users=[];agents=[];acts=[];cur=None;buf=[]
    def flush():
        global buf
        if cur and buf:
            t=re.sub(r'\s+',' ',' '.join(buf)).strip()
            (users if cur=='User' or cur.startswith('Message') else agents).append(t)
        buf=[]
    for line in open(f,errors='replace'):
        m=HEAD.match(line)
        if m:
            flush(); k=m.group(1); body=line[m.end():].strip(' :→\n')
            if k=='User' or k=='Agent' or k.startswith('Message from'): cur=k; buf=[body]
            else:
                cur=None; a=re.sub(r'\s+',' ',(k+' '+body))[:90]
                if a not in acts: acts.append(a)
        elif cur: buf.append(line.strip())
    flush()
    parts=[f'Agent: {agent}.']
    parts+= ['Request: '+u[:400] for u in users[:6]]
    parts+= ['Reply: '+a[:220] for a in agents[:8]]
    parts+= ['Did: '+'; '.join(acts[:25])]
    card='\n'.join(parts)[:MAX]
    out.write(json.dumps({'run':run,'file':os.path.basename(f),'text':card})+'\n'); n+=1
print('cards',n)
