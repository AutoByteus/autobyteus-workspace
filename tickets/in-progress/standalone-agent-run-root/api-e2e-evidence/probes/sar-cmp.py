import json,sys,re
def load(p):
    d=json.load(open(p)); out={}
    for f in d["testResults"]:
        fn=re.sub(r"^.*?/(autobyteus-(?:web|server-ts))/", r"\1/", f["name"])
        for a in f["assertionResults"]:
            if a["status"]=="failed":
                msg=(a.get("failureMessages") or [""])[0].split("\n")[0]
                msg=re.sub(r"/Users/\S+?standalone-agent-run-root(-cleanbase)?/","<WT>/",msg)
                msg=re.sub(r"\d+(\.\d+)?ms","<ms>",msg)
                out[fn+" :: "+a["fullName"]]=msg[:300]
    tot=(d["numTotalTests"],d["numPassedTests"],d["numFailedTests"])
    return out,tot
b,bt=load(sys.argv[1]); base,baset=load(sys.argv[2])
print("branch total/pass/fail",bt,"base",baset)
new=sorted(set(b)-set(base)); fixed=sorted(set(base)-set(b))
changed=[k for k in set(b)&set(base) if b[k]!=base[k]]
print("NEW failures:",len(new)); [print("  +",k,"|",b[k][:200]) for k in new]
print("No longer failing:",len(fixed)); [print("  -",k[:220]) for k in fixed]
print("Changed message:",len(changed)); [print("  ~",k[:200],"\n     branch:",b[k][:200],"\n     base:  ",base[k][:200]) for k in changed]
