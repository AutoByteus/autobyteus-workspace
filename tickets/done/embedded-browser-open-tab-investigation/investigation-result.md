# Historical Investigation Result — superseded by SR-005 solution handoff

Current state: AP-001 requirements Approved; design Ready / Architecture Design Complete. See `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/solution-handoff.md`. The following SR-001–004 hold statements are retained as history, not current blockers.

# Investigation Result — awaiting user decision

Package: embedded-browser-open-tab-investigation; SR-004; 2026-10-02.
Status: investigation complete; requirements Ready for Approval, routine user approval hold. Not Architecture Design Complete or implementation-ready. No corrective source changes made.

## Request / outcome
User reported recurrent successful daily-assistant open_tab calls without embedded Browser display and explicitly invited probes. Goal was causal investigation, not unapproved implementation. Exact incident tab 15ee0d and earlier tab 51da23 both used Antigravity CLI. The adapter streams `result.output.tab_id` while the Browser handler only accepts `result.tab_id`. Green Activity success is independent of UI focus. Controlled production-code replay proves both incident envelopes skip focus, whereas changing only result shape triggers focus and Browser selection. Installed 1.4.92-beta.9 has the same mismatch. This is a deterministic provider-integration defect for the observed shape, not established random browser instability.

## Evidence / limitations
**SR-002 update:** The full scenario has now been reproduced in isolated installed release 1.4.92-beta.9 with real Daily Assistant, Antigravity CLI and the same Gemini model. Actual open_tab c1c04e succeeded; Activity remained selected, Browser shell snapshot empty. Native page existed and loaded real DOM but viewport was 0 x 0. An explicit diagnostic focus IPC attached that same tab and produced a 626 x 757 viewport with rendered native content. No mock provider/IPC/browser in this scenario. Isolated instance stopped and data removed, ports released.

Earlier SR-001 evidence (historical limitations, superseded for the newly tested scenario):
11 diagnostic assertions passed; production converter/parser/handler/controller executed with UI/IPC and manager doubles. Not a full Electron E2E or native live-session inspection. Existing incident data and installed bundles were read-only; user's app not driven/restarted or modified. dom_snapshot success has null output and is not independent content/readiness evidence. No claim to explain every past incident. Additional IPC error-propagation weakness noted separately, not this cause.

## Proposed behavior for user approval
REQ-001–003: successful local AGY open_tab must display/focus its returned embedded session and select Browser; preserve other runtime successes, remote suppression, unrelated AGY tools and failure semantics/data. No subsystem rewrite, UI redesign, state reset or historical migration. Correction direction should respect documented runtime canonicalization; target architecture is deferred until approval.

## Workspace / base / approval
Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation`.
Branch: codex/embedded-browser-open-tab-investigation.
Fetched base origin/personal `5e3cb2f720e6fc80173099075daf55594ed58de9`; finalization target origin/personal, not currently authorized.
Approval basis: user investigation/probe request only. No design/implementation approval. User owns DEC-001.

## Canonical package
- Full desktop procedure/evidence inventory: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/desktop-reproduction.md`
- Desktop assertion results: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/assertions.json`
- Cleanup receipt: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/cleanup.json`
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/investigation-notes.md`
- History: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/solution-revision-record.md`
- Incident excerpt: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/incident-events.json`
- Diagnostic source: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-probe.cjs`
- Diagnostic output: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-results.json`
- Installed comparison: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/installed-code-check.txt`
Design, Product supplements, architecture review, implementation, code review, API/E2E and delivery artifacts: N/A — not applicable at this stage.
Original screenshot/runtime paths and detailed source references are in the investigation.

## Next expected action / route
Return findings to user and ask whether to approve the narrow corrective behavior. Routine approval hold; no downstream handoff. Handoff rules queried: only completed architecture (review/direct implementation) and delivery receipt correction routes returned. None applies to investigation/requirements approval hold. No downstream recipient notified; return findings to user.

SR-002 routing lookup completed: returned rules cover completed architecture or delivery receipt correction only; none matches this evidence-only investigation/approval hold. No specialist handoff; report to user. No intended behavior change, requirements still awaiting user approval; full scenario reproduction is investigation evidence, not a finalized delivery receipt.

## Follow-up clarification — intermittent user experience
User says sometimes it happens and sometimes not. Confirmed defect is deterministic only for the observed AGY output envelope and missing focus path; no successful automatic-focus case from the same runtime/version has been captured. Do not generalize the single full desktop reproduction into an explanation for every incident. Different runtime paths or pre-existing displayed sessions are hypotheses for differing observations, not confirmed causes. Ask whether a working case used the same Daily Assistant with Antigravity; ideally identify one successful run to compare tool invocation/result shape and UI/session state. No intended-behavior change or approval received; SR-002 remains current completed round.
Routing remains investigation/clarification only; no completed architecture or delivery receipt.

## SR-003 — Third open and native registry listing corroborate hidden sessions
User supplies two new screenshots: ctx_714802a4d4f1__image.png and ctx_a6f182a0d801__image.png in the same original context_files directory. First shows open_tab success with provider_state/output wrapper and new tab 7b52b9, reuse_existing false; second shows list_tabs returning 51da23, 15ee0d, 7b52b9, all same CEAC URL, while Activity is selected. Read-only original run trace lines 157–160 independently match the screenshots (turn f6bc2bce-fcc4-43d7-99df-d0fd7884fa6c). Minimal excerpt preserved in evidence/third-open-and-list-events.json (Solution Designer evidence-only supplement, BEH-001 / SCN-001 / REQ-001 / AC-001).
This establishes that the tool's browser-session registry contained all three previously opened sessions at list time. list_tabs enumerates native sessions, not tabs attached to the current visible shell. The third result has the same failing envelope. Repeating open_tab with reuse_existing false creates an additional session rather than repairing display. These screenshots therefore corroborate the diagnosed create-versus-display separation; they are not a working automatic-display case and do not resolve the separate intermittent-success question. No production mutations, scope changes or approval inferred.

New evidence absolute path: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/third-open-and-list-events.json`. Approval unchanged. SR-003 rule lookup completed: no matching route; no architecture-complete or delivery receipt outcome. Return evidence clarification to user; no handoff.

## SR-004 deeper investigation result
Full current-state browser/UI connection audit: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/connection-audit.md`. Extra diagnostic script/results: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/deep-connection-probe.cjs`, `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/deep-connection-results.json`. The tab is a live native view tracked in an in-memory registry; presentation requires separate window assignment plus bounds. For agent opens, assignment depends on the streamed result handler, which returns before focus on the AGY wrapper. Shell snapshots do not automatically discover unassigned tabs, so this misses both attachment and self-recovery. Activity success confirms operation result, not presentation. Additional error-propagation weakness verified via fault injection, not observed as this incident cause. 13 boundary cases pass; prior real desktop reproduction remains applicable. No new production writes, requirement approval, architecture or implementation. Current behavior baseline remains SR-001 Ready for Approval; no expanded reliability scope silently adopted.
SR-004 routing lookup completed: no rule matches evidence-only investigation / requirements approval hold; no specialist handoff. Return findings to user.
