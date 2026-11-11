# Code Review Report — desktop-node-file-open-471 (autobyteus-471)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, user-approved 2026-11-11)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, Ready; direct route)
- Supplemental Task Artifacts Reviewed As Context: `node_access_model.md` (NAS-39, unchanged)
- Design Review Report / Architecture Review Revision Record: N/A (direct route)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001; Medium / Low, Direct API/E2E)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin round; no full source audit or scorecard)
- Trigger: API/E2E engineer, API-REV-001 (Fail): F-1, F-2, F-3
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`; Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: AC-003 (F-1, F-2), REQ-001 read-only (F-3); evidence steps D5, D6, D7–D9
- Exact Failing Commands / Execution Mode: packaged app of this worktree as isolated instance `iso-59405-31d0`, a test-owned Docker node connected by setup code, paired host `host-b-471`, scripted AGY run; steps in `evidence/api-e2e/API-01-docker-desktop/steps/`
- Failure Evidence Paths: `API-01-desktop-transcript.md` (D5–D9), `results/d5.json`, `shots/d5-link.png`, `shots/d5-attachment.png`, `shots/d8-before-typing.png`, `shots/d9-after-save.png`
- Code under test: `2e2b9ed436`

## Routing Classification Review

- Task size `Medium`, architectural risk `Low`, route `Direct API/E2E`. Independent source review: `Failure-origin exception`. Classification unchanged: the three causes are local to existing web owners.

## Scenario Basis

| Failure | Approved behavior | Independent trigger | Production path | Validity |
| --- | --- | --- | --- | --- |
| F-1 | REQ-003 / AC-003: a remote run's path says "This file is on <node>, where this run runs." on desktop and phone; the old text is removed | Owner clicks a file link in a delegated run that a peer runs | `AgentEventMonitor.handleFilePathAction` → (should reach) `useEventMonitorFilePreview.openPath` | Supported Normal Scenario |
| F-2 | REQ-003 "(links and path attachments)" on desktop and phone; REQ-001 "when it is on the run's node" | Owner clicks a path attachment in that remote run on the desktop | `UserMessage.openAttachment` → `contextAttachmentPresentation.openAttachment` → `fileExplorerStore.openFilePreview(absolutePath)` → node-file route on the window's node | Supported Normal Scenario |
| F-3 | REQ-001 "opens the file read-only"; out of scope: "any write" | Owner clicks a path attachment outside the run's folder in a run on the window's own node | Same attachment path → `_openFileWithMode` → route `node-file`, with `accessIntent: null` → editable | Supported Normal Scenario |

## Origin Findings

### CR-001 — The run view answers a remote run's link before the new handler runs (F-1; Local Fix, implementation)

- Evidence: `components/workspace/agent/AgentEventMonitor.vue:96-100` (autobyteus-278) returns `t('remote.filePath', …)` ("That file is on {{node}}: open the run in that node's window to see it.") for any path in a remote run, before it imports `useEventMonitorFilePreview`. The new remote-run branch (`useEventMonitorFilePreview.ts:71-72`) is therefore never reached from the run view. The phone's `MobileRunTargetView.vue` renders the same component, so phone links in a remote run are affected the same way (confirmed by reading the code).
- Origin: implementation defect. Two owners decide the same rule (Principle 13), and the design names `useEventMonitorFilePreview` as the single owner of DS-002. The specs call the composable directly, so the caller's early return escaped them. The design's Current-State Read also missed this existing caller-side check; that is a weakness in the design artifact, but the fix stays within the design's intent.
- Required action:
  - Remove the caller-side remote branch so the composable alone decides (DS-002) on desktop and phone.
  - Remove the now-unused `remote.filePath` key in en and zh-CN, after checking with `grep` that nothing else uses it.
  - Add a component-level test that mounts `AgentEventMonitor` with a remote run and asserts the REQ-003 text.

### CR-002 — A desktop path attachment in a remote run reads the window's own node (F-2; Local Fix, implementation)

- Evidence: on the desktop, `UserMessage.vue:157-171` → `contextAttachmentPresentation.openAttachment` → `fileExplorerStore.openFilePreview(<absolute path>)`. Since this ticket's routing (`fileExplorerContentActions.ts` `loadRouteOf`), an absolute path in a non-embedded window becomes a node file of the **window's** node. Node B's path is read on node A (`GET …/rest/node-files/content` → 404, a hidden "not found" tab). A file at the same path on A would be shown as B's attachment. Before this ticket, the same click opened nothing.
- Origin: implementation defect, a regression caused by this ticket's store routing. REQ-003 names both clients and both entry forms. Principle 1 says to trace each entry form; the attachment opener is a second caller of the same store route and has no remote-run check.
- Requirement reading: "on the desktop and on the phone (links and path attachments)" lists two clients and two forms, and the user approved it. The design's DS-002 words only the phone's attachment message. That narrowing is not authoritative over REQ-003, so this is not routed as a Requirement Gap.
- Required action:
  - On the desktop, a path attachment in a remote run must not be read from the window's node. It shows "This file is on <node>, where this run runs.", the same rule the link uses.
  - Put the decision in one place for both entry forms, for example the remote-run check the link handler owns or a shared helper both callers use. Do not add a second copy.
  - Use the run view's existing file status line for the message, as for links.
  - If no existing surface can show it, return a `Design Impact` rather than inventing a new surface.
  - Add a test for the desktop attachment in a remote run.

### CR-003 — Node files opened by any caller other than the link handler are editable (F-3; Local Fix, implementation)

- Evidence: `fileExplorerContentActions.ts:104-130` sets `mode`/`accessIntent` from the caller's `options.accessIntent`. Only the link handler passes a read-only intent. The attachment opener passes none, so a node file opens in Monaco in `edit` mode with `accessIntent: null`. Typing is accepted, and Cmd+S sends `WriteFileContent`, which the node refuses ("must be relative to the workspace root"). No error is shown and the typed text stays (D7–D9). Nothing was written on the node.
- Origin: implementation defect, a missing invariant. The store decides "absolute path in a non-embedded window → node file" in one place (`loadRouteOf`), as the design's shape guidance asks. But read-only, which REQ-001 makes part of what a node file is, is left to each caller.
- Required action:
  - Make read-only an invariant of the `node-file` route in the store. Every node file opens with a read-only access intent, whoever opens it, so `mode` is preview/read-only and the save path refuses early (`fileExplorerContentActions.ts:382`).
  - Add a store spec: `openFilePreview(absolutePath)` with no options in a non-embedded window opens read-only, and saving is a no-op.

## Observations From API/E2E

- Test commits `32dccf58fa` and `b49b5c539f` are baseline timing fixes to existing probes. They are reviewed in the proportional test-code review after API/E2E passes.
- FU-001…FU-003 (pdf.js worker URL, a stale run-view status line, MSP-24/34/35 under autobyteus-469) are outside this ticket and recorded. FU-002 is related to CR-001's surface but is not caused by it; it stays a follow-up.

## Classification And Routing

- Classification: `Local Fix`, owner implementation engineer (CR-001, CR-002, CR-003).
- Review gap: N/A (direct route; no earlier source review). These are failures of the implementation's self-check: the specs test the composable and store in isolation and miss the real callers (`AgentEventMonitor`, `UserMessage` attachments).
- After the fix, the route stays direct (no source review required by the classification). API/E2E rechecks:
  - API-01 D3 and D5–D9, plus API-02.
  - A phone link in a remote run.
  - A desktop attachment in a remote run.
- Then the proportional test-code review covers this round's test commits and the new specs.

## Resolution Check (CRR-002)

API-REV-002 re-proved all three on their real surfaces at `b0f3d1c42b`. The fix matches the required actions:

| Finding | Resolution in code | Evidence | Status |
| --- | --- | --- | --- |
| CR-001 | `AgentEventMonitor`'s caller-side remote branch removed; `remote.filePath` removed (en, zh-CN); `AgentEventMonitor.remoteRunFiles.spec.ts` | API-02 `r2/d5.json`; API-06 phone | Resolved |
| CR-002 | One remote-run decision for links and attachments (`composables/remoteRuns/remoteRunFile.ts`), message on the run view's status line; nothing read | API-02 `r2/d5.json` (no request, no tab); API-06 (phone toast) | Resolved |
| CR-003 | The store's `node-file` route opens read-only whoever calls (`accessIntent {source: "node-file", readOnly: true}`, preview) | API-01 D9 `r2/d9.json` (no `WriteFileContent`, file unchanged); store spec | Resolved |

## Latest Authoritative Result

- Review Decision: CR-001…CR-003 resolved (CRR-002). The proportional test-code review passed (`api-e2e-test-review-report.md`).
- Review Entry Point: `API/E2E Failure-Origin Review` (round 1); resolution confirmed with the post-pass test review
- Failure Origin: implementation (resolved)
- Recommended Recipient: delivery engineer
