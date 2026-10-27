# Baseline: the same local agent WITHOUT search_memory: a read-only shell (rg/grep/find/ls/head/tail/sed/wc/sort/uniq/cut/cat) + read_file over the copy.
import json,os,re,shlex,subprocess,sys,time
sys.path.insert(0,'/tmp/wjs-probe'); import e2e_agent as E
ROOT='/tmp/wjs-copy/memory'
ALLOWED={'rg','grep','find','ls','head','tail','sed','wc','sort','uniq','cut','cat','awk','xargs'}
SHELL={"type":"function","function":{"name":"run_bash","description":"Run a read-only shell command in the memory folder (cwd). Allowed programs: rg, grep, find, ls, head, tail, sed, wc, sort, uniq, cut, cat, awk, xargs; pipes (|) allowed; no redirection, no ;, no &&. Output is cut at 8,000 characters; timeout 120 s.","parameters":{"type":"object","properties":{"command":{"type":"string"}},"required":["command"]}}}
E.TOOLS=[SHELL,E.TOOLS[1]]
E.SYS=("You are a helpful assistant working for the user. Today is 2026-10-22. You have no memory of earlier sessions, but the Work Journals of all past agent runs are Markdown files under "+ROOT+": agents/<runId>/work_journal/work_journal_*.md, agent_teams/<teamRunId>/<memberRunId>/work_journal/..., agent_orgs/<orgRunId>/.../work_journal/... "
       "Each journal entry starts with a [HH:MM:SS] time; a [YYYY-MM-DD] line marks a new day. Find the past work with run_bash (for example rg) and read journals with read_file. Answer from what you read and say which run and day it comes from. If unsure, say so.")
def run_bash(cmd):
    if re.search(r'[;&><`]|\$\(',cmd): return 'Error: not allowed (no ; & > < ` $()).'
    for part in cmd.split('|'):
        try: w=shlex.split(part.strip() or 'x')
        except ValueError as e: return f'Error: could not parse the command ({e}).'
        if not w or w[0] not in ALLOWED: return f'Error: program not allowed: {w[0] if w else ""}'
    t=time.time()
    try: p=subprocess.run(cmd,shell=True,cwd=ROOT,capture_output=True,text=True,timeout=120)
    except subprocess.TimeoutExpired: return 'Error: timeout after 120 s'
    out=(p.stdout or '')+(p.stderr or ''); el=time.time()-t
    return (out[:8000]+(f'\n…[{len(out)-8000} more characters cut]' if len(out)>8000 else '')+f'\n[took {el:.1f} s]')
def run(question,max_steps=12):
    msgs=[{"role":"system","content":E.SYS},{"role":"user","content":question}]; trace=[]
    for step in range(max_steps):
        r=E.chat(msgs); m=r['choices'][0]['message']; msgs.append({k:v for k,v in m.items() if k in('role','content','tool_calls')})
        calls=m.get('tool_calls') or []
        if not calls: return m.get('content') or '',trace
        for c in calls:
            a=json.loads(c['function'].get('arguments') or '{}'); n=c['function']['name']
            if n=='run_bash':
                t=time.time(); content=run_bash(a.get('command','')); trace.append({'tool':n,'args':{'command':a.get('command','')[:200]},'s':round(time.time()-t,1),'out':content})
            else:
                content=E.read_file(a.get('path',''),a.get('start_line'),a.get('end_line')); trace.append({'tool':'read_file','args':{'path':a.get('path','').replace(ROOT+'/',''),'start_line':a.get('start_line'),'end_line':a.get('end_line')}})
            msgs.append({"role":"tool","tool_call_id":c['id'],"content":content})
    return '(no final answer within step limit)',trace
if __name__=='__main__':
    Q=json.load(open(os.environ['QFILE'])); done=set(json.loads(l)['id'] for l in open(os.environ['OUT'])) if os.path.exists(os.environ['OUT']) else set(); out=open(os.environ['OUT'],'a')
    Q=[x for x in Q if x['id'] not in done]
    for x in Q:
        t=time.time(); ans,trace=run(x['q']); acc=x['accept']
        seen=next((k+1 for k,s in enumerate(trace) if s['tool']=='run_bash' and any(a in s['out'] for a in acc)),None)
        opened=next((k+1 for k,s in enumerate(trace) if s['tool']=='read_file' and any(a in (s['args']['path'] or '') for a in acc)),None)
        cited=any(a[:20] in ans for a in acc)
        for s in trace: s.pop('out',None)
        out.write(json.dumps({'id':x['id'],'right_run_in_shell_output_at_step':seen,'opened_right_at_step':opened,'cited':cited,'steps':len(trace),'s':round(time.time()-t),'shell_seconds':round(sum(s.get('s',0) for s in trace),1),'trace':trace,'answer':ans},ensure_ascii=False)+'\n'); out.flush()
        print(x['id'],'seen',seen,'opened',opened,'cited',cited,'steps',len(trace),'s',round(time.time()-t),flush=True)
