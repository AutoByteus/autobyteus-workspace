# API/E2E Test Review Report — CRR-016

**Pass — proportional review of cumulative durable test changes.**
No actionable test-code finding. This is not another source/architecture review,
a fresh runtime execution, or a new confidence score. API008's **Pass95% applies
only to the user's command-only shared-filesystem scope**; it is not a full
application, editor, API, platform or release verdict.

## Review Meta

- Test-review round **1**, cumulative code-review revision **CRR-016**; no prior
  successful-test review report or unresolved test-review finding. The existing
  CRR001–015 history is preserved; absence of an earlier test result was not Pass.
- Trigger API-REV-008 at **a53c133a262ca859e8b8103c737a0ce385019aa5**; source
  **a3f65bfe6e7859a3167cb41013b80bc223385cfb / IR010**, technical NFS IR009/d3c88.
  Worktree shared-network-workspaces, branch codex/shared-network-workspaces;
  parent Task project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
- Requirements/context: requirements-doc.md, investigation-notes.md,
  solution-revision-record.md, design-spec.md, solution-design-handoff.md,
  approval-record-sr025.md. SR025/DEC017 establishes the one-Linux-VM topology;
  **later direct user command-only validation instruction** in
  [user-command-only-direction.json](evidence/api-e2e/api-rev-008/user-command-only-direction.json)
  controls the current test surface and acceptance gate.
- Architecture review/history: applicable technical SR023/ARCH007 and historical
  ARCH008/SR024 alignment, not new approvals. Implementation history IR010;
  original source report **CRR015 Pass100**, code-review-report.md, unchanged.
  Its requested next live-editor continuation is superseded by the later direct
  user instruction, not silently credited as executed.
- Coverage investigation, ledger, execution report and api-e2e-revision-record.md
  **API008** inspected as current authorities. API007 combined Fail82.14% and
  API006 Blocked67.86% remain historical, not relabelled. Delivery revision N/A.
- API result/confidence: **Pass / 95% command-only filesystem**; broader validation
  Required and executed; FS01–17 Pass with explicit fresh-versus-carried evidence;
  API-owned cleanup Complete. These are API's result and score, not rescored here.
- Large/High/Reviewed preserved. No delegation, new approval question, Solution
  Designer scope-referral or duplicate runtime cycle. No durable/source changes
  were made in API008. No reviewer production/test edits or runtime commands.
- Testing guideline: root TESTING.md plus DESIGN.md, root/server/web AGENTS;
  evidence layers, clean environment, test-owned resources, non-watch execution
  and cleanup applied. No conflict affecting this review. No implementation-source
  size thresholds or full source scorecard applied to tests.
- Supported product-scenario basis confirmed **Yes**, at each test's stated
  boundary. Existing app regressions remain legitimate retained coverage even
  though they are no longer gates for this filesystem increment.

## Changed Durable Test Scope

Compared the cumulative delta against ancestor f13bdd0eb79aacc63dffa5995b9c86f359001468,
including af9f23df93, API007's original regression and IR010. **Four changed test
files**, not five; the listed runtime helper is reused unchanged. No durable file
was removed. API008 contains only ticket documentation/evidence changes.

| Durable test path (worktree-relative) | Change | Scenario / requirement | Coherent responsibility / evidence boundary |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts | Updated | Existing SCN006/REQ011/AC010 healthy content, relative resources and path containment | af9f23 replaces unsafe route-only fixture cleanup with existing composed runtime; adds public GraphQL create + real HTTP HTML/relative image/replacement/deletion. Five existing exact bytes/MIME/traversal checks remain. |
| autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts | Added | Original API-F007/CR008 established local draft + peer commit case, plus no-peer control | Two tests enter update/save component events and real store streamed-modify/invalidate/refetch. FileViewer and Save are doubled: proves parent Save argument, not native Monaco, actual write or NFS. Original red assertion unchanged. |
| autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts | Added | Retained IR010 draft ownership, peer refresh and existing view/session behavior | Eight cases exercise actual Tabs/FileViewer/store; textarea Monaco and GraphQL doubles, Markdown renderer stub. Visible draft/Save payload, empty input, loading/error, clean undo, selection/remount/preview/read-only, failed Save and later differing text, explicit close. Not live browser/NFS proof. |
| autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.spec.ts | Updated | Existing active component keyboard lifecycle | Two tests retain keyboard attach/remove and initial active mount checks. Only obsolete document-click assertions removed with the invisible unused context-menu listener. No real user behavior assertion weakened. |

**Unchanged support inspected:**
`autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts` is byte-
unchanged from the ancestor and was not edited by af9f23. Its existing composition
initializes the test data root, prepares lifecycle authorities, listens on owned
loopback/port0, and closes Fastify on startup error. The caller closes the server
before removing its test data, and removes only workspaces it registered.

“No durable test changed” is **No for the cumulative review** (although true for
API008 alone); therefore this result is Pass, not Not Applicable.

## Scenario And Evidence Understanding

- Healthy workspace preview: user opens HTML with relative image, then reopens
  after an external replacement/delete. Existing approved SCN006 and actual
  production routes establish the behavior. The test creates its fixture through
  owned filesystem operations and registers via public GraphQL; real HTTP GETs
  check exact HTML/image bytes, MIME and deleted-resource error. Existing path
  containment controls test an established access boundary, not an invented
  attack sequence. Test-only file creation is legitimate fixture setup, not a
  claim of NFS or browser rendering.
- Draft preservation: API007's native-input/save/no-peer/real-peer evidence and
  the existing no-unsaved-overwrite contract independently establish the scenario.
  New component fixtures corroborate that path; their synthetic event and mocks
  do not establish its validity themselves. Actual store stream handling is used,
  not a fabricated internal draft replacement. The viewer suite additionally
  observes visible model input and mutation payload, beyond a parent method spy.
- Session controls exercise the existing selected open file and its view modes.
  Direct store setup and deferred query/mutation responses isolate that supported
  component boundary; no new cross-session/competing-write contract is inferred.
  The read-error case sets content null exactly as existing invalidation does,
  then calls the existing fetch action. No unsupported state is used to claim
  successful product behavior.
- CR-FUP002 remains a specific known pending-Save exception: later input equal to
  the old committed snapshot can be lost. Existing passing “later edit” coverage
  does **not** prove that exception fixed. The separate Task and user-directed
  nonblocking disposition are retained; no test deletion or weakened expectation
  disguises that failure.

## Proportional Test-Code Checks

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Single REST boundary suite and separate parent regression / actual-viewer lifecycle / active-listener suites. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact response bytes/MIME/errors, preserved visible draft and exact Save payload; clean/read-only controls prevent blanket no-refresh behavior. Same editor identity is meaningful for the retained loading-preservation behavior. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Existing runtime-server helper reused; test-owned roots and PNG data; subject/addFile/peer/save helpers and parameterized empty/no-peer variants. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Unique owned temp/data/workspace roots; real server port0; private Pinia per case; controlled async responses; viewer wrappers unmounted; no actual provider calls or user configuration needed. Recorded run uses clean HOME/TMPDIR. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Each file stays on one reader/editor concern; no source-size rule imposed. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | No skipped replacement for failing regression. Parent Save-contract and actual-viewer tests are complementary boundaries, not evidence counted twice. Removed click assertions correspond only to deleted dead plumbing. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Four actual changed files; unchanged helper noted accurately. Fresh12 focused tests overlap the148 adjacent tests. HTTP suite has6 tests total, not6 new socket journeys. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Existing content/access contracts and API007 real peer failure precede and justify the fixtures. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | HTTP/GraphQL request path for added REST journey; editor update/Save events and real stream handler at component boundary. Read-only forged Save event is a supported boundary-denial control, not claimed normal user action. |

## Execution Evidence Reviewed — No Repeat Execution

[Repository result](evidence/api-e2e/api-rev-008/repository-result.json) contains
exact argv/cwd/environment and logs. Personally inspected those logs and diffs:

- original-and-viewer: **3files/12tests Pass**;
- adjacent: **22files/148tests Pass**, includes those12, not160 unique tests;
- web-boundary and localization-boundary: **Pass**;
- workspace-content REST: **1file/6tests Pass**. The added case uses actual
  network HTTP and GraphQL; five retained cases use Fastify injection against
  the real composed server. Do not describe all six as independent socket tests.

These application checks were executed before the user's command-only revision
and are **supplementary**, not filesystem acceptance gates. No assertion remained
unclear after comparing source/diff and fresh evidence, so no focused rerun or
full workflow repeat was justified. No new live editor/NFS/browser verification
is attributed to this review.

API008's temporary command probes, summaries, mount/setup/carry and cleanup
receipts are execution evidence, **not durable tests under structural review**.
The current report distinguishes fresh generic command actors from old actual
launcher-node lifecycle/selected-private-state proof. Generic containers bind a
proven real NFS mount and share its kernel/cache; they are not independent NFS
clients. FS13–15 and refusal controls are explicitly carried, not newly executed.
The 17-group summary and cleanup receipt agree with the current ledger/report;
this review does not replace API's execution assessment.

Review provenance, four-file delta, unchanged helper and source-review hashes,
log summaries and absence of API008 source edits are recorded in
[review-audit.json](code-review-evidence/crr-016/review-audit.json).

## Findings

**None.** No actionable test-code correctness/structure issue, false success
assertion or scope-critical missing test established. No source score or confidence
score produced here; the existing source report remains authoritative and unchanged.
No classification or implementation/API rework route required.

## Follow-ups

- **CR-FUP002**, already owned by Project Task Manager in
  **project_task_a4f90984-add2-4300-983d-de54ded3032b**, remains unresolved, outside
  the current increment by explicit user direction. Existing IR010 fix stays.
  No duplicate Task, notification or additional editor repair/retest request.
- Prior FUP001, D001/DEC015 deferred outage isolation and IMP-D001 scope remain
  unchanged. No new follow-up discovered in this test-code review.

## Latest Authoritative Result

- **Pass / successful proportional durable-test review / CRR016**, first round
  of this report. Four changed durable files and one unchanged reused helper
  reviewed. Unresolved test-review findings: **None**.
- Recommended next recipient: **Delivery Engineer**, subject to fresh rules.
  Current evidence supports the **command-only shared-filesystem increment**,
  not full application acceptance. No removed editor/UI/API gate should be
  reinstated merely to repeat an old requested continuation.
- Delivery owns integrated verification, docs sync/finalization and any release
  authorized by the user/release guide. It should make the latest user scope,
  retained frontend fix, unperformed live editor closure, follow-up Task and
  same-kernel/deferred qualifications explicit in final artifacts. No renewed
  scope approval or architecture loop is requested.
- Mac/cross-OS/independent-client/kernel/physical/external-join/authenticated-agent
  qualification and publication/signing remain unproven/deferred as recorded,
  not inferred Passed. API008 is not a performance/scalability benchmark either.
- No production/durable-test changes, new runtime resources, delegation, merge,
  push, tag, release, deployment, TaskDone or user-verification claim by reviewer.
