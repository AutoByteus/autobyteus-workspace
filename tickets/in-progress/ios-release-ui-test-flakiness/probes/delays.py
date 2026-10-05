import json,subprocess,re,glob,os,datetime as dt
R="AutoByteus/autobyteus-workspace"
def gh(path):
    return json.loads(subprocess.run(["gh","api",path],capture_output=True,text=True).stdout or "{}")
arts={}
for f in glob.glob("small/*.log"):
    if f.endswith(".xcodebuild-test.log"): continue
    head=open(f).readline(); m=re.search(r"run=(\d+) artifact=(\d+) created=(\S+)",head)
    arts.setdefault(m.group(1),[]).append((m.group(3),f))
out=[]
for run,lst in arts.items():
    jobs=[]
    for att in (1,2,3):
        d=gh(f"repos/{R}/actions/runs/{run}/attempts/{att}/jobs")
        for j in d.get("jobs",[]):
            if j["name"]=="Build And Test iOS App": jobs.append((att,j["id"],j["started_at"],j["completed_at"],j["conclusion"]))
    for created,f in lst:
        cand=[j for j in jobs if j[2] and j[2]<=created and (not j[3] or created<=j[3])]
        if not cand: continue
        att,jid,started,comp,concl=cand[0]
        lf=f"log-{jid}.txt"
        if not os.path.exists(lf):
            subprocess.run(f"gh api repos/{R}/actions/jobs/{jid}/logs > {lf}",shell=True)
        s=open(lf,encoding="utf-8",errors="replace").read()
        taps=re.findall(r"^﻿?(\S+)Z\s+t = +[0-9.]+s Tap \"connection\.connect\" Button",s,re.M)
        srv=[l for l in open(f) if "GET /rest/remote-access/status" in l]
        mob=[l for l in open(f) if "GET /mobile" in l]
        broken=open(f).read().count("BrokenPipe")
        def st(l):
            m=re.search(r"\[(\d+)/(\w+)/(\d+) (\d+:\d+:\d+)\]",l); return dt.datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)} {m.group(4)}","%d %b %Y %H:%M:%S")
        delay=None
        if taps and srv:
            t0=dt.datetime.fromisoformat(taps[0][:19]); delay=(st(srv[0])-t0).total_seconds()
        out.append((created[:16],run,att,concl,delay,len(srv),len(mob),broken))
for r in sorted(out): print(r)
