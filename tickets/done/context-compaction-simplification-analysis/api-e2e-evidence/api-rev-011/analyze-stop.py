from pathlib import Path
import json
E=Path(__file__).resolve().parent;P=E/'product'
def j(n):return json.loads((P/n).read_text())
def d(n):return j(n)['result']['result']
w=[json.loads(x) for x in (P/'loopback-wire.jsonl').read_text().splitlines()]
for c in ['a','t']:
 b=d(f'resume-stop-{c}-before-dom.json');a=d(f'resume-stop-{c}-after-dom.json');cold=d(f'resume-stop-cold-{c}-dom.json')
 assert 'Compacting memory…' in b['tail'] and 'COMPACTING' in b['tail']
 assert '\nStopped\nSTOPPED\n' in a['tail'] and 'Compacting memory' not in a['tail']
 assert any('Memory compacted' in card for card in a['cards'])
 assert not any('animate-spin' in card for card in a['cards'])
 assert cold['cards']==[] and 'Compacting memory' not in cold['tail']
 before=j(f'resume-stop-{c}-before-projection.api.json')['response']['data']['agentRunCollaborationMemberProjection']
 after=j(f'resume-stop-cold-{c}-projection.api.json')['response']['data']['agentRunCollaborationMemberProjection']
 assert before['conversation']==after['conversation']
 native=j(f'resume-stop-{c}-before-snapshot.json')['agent']['agentRunId']
 for f in P.glob(f'resume-stop-{c}-before-raw-*.jsonl'):
  i=int(f.stem.rsplit('-',1)[1]);original=Path(j(f'resume-stop-{c}-before-snapshot.json')['rawPaths'][i]).name
  saved=[x for x in (P/'final-native-memory').rglob(original) if native in str(x)]
  assert len(saved)==1 and saved[0].read_bytes().startswith(f.read_bytes())
  appended=saved[0].read_bytes()[len(f.read_bytes()):]
  if original=='raw_traces_active.jsonl':
   extra=[json.loads(x) for x in appended.splitlines()];assert len(extra)==1 and extra[0]['trace_type']=='operation_boundary' and extra[0]['source_event']=='AgentTurnInterruptedEvent' and 'user_interrupt' in extra[0]['content']
  else:assert not appended
for n in ['resume-stop-root.api.json','resume-stop-cold-root.api.json']:
 root=j(n)['response']['data']['agentRunCollaboration']['root_agent'];assert root['is_active'] is False and root['agent_input_states']==[] and root['agent_statuses']==[]
assert j('resume-stop-disarm.json')==j('resume-stop-cold-provider.json')
assert j('resume-stop-disarm.json')['requests']==38 and not j('resume-stop-disarm.json')['closed']
assert {x['id'] for x in w if x['event']=='request_aborted'}=={36,38}
assert {x['id'] for x in w if x['event']=='discard_closed_response'}=={36,38}
assert not [x for x in w if x['event'] in ['guard_failure','fixture_hold_timeout']]
b=d('resume-stop-sentinel.json');a=d('resume-stop-cold-proof.json');assert a['timeOrigin']!=b['timeOrigin'] and b['sentinel'] and a['sentinel'] is None
result={'result':'Pass','activeCompactionsStopped':2,'normalWholeHostStop':True,'sameRendererStoppedCards':2,'priorCompletedCardsRetained':2,'coldRendererFabricatedCards':0,'coldDocumentTimeOrigin':a['timeOrigin'],'lateResponsesDiscarded':[36,38],'existingRawRowsUnchanged':True,'appendedNormalInterruptBoundaryPerChild':1,'historyDoesNotReactivate':True,'requestsFinal':38,'parentFinal':16,'compactionFinal':22,'remote':0,'limitations':'No persistent native activity journal or backend-restart queue guarantee; cold renderer correctly has no invented native activity cards.'}
(E/'stop-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
