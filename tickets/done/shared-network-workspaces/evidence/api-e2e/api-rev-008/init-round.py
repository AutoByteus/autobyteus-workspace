from pathlib import Path
import subprocess as sp,json,tempfile,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
S=Path(tempfile.mkdtemp(prefix='ab-nfs-api008-'));(S/'home').mkdir();(S/'tmp').mkdir();(E/'scratch-path.txt').write_text(str(S)+'\n')
delta=sp.check_output(['git','diff','--name-only','f70912934b','HEAD','--','.',':!tickets'],text=True).splitlines()
assert set(delta)==set(['autobyteus-web/components/fileExplorer/FileExplorerTabs.vue','autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts','autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.spec.ts','autobyteus-web/docs/file_explorer.md','autobyteus-web/stores/fileExplorerContentActions.ts','autobyteus-web/stores/fileExplorerState.ts'])
carry=sp.check_output(['git','diff','--name-only','f70912934b','HEAD','--','autobyteus-nfs','autobyteus-server-ts','scripts/public/docker','TESTING.md','DESIGN.md','tickets/in-progress/shared-network-workspaces/requirements-doc.md','tickets/in-progress/shared-network-workspaces/design-spec.md'],text=True);assert not carry
old=json.loads((T/'evidence/api-e2e/api-rev-007/cleanup.json').read_text());assert old['result']=='Complete'
a={'head':sp.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source':'a3f65bfe6e7859a3167cb41013b80bc223385cfb','delta':delta,'unchangedStorageServerLauncherRequirementsDesignGuidelines':True,'priorCleanup':'Complete','scratch':str(S),'sourceHashes':{p:hashlib.sha256((R/p).read_bytes()).hexdigest() for p in delta},'priorApiResult':'Fail82.14','followup':'project_task_a4f90984-add2-4300-983d-de54ded3032b, user-directed outside increment, unresolved notPassed'}
(E/'input-audit.json').write_text(json.dumps(a,indent=2)+'\n')
with (T/'api-e2e-coverage-investigation.md').open('a') as f:f.write('''
## API-REV-008 — IR010 original peer-refresh revalidation plan

Entry CRR015 source Pass100, source a3f65bfe6e, current docs c01dbfdcb6. ApprovedSR025/DEC017 and technicalSR023/ARCH007 unchanged. Read current source-review/handoff/revisions, original API007 evidence/ledger/history, requirements/design/approval/investigation/history (unchanged authority), root TESTING/DESIGN and web AGENTS/ARCHITECTURE/README/isolated-app instructions. Source diff confined to three frontend owners, two test files and docs. Previous VM/image/scratch retired under complete API007 cleanup; provision fresh owned resources, not revive deleted identities.

**Scope disposition:** retain IR010 correction and rerun ORIGINAL AC010/REQ011/SCN006 L23 draft preservation through real peer modify/reload and Save. CR-FUP002 pending-Save/later-input equality defect remains unresolved, explicitly user-directed outside this increment, PM Task project_task_a4f90984-add2-4300-983d-de54ded3032b TODO/notdispatched. Not a false Pass or unsupported scenario. No editor cleanup, new approval/design/implementation loop or rerouting for that separate finding.

Changed boundaries: workspace-session draft owner → Tabs/FileViewer/Monaco view and native input; streamed filesystem/refetch → committed content; Save → actual server/NFS/original source. Existing untouched backend/storage/launcher can carry API007's exact scoped LN/LD lifecycle/operations/permissions/visibility proof after diff check. Same-kernel limits and deferred Mac/physical/independent-client/kernel/external-join/agents unchanged.

Coverage validity: original FileExplorerTabs.unsaved regression **Still Valid**, unchanged assertion; new draftViewer eight tests and adjacent components/store/preview/path tests **Still Valid**, execute narrow then affected suite/guards. Retired context-menu test checks were dead listener assertions, valid keyboard lifecycle retained by IR010; no new coverage removal. Existing af9f23 REST/helper coverage **Still Valid**, rerun public HTTP subset. No additional durable test needed now: current original+real-viewer coverage and implementation native-Monaco fixture cover mechanism; **Use Temporary Executable Probe Only** for actual owned NFS peer/UI correlation. Do not re-run CR-FUP002 diagnostic as an active gate.

Plan: repository checks → mandatory confidence / broader decision → fresh ONE LinuxVM/TWO actual launcher nodes, sequential LN/LD public setup with current-source isolated desktop. In both modes native edit/Save verified by B; fresh unsaved draft while B writes; no silent replacement before/after deliberate Files/Terminal remount/reopen of already-open path; Save visible draft and B/source exact bytes. Proportionate clean-reader/Markdown/HTML-relative/image/media APIs and visible previews; carry unchanged full storage matrix. Use CUA only for UI; public APIs/CLI for fixtures. Own loopback ports/HOME/DB, no credentials or host network/live-node changes. Cleanup desktop/tunnel/guest/image/scratch; preserve prior candidates/cache/preexisting build trees. API007 remains Fail until completed new verdict. Success requires >=95%, no category<90 and scoped critical proof; then fresh successful cumulative-test-review route, not direct Delivery.
''')
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('''
## API-REV-008 affected rerun (planned before execution)
Prior API007 final rows remain historical. Carry unchanged L01/03–21/25 scoped proof after input diff; new environment/setup receipts supplement, not full rerun. Reuse L02/L22/L23/L24/L26 IDs.

| Case | Expected | Current result |
| --- | --- | --- |
| R8-L02 | Original/draftViewer/adjacent/guards and HTTP coverage green; exact source audited | Not Tested |
| R8-L23-LN | Real native draft survives B commit/reload; actual Save stores visible bytes | Not Tested |
| R8-L23-LD | Same original affected journey on Docker storage, no earlier dirty-buffer regression | Not Tested |
| R8-L22-L24 | Clean-reader and healthy preview/API/Guide/local-regression unchanged; mode scope explicit | Not Tested |
| R8-L26 | Exact owned teardown and truthful carry/follow-up/score reconciliation | Not Tested |
''')
print(S)
