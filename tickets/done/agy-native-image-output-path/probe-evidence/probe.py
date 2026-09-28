import subprocess, json, time, os, sys
home=os.path.expanduser("~/.gemini/antigravity-cli/brain")
p=subprocess.Popen(["agy","-p",sys.argv[1],"--model","gemini-3.8-flash-high","--output-format","stream-json","--dangerously-skip-permissions","--add-dir","/tmp/agy-img-probe"],stdout=subprocess.PIPE,text=True)
conv=None
out=open(sys.argv[2],"w")
for line in p.stdout:
    d=json.loads(line); t=time.time()
    if d["event"]=="init": conv=d["conversation_id"]
    su=d.get("step_update") or {}
    rec={"t":t,"raw":d}
    if su.get("step_type")=="tool":
        f=f"{home}/{conv}/.system_generated/steps/{su['step_index']}/output.txt"
        rec["output_txt_exists_at_event"]=os.path.exists(f)
        if os.path.exists(f): rec["output_txt"]=open(f).read()[:400]
        print(su["state"], su.get("tool_name"), "has_output_field=", "output" in (su.get("tool_info") or {}), "output_txt_exists=", rec["output_txt_exists_at_event"], flush=True)
        if "output" in (su.get("tool_info") or {}): print("  OUTPUT FIELD:", json.dumps(su["tool_info"]["output"])[:300])
    out.write(json.dumps(rec)+"\n")
p.wait(); print("conv", conv)
