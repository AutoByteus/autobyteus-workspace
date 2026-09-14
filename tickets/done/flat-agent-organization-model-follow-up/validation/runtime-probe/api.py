import json, pathlib, urllib.request
HERE=pathlib.Path(__file__).resolve().parent
URL=json.loads((HERE/'server-info.json').read_text())['serverUrl']
def gql(query, variables=None):
    req=urllib.request.Request(URL+'/graphql',json.dumps({'query':query,'variables':variables or {}}).encode(),{'content-type':'application/json'})
    with urllib.request.urlopen(req,timeout=90) as r: result=json.load(r)
    if result.get('errors'): raise RuntimeError(json.dumps(result['errors']))
    return result['data']
if __name__=='__main__':
    import sys
    print(json.dumps(gql(sys.argv[1],json.loads(sys.argv[2]) if len(sys.argv)>2 else None),indent=2))
