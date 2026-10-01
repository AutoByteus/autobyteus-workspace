import json,sys,urllib.request,datetime
from pathlib import Path
p=Path(__file__).resolve().parent
launch=json.loads((p.parent/'isolated-build-start.json').read_text())['result']
def gql(name,query,variables=None):
 payload={'query':query,'variables':variables or {}}
 req=urllib.request.Request(launch['graphqlUrl'],data=json.dumps(payload).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(req,timeout=25) as r: result=json.load(r)
 with (p/(name+'.api.json')).open('x') as f: json.dump({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'endpoint':launch['graphqlUrl'],'request':payload,'response':result},f,indent=2)
 if result.get('errors'): raise RuntimeError(result)
 return result['data']
if __name__=='__main__':print(json.dumps(gql(*sys.argv[1:3],json.loads(sys.argv[3]) if len(sys.argv)>3 else None),indent=2))
