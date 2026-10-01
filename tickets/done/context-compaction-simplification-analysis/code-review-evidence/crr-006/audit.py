import pathlib,json,hashlib,subprocess,re
r=pathlib.Path.cwd();t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'code-review-evidence/crr-006';a=t/'api-e2e-evidence/api-rev-003'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
entry={p:sha(r/p) for p in subprocess.check_output(['git','ls-files','-m','-o','--exclude-standard'],text=True).splitlines() if (r/p).is_file() and '/dist/' not in p and '/crr-006/' not in p}
(e/'entry-hashes.json').write_text(json.dumps(entry,indent=2)+'\n')
wire=[json.loads(l) for l in (a/'deepseek/wire.jsonl').read_text().splitlines()];sem=json.loads((a/'deepseek/semantic-evidence.json').read_text()); summaries=[x for x in sem if x['event'] in ['semantic_first','semantic_repeated']];requests=[x for x in wire if x['event']=='wire_request'];responses=[x for x in wire if x['event']=='wire_response']
logs=[]
for line in (a/'deepseek/quality.log').read_text().splitlines():
 try:
  x=json.loads(line)
  if x.get('event','').startswith('semantic_'):logs.append(x)
 except (ValueError,AttributeError):pass
expected='2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7'
checks=[]
for n,(q,p,s) in enumerate(zip(requests,responses,summaries),1):
 body=q['body'];content=p['choices'][0]['content'];match=re.search(r'<compaction_summary>\s*([\s\S]*?)\s*</compaction_summary>',content)
 checks.append({'sequence':n,'requestModel':body['model'],'responseModel':p['model'],'temperature':body.get('temperature'),'outputCap':body.get('max_completion_tokens',body.get('max_tokens')),'promptHashMatches':hashlib.sha256(body['messages'][0]['content'].encode()).hexdigest()==expected,'responseBodyEqualsReportedSummary':bool(match and match.group(1).strip()==s['summary']),'stopReason':p['choices'][0]['finish_reason'],'usageEqualsReported':p['usage']==s['execution']['usage']['raw_usage_json'],'summarySha256':hashlib.sha256(s['summary'].encode()).hexdigest()})
apiAudit=json.loads((a/'final-audit.json').read_text());durable=[dict(x,currentSha256=sha(r/x['path']),matches=sha(r/x['path'])==x['sha256']) for x in apiAudit['durablePaths']]
inv=json.loads((t/'implementation-evidence/ir-003/source-inventory.json').read_text())['paths'];mismatches=[x['path'] for x in inv if (sha(r/x['path']) if (r/x['path']).is_file() else None)!=x.get('sha256')]
prior=json.loads((t/'code-review-evidence/crr-005/input-audit.json').read_text())['references'];authority={p.name:{'sha256':sha(p),'unchangedSinceCRR005':sha(p)==prior[str(p)]} for p in [t/'requirements-doc.md',t/'design-spec.md',t/'proposed-compaction-prompt.md',t/'output-format-and-coverage.md']}
result={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'productionDiff':subprocess.check_output(['git','diff','--name-only','HEAD','--','autobyteus-ts/src','autobyteus-server-ts/src','autobyteus-web','autobyteus-agent-presentation-contracts/src'],text=True).splitlines(),'IR003InventoryCount':len(inv),'sourceMismatches':mismatches,'authority':authority,'durablePaths':durable,'wireRequestCount':len(requests),'wireResponseCount':len(responses),'finished':wire[-1],'wireChecks':checks,'semanticLogMatchesReport':logs==sem,'repeatedRequestIncludesActualFirstSummary':summaries[0]['summary'] in requests[1]['body']['messages'][1]['content'],'repeatedRequestIncludesExactCorrection':summaries[1]['correction'] in requests[1]['body']['messages'][1]['content'],'distinctInvocations':len({s['execution']['invocationId'] for s in summaries})==2,'originalQwenEvidenceSha256':sha(t/'api-e2e-evidence/api-rev-002/semantic-final-observations.json'),'F004TriageSha256':sha(t/'api-e2e-evidence/api-rev-002/API-F004-triage.json'),'scope':'Offline identity and evidence consistency only; manual semantic judgment in report; no provider, private vault or broad suite.'}
(e/'origin-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['productionDiff','sourceMismatches','wireRequestCount','wireResponseCount','wireChecks','semanticLogMatchesReport','repeatedRequestIncludesActualFirstSummary','repeatedRequestIncludesExactCorrection','distinctInvocations']},indent=2))
assert not mismatches and not result['productionDiff'] and all(x['matches'] for x in durable)
assert len(requests)==len(responses)==2 and all(x['promptHashMatches'] and x['responseBodyEqualsReportedSummary'] and x['usageEqualsReported'] for x in checks)
assert logs==sem and result['repeatedRequestIncludesActualFirstSummary'] and result['repeatedRequestIncludesExactCorrection']
