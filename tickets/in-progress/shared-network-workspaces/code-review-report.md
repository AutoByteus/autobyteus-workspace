# Code Review Report — CRR-014

## Latest authoritative result

**Fail — focused API/E2E failure-origin review. CR008 / API-F007-UNSAVED is an
implementation-owned Local Fix.** A peer content refresh silently replaces an
unsaved text-editor draft. The defect predates this ticket, but violates an
explicit active acceptance criterion; it is not an unrelated follow-up.

No new implementation-source scorecard is issued. CRR013's source-only 100/100 is
historical, not a current product Pass. API007 remains **Fail82.14%, broader
Required and executed** under its owner's report. This review does not reopen
SR025 acceptance or require another architecture review.

## Review round meta, basis and scope

- Round14 / CRR-014; 2026-10-15; entry **API/E2E Failure-Origin Review**;
  implementation-review scope **N/A**. Large / High / Reviewed retained.
- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`, worktree
  `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
  branch `codex/shared-network-workspaces`.
- Trigger: API/E2E's actual API-REV-007 execution, L02 and L23, one underlying
  API-F007-UNSAVED finding. Input HEAD **f70912934b2a660a92574b777edc7e465a6d34df**.
- Current intended-behavior authority: [requirements](requirements-doc.md),
  **ApprovedSR025 / DEC017**, [exact approval](approval-record-sr025.md),
  [solution history](solution-revision-record.md), [investigation](investigation-notes.md),
  [design](design-spec.md), [current handoff](solution-design-handoff.md).
  Technical SR023 / ARCH007 / IR009 remains; ARCH008 reviewed SR024 acceptance,
  not a new SR025 architecture package. No topology reapproval requested.
- Prior [source review history](code-review-revision-record.md) CRR001–013,
  [implementation](implementation-handoff.md) / [history](implementation-revision-record.md),
  [architecture report](design-review-report.md) / [history](architecture-review-revision-record.md)
  are retained at their original scopes. Production source remains
  **d3c88f37c30ee74a89a95a4f6906992667c9b875** before this correction.
- API context: [investigation](api-e2e-coverage-investigation.md),
  [execution report](api-e2e-execution-coverage-report.md),
  [ledger](api-e2e-test-case-ledger.md), [history](api-e2e-revision-record.md).
  E7 below means `evidence/api-e2e/api-rev-007/`.
- Reviewed only the unsaved-buffer contract, live/control receipts, red test,
  frontend event/content/editor path and baseline provenance. Root DESIGN/TESTING,
  root and web AGENTS, reviewer skill and Examples9/11 govern this review.
- Excluded: general test-suite review, a full structural/size audit, NFS engine
  rereview, other API007 case-group reexecution, physical/Mac/authenticated-agent
  qualification, architecture changes, delivery/release. Delivery revision **N/A**.
  Cumulative af9f23 successful-test review remains pending after green validation.

## Supported scenario and candidate gate

**BEH006 / UC006 / SCN006 / REQ011 / AC010 / IV-F05: intended contract Confirmed;
implemented unsaved-preservation outcome Contradicted.** AC010 explicitly says
preserve unsaved edits. Design BEH006 says no unsaved-buffer overwrite; its
preserved-reader row permits normal source fixes if current-build coverage finds
a defect. DEC017 changes proof topology only and retains L23.

| Scenario / independent basis | Actor, goal and entry surface | Forward path / lifecycle / consequence | Validity / use |
| --- | --- | --- | --- |
| SCN006, explicit AC010 unsaved-preservation edge | A edits an open shared text file in the ordinary Files editor, retaining an unsaved draft; B commits a change to that shared file through ordinary filesystem access. A's unsubmitted work must not be silently discarded. | Healthy mounted file; local draft differs from last saved bytes; B finishes its write; an actual observed refresh reaches A before A saves/reloads/discards. The editor and subsequent Save payload change to B's bytes. | **Supported Explicit Edge Scenario / Reachable / Use**, within normal SCN006. Authority is AC010, not the synthetic event or the mere existence of two UI actions. |

REQ005/DEC003 still requires users to coordinate same-file commits. This finding
requires neither automatic merge nor successful simultaneous competing saves:
A has not submitted its draft. AC010's explicit draft-preservation obligation
covers the observed update. No precise race, mid-request node switch, mocked
storage identity or unsupported outage is needed. Automatic notifications are
not guaranteed across NFS clients, but a notification that actually arrives
cannot silently destroy the draft.

| Candidate | Observation | Independent trigger / path / evidence | Disposition / scope / proportionate response |
| --- | --- | --- | --- |
| CAND019 | Committed-content refresh becomes editable/save content without preserving the local draft | AC010; ordinary peer commit while A retains unsaved text; trace below; E7 live/save controls and independently rerun red real-store test | **Promote → CR008, this ticket.** Restore draft ownership across the existing refresh/view/save boundary. No new merge engine, NFS cache policy or general recovery system. |

No held speculative candidates or unrelated findings. The correction's implementation
choices remain with Implementation Engineer; this report requires the contract,
not a preferred new abstraction.

## Evidence and forward source trace

Production paths below are repository-relative; line numbers refer to input HEAD.

1. `services/fileExplorerStreaming/FileExplorerStreamingService.ts:154–158`
   unwraps FILE_SYSTEM_CHANGE and invokes the change callback;
   `stores/workspaceFileExplorerLiveActions.ts:80–86` and `stores/workspace.ts:333–338`
   deliver the event to the file-explorer store (all under `autobyteus-web/`).
2. `stores/fileExplorerTreeActions.ts:74–95` resolves a modify event's file and
   calls `invalidateFileContent`. An expected own-save echo is a different
   condition; ordinary local typing does not register such an echo.
3. `stores/fileExplorerContentActions.ts:242–275` clears the open Text content,
   marks it loading, and refetches network-only GraphQL content. It writes the
   returned committed bytes into `OpenFileState.content` without a draft guard.
4. `components/fileExplorer/FileExplorerTabs.vue:174–182,254,346–352` receives
   editor changes only into local `fileContent`, while its deep active-file watch
   unconditionally resets that value from store content. Its loading branch
   (`166–184`, also Zen `22–39`) can remove/remount the viewer during refetch.
5. `FileViewer.vue:87–100` supplies **store file.content**, not an independently
   retained draft, as Monaco's modelValue. `MonacoEditor.vue:130,166–168,174–218`
   initializes from that prop, emits native model edits, and applies incoming
   prop content to the model. Thus merely guarding the parent's Save variable
   would not by itself establish visible-editor preservation through refetch.
6. `FileExplorerTabs.vue:414–425` sends the now-replaced `fileContent` to
   `saveFileContentFromEditor`; `fileExplorerContentActions.ts:320–325` sends it
   to the existing write action. The narrow test proves the wrong Save argument;
   it mocks persistence and does not claim an actual additional disk write.

The live receipt records the user-visible result; the exact event packet was not
independently captured in this review. The callback/refetch route is supported by
current source and the independently reproduced real-store event path, not a
claim of a new packet-level or live desktop reproduction by this reviewer.

### Live evidence reviewed (API-owned execution)

- [Save control](evidence/api-e2e/api-rev-007/ui-unsaved-save-control.json): native
  `ab` + Cmd+S showed Changes saved; B read exact `ab`.
- [Focused peer reproduction](evidence/api-e2e/api-rev-007/ui-unsaved-peer-reproduction.json):
  native edit to `cd` without Save; B still read `ab`; B fsynced/closed
  `API007_PEER_REPRO_FINAL`; A visibly changed before reload/close/discard/save,
  without confirmation. Actual source contains B's committed bytes. Earlier
  no-peer Terminal→Files control retained the draft.
- These are persisted API receipts and its observed UI account. Screenshots
  remained execution-tool outputs, not attached image files independently viewed
  here. No screenshot attachment or full OS/NFS reexecution is claimed.
- This is loss of the local unsaved draft, **not NFS committed-byte loss**.
  Historical API004 synthetic EditContext observations do not outweigh this
  native-input/save control plus red production-state path.

### Independent focused check

From worktree root, in a clean environment with owned temporary HOME/TMPDIR:

```sh
pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts --run --maxWorkers=2
```

Result **exit1; 3 Pass / 1 Fail**. The no-peer control and two existing active
lifecycle tests pass. Peer modify fails: Save receives `peer committed bytes`,
not `local unsaved draft`. Real Pinia store, tree-change/invalidate/refetch and
parent Save path execute; child editor, GraphQL response and persistence are
stubbed. This corroborates the live finding, not a separate Monaco/NFS proof.
No assertion or durable test was changed by the reviewer.

Evidence: [runner](code-review-evidence/crr-014/review-checks.py),
[log](code-review-evidence/crr-014/unsaved-regression.log),
[result](code-review-evidence/crr-014/checks-result.json),
[input/provenance audit](code-review-evidence/crr-014/input-audit.json).
The first runner attempt used a root one directory too shallow and stopped with
FileNotFoundError before tests/scratch/audit writes. Corrected root only; not a
product failure. Discovery commands with missing guessed paths and truncated
combined reads were followed by actual-path/focused reads; no missing output is
credited as validation. Raw Vitest `Received: ` lines34/54 retain trailing spaces;
that explicit evidence-only whitespace exception is not a source/doc failure.

## Origin, baseline and ticket scope

- **Origin: implementation defect in existing frontend refresh/draft ownership.**
  No fixture or test-invalidity explanation fits both the control and real-store
  failure. No NFS/storage or IR009 binding regression is attributed.
- Independent Git comparison: **11 relevant production files are byte-identical**
  at ancestor baseline **f13bdd0eb79aacc63dffa5995b9c86f359001468** and current HEAD,
  including Tabs, FileViewer, MonacoEditor, store/state/content/tree actions and
  stream dispatch. Exact per-file hashes are in the input audit. This establishes
  pre-existing code provenance; a separate baseline runtime run was not performed.
- **This ticket, not follow-up:** although not introduced here, the defect blocks
  current AC010/IV-F05 and required L23. Root TESTING Rule9 and skill Example11
  agree that an old defect blocking an in-scope criterion is not closed merely
  because it also exists on the base. No new intended behavior is required.
- **Local Fix, not Design Impact:** the approved contract already requires draft
  preservation; the existing frontend owner can restore it. No evidence requires
  a new architecture, changed concurrency policy, storage protocol or migration.

## Finding CR008 / API-F007-UNSAVED — preserve unsaved text across peer refresh

- Priority **High / blocks current acceptance**: unsaved user work is silently
  replaced during an ordinary observed shared-file update.
- Primary locations: `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue:346–352`
  and its FileViewer input; `autobyteus-web/stores/fileExplorerContentActions.ts:270–275`.
  Full cause crosses the narrowly identified view/content state boundary above.
- Required outcome: retain the actual editor draft and intended Save payload
  across peer invalidation/refetch, including its loading transition; do not
  silently discard it on the approved reload/reopen path. Continue to show fresh
  committed content for clean readers and preserve healthy preview/read-only,
  workspace/path and existing save behavior. No automatic merge/conflict-resolution
  engine or broad unrelated editor redesign is requested.
- Verify: make the new regression and existing controls green; add proportionate
  proof of the actual viewer/draft boundary rather than only a parent variable.
  API/E2E then reruns L23's native edit/save-control/peer-update sequence and
  affected clean-reader/reload/preview regressions under **SR025**, not a renewed
  physical/Mac/authenticated-agent prerequisite.

## Prior findings and review accountability

- CR007/API-F005: API006 independently resolved executed native-Mac boot/replacement
  scope, retained by API007. CR008 does not reopen it. Other CR001–006 scoped
  resolutions, D001/DEC015 deferral, IMP-D001 and FUP001 ownership remain unchanged.
- **Prior review gap:** AC010 should have led to checking that refresh cannot
  replace a dirty draft. The unconditional deep-watch assignment and committed
  content passed to the editor were source-visible; carrying BEH006 as unchanged
  was not sufficient evidence of that invariant. Exact mounted notification/UI
  manifestation required runtime evidence, but this is not purely unknowable
  runtime behavior. The affected correctness/preserved-behavior and readiness
  rationale is superseded for CR008 only.
- No retroactive numeric rescoring of CRR013 and no repeated full scorecard.
  Its IR009 binding/structural results remain historical; current acceptance is
  Fail until this bounded defect is corrected and independently validated.

## Cleanup, docs and routing

- All 50 hashed input files unchanged through the focused run; no tracked diff
  after execution. Owned temporary HOME/TMPDIR removed. No reviewer app/VM/Docker,
  mount/service/network/provider resources started; no user credentials accessed.
  Five pre-existing dist trees untouched. API007 cleanup Complete is its receipt,
  not a second teardown by this reviewer.
- Persisted state/migration and source-size audit: **N/A**, focused failure-origin
  review with no production edits. Follow-ups: **None newly raised**.
- Docs: reviewer report/history updated; implementation handoff/tests and any
  editor refresh/save documentation affected by the actual fix should be synced.
  Do not weaken AC010 or rewrite historical API results.
- Next owner: **Implementation Engineer**, selected by the fresh implementation-
  defect failure-origin rule. After correction: source review → API/E2E affected
  validation → proportional successful durable-test review → Delivery.
  No duplicate API/design notification, delivery handoff, TaskDone, release,
  delegation, or user-verification claim. Confirmed routing recorded after send.
