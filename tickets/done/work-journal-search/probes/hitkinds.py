import json,os,sys,re,glob,collections
M=os.path.expanduser('~/.autobyteus/server-data/memory')
pat=re.compile(r'ddns|dynamic dns|domain updater|duckdns|dyndns',re.I)
mask=lambda s: re.sub(r'[A-Za-z0-9_\-]{20,}','<…>',s)
for d in sys.argv[1:]:
    kinds=collections.Counter(); tools=collections.Counter(); first=None; n=0
    for f in sorted(glob.glob(os.path.join(M,d,'raw_traces_*.jsonl'))):
        for line in open(f,errors='replace'):
            try: r=json.loads(line)
            except: continue
            n+=1; t=r.get('trace_type')
            if first is None and t=='user': first=mask(str(r.get('content',''))[:160]).replace('\n',' ')
            if pat.search(line):
                kinds[t]+=1
                if r.get('tool_name'): tools[r['tool_name']]+=1
    print(d.split('/')[-1][:40],'records',n,dict(kinds),dict(tools.most_common(5)))
    print('   first user msg (masked, 160 chars):',first)
