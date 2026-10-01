from pathlib import Path
import urllib.request,json,datetime
p=Path(__file__).resolve().parent
launch=json.loads((p/'start-2.json').read_text())['result']
def gql(name,query,variables=None):
 req={'query':query,'variables':variables or {}}
 result=json.loads(urllib.request.urlopen(urllib.request.Request(launch['graphqlUrl'],data=json.dumps(req).encode(),headers={'Content-Type':'application/json'})).read())
 with (p/(name+'.api.json')).open('x') as f: json.dump({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'endpoint':launch['graphqlUrl'],'request':req,'response':result},f,indent=2)
 if 'errors' in result: raise RuntimeError(result)
 return result['data']
if __name__=='__main__':
 provider=json.loads((p/'loopback-state.json').read_text())
 print(gql('set-loopback','mutation($v:String!){updateServerSetting(key:"LMSTUDIO_HOSTS",value:$v)}',{'v':provider['url']}))
 for suffix in ['Reviewer','Lead','Peer']:
  print(gql('create-'+suffix,'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}',{'input':{'name':'SD036 '+suffix,'description':'Solution Designer isolated diagnostic only','instructions':'SD036 synthetic diagnostic. Acknowledge only. No external work.','toolNames':['read_file'],'defaultLaunchConfig':{'runtimeKind':'autobyteus','llmModelIdentifier':provider['model']+':lmstudio@127.0.0.1:'+str(provider['port'])}}}))
 urllib.request.urlopen(urllib.request.Request(provider['url']+'/control',data=b'{"mode":"fail"}',headers={'Content-Type':'application/json'})).read()
