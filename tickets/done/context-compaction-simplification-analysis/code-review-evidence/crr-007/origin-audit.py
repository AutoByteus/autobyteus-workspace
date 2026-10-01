import collections, hashlib, json, pathlib, re, subprocess
R=pathlib.Path(__file__).resolve().parents[5]
T=R/'tickets/in-progress/context-compaction-simplification-analysis'
D=pathlib.Path(__file__).resolve().parent
A=T/'api-e2e-evidence/api-rev-004'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())
a=load(A/'managed_compaction_all_exit.json')
task=a['summaryRequests'][0]['messages'][1]['content']
def entries(s):
 m=list(re.finditer(r'(?:^|\n\n)(User|Assistant|Tool \([^\n]+\)):\n',s))
 return [(v[1],s[v.start():m[i+1].start() if i+1<len(m) else len(s)]) for i,v in enumerate(m)]
original=entries(task); modified=entries(task.replace('🛡️','shield'))
tools=[t for role,t in original if role.startswith('Tool (')]
modifiedTools=[t for role,t in modified if role.startswith('Tool (')]
glyphEntries=[role for role,t in original if '🛡️' in t]
unicodeTools=[t for t in tools if '<script setup>' in t and '</template>' in t]
# Historical unsupported predicate only, never an acceptance rule for the current harness.
old=lambda s:all(k in s for k in ['<script setup>','</template>','… [']) and '🛡️' not in s
origin={'glyphOccurrenceCount':task.count('🛡️'),'glyphRoles':glyphEntries,'toolBlocksIdenticalUnderAssistantOnlyChange':tools==modifiedTools,'unicodeToolCount':len(unicodeTools),'unicodeToolHasExcerptMarker':len(unicodeTools)==1 and '… [' in unicodeTools[0],'unicodeToolContainsGlyph':any('🛡️' in t for t in unicodeTools),'oldPredicateOriginal':old(task),'oldPredicateAssistantOnlyVariation':old(task.replace('🛡️','shield'))}
assert origin['glyphOccurrenceCount']==1 and glyphEntries==['Assistant'] and tools==modifiedTools and len(unicodeTools)==1
assert not origin['oldPredicateOriginal'] and origin['oldPredicateAssistantOnlyVariation'] and not origin['unicodeToolContainsGlyph']
current=(R/'test-support/live-e2e/live-e2e-harness.ts').read_text()
prior=subprocess.check_output(['git','show','ca0552721:test-support/live-e2e/live-e2e-harness.ts'],cwd=R,text=True)
reviewGap={'predicatePresentInReviewedIR002':"&& task.includes('</template>') && task.includes('… [') && !task.includes('🛡️')" in prior,'blanketReplacementCharacterBanPresentInReviewedIR002':"task.includes('\\uFFFD')" in prior,'currentGlobalGlyphPredicateRemoved':'shieldOmissionPressureVerified' not in current,'currentLiteralReplacementCharacterBansRemoved':"includes('\\uFFFD')" not in current,'coreSafeUnicodeValidatorStillUsed':'!providerSafeCompactionText.isProviderSafeText(task)' in current,'exactRawSourceStillUsed':'fact.toolResult === unicodeShieldSource' in current,'snapshotEqualityStillUsed':'snapshotSummary !== acceptedSummary' in current,'nextRequestEqualityStillUsed':'nextRequestSummary !== acceptedSummary' in current}
assert all(reviewGap.values())
final=load(A/'final-audit.json')
api=[{'path':v['path'],'matches':sha(R/v['path'])==v['sha256']} for v in final['durablePaths']]
inv=load(T/'implementation-evidence/ir-003/source-inventory.json')['paths']
source=[{'path':v['path'],'matches':not (R/v['path']).exists() if v['status']=='deleted' else sha(R/v['path'])==v['sha256']} for v in inv]
assert all(v['matches'] for v in api+source)
prodDiff=subprocess.check_output(['git','diff','HEAD','--name-only','--','*/src/**'],cwd=R,text=True).splitlines();assert not prodDiff
wire=[json.loads(l) for l in (A/'wire.jsonl').read_text().splitlines()]
req=[w for w in wire if w['event']=='wire_request']; statuses=[w for w in wire if w['event']=='wire_status']
assert len(req)==len(statuses)==9 and all(w['status']==200 for w in statuses)
assert collections.Counter(w['kind'] for w in req)=={'parent':8,'summary':1}
summary=a['summaryResponses'][0]['content'].split('<compaction_summary>')[1].split('</compaction_summary>')[0].strip()
constituents=[]
for m in a['parentRequests'][-1]['messages']:
 for c in (m.get('provenance') or {}).get('constituents',[]):
  if c['kind']=='compacted_memory':
   start,end=c['textRange']['start'],c['textRange']['end']; b=m['content'].encode('utf-16-le');constituents.append(b[start*2:end*2].decode('utf-16-le'))
assert constituents==[summary]
assert (A/'accepted-summary.md').read_text().strip()==summary
report={'scope':'CRR-007 focused failure origin; no provider execution, no retrospective full-flow pass','head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'origin':origin,'reviewGapAndCorrection':reviewGap,'apiPaths':api,'implementationPaths':source,'productionDeltaFromHEAD':prodDiff,'observedStage':a['stage'],'completedTurns':a['completedTurns'],'originalError':a['error'],'wireRequests':len(req),'requestKinds':dict(collections.Counter(w['kind'] for w in req)),'allHttp200':True,'nextParentExactlyOneAcceptedSummary':True,'snapshotFileEquality':'Not tested by this review; original flow threw before file assertions','referencesPresent':all(pathlib.Path(p).is_file() for p in load(A/'reference-index.json')['absolute_references']),'protectedEntryPaths':len(load(D/'entry-hashes.json')),'authorityHashes':{f:sha(T/f) for f in ['requirements-doc.md','design-spec.md','acceptance-disposition.sr020.md','solution-revision-record.md','proposed-compaction-prompt.md','output-format-and-coverage.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md']}}
(D/'origin-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['apiPaths','implementationPaths','authorityHashes']},indent=2))
