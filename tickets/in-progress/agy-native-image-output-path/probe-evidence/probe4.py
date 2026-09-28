import subprocess, json, time, os, re
home=os.path.expanduser("~/.gemini/antigravity-cli/brain")
p=subprocess.Popen(["agy","--conversation","5b1ab95d-b2a6-4fd9-a00c-602ceb0060a1","--add-dir","/tmp/agy-img-probe","--model","gemini-3.8-flash-high","--input-format","stream-json","--output-format","stream-json","--dangerously-skip-permissions"],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,cwd="/tmp/agy-img-probe")
prompts=["Generate one image of a yellow duck with generate_image (ImageName yellow_duck). Reply in one short sentence."]
conv=None; out=open("probe4.ndjson","w"); results=[]
def send(t): p.stdin.write(json.dumps({"event":"user","message":{"content":t}})+"\n"); p.stdin.flush()
turn=0
for line in p.stdout:
    d=json.loads(line); out.write(line)
    if d["event"]=="init":
        conv=d["conversation_id"]; send(prompts[0]); continue
    su=d.get("step_update") or {}
    if su.get("tool_name")=="generate_image" and su.get("state") in("DONE","ERROR"):
        f=f"{home}/{conv}/.system_generated/steps/{su['step_index']}/output.txt"
        ex=os.path.exists(f); txt=open(f).read() if ex else ""
        m=re.search(r"Generated image is saved at (\S+?)\.?\s*$",txt,re.M)
        path=m.group(1).rstrip('.') if m else None
        r=dict(turn=turn,step=su["step_index"],state=su["state"],image=su["tool_info"]["parameters"].get("ImageName"),output_txt=ex,path=path,file_exists=bool(path and os.path.isfile(path)),name_match=bool(path and su["tool_info"]["parameters"].get("ImageName","") in path))
        results.append(r); print(r,flush=True)
    if d["event"]=="result":
        print("turn",turn,"result",d["result"]["status"],flush=True); turn+=1
        if turn<len(prompts): send(prompts[turn])
        else: p.stdin.close(); break
p.terminate(); print("conv",conv)
