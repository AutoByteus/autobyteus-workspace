# Architecture Design Complete — embedded-browser-open-tab-investigation

## Result / approval / classification
- Package: embedded-browser-open-tab-investigation; revision SR-005.
- Result: **Architecture Design Complete**. Design Ready; requirements Approved.
- task_size: **Small**; architectural_risk: **Low**.
- AP-001, user 2026-10-02: “Well, since you found the problem then go ahead. Now, you are approved now.” Exact approved intended behavior: SR-001 REQ-001–003 / AC-001–003, UC/BEH/SCN-001–004; evidence clarified in SR-002–004. No behavior-defining supplements. No implementation/finalization gate bypass.

## Original request and investigation
User reported Daily Assistant open_tab success without embedded Browser appearing, repeatedly; requested controlled experiments and then full desktop reproduction. Three real user tab IDs 51da23, 15ee0d, 7b52b9 exist in native list but have AGY result.output.tab_id envelopes. Existing UI expects result.tab_id, silently returns before focus/lease, so created page remains unassigned to visible shell. Real isolated release 1.4.92-beta.9 using actual Daily Assistant, Antigravity CLI and gemini-3.8-flash-medium reproduced this with c1c04e; Activity selected, shell snapshot empty, native DOM loaded with zero viewport. Diagnostic explicit focus attached SAME tab and produced rendered content. That is pre-fix causal evidence, not validation of changed code.

## Completed design / scope
Correct the producer, not the UI. In AgyStreamEventConverter.tool() success emission only, recognize `mcpCall?.toolName === OPEN_TAB_TOOL_NAME` and emit the existing shared normalizeBrowserMcpToolResult(OPEN_TAB_TOOL_NAME, output) as result. Keep event-level provider_state and identities/order intact. Do NOT pass the AGY wrapper to the normalizer. Do NOT unwrap all tools, match third-party suffixes, alter image/error/background handling or add frontend fallback. Existing browser IPC/window lease/bounds logic remains unchanged. Other runtimes and remote/unavailable suppression are preserved.
Design identifies exact paths, sequence, sample shape, exclusions and required tests. Persistence readers accept opaque tool results; old nested traces remain usable. No migration, history rewriting, session/cookie reset or automatic attachment of historic sessions.

## Classification evidence / escalation
One local converter branch plus reuse of established browser normalizer/constant; unit and transport fixture/tests, docs. This restores existing contract; no new external API/schema/security/concurrency/window ownership/deployment mechanism. Size Small, risk Low. If implementation requires wider normalization policy, window/run mapping, recovery/global adoption, shared normalizer changes, migration or changes to other tool semantics, return to Solution Designer; do not silently expand direct route.

## Workspace / base / finalization
- Isolated task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation`
- Branch: codex/embedded-browser-open-tab-investigation
- Base: origin/personal at 5e3cb2f720e6fc80173099075daf55594ed58de9, fetched before original creation.
- Finalization target: origin/personal via Delivery Engineer gates. No immediate push/release or production app update performed/authorized by this handoff.
- State: only ticket documents/evidence authored; production source/tests unchanged. Artifacts are persisted but currently uncommitted in isolated worktree; do not assume a package commit exists.
- Repository instructions: web/server AGENTS.md, root TESTING.md; skill files are under original workspace-superrepo/.codex/skills (not tracked into this worktree).

## Validation and expected output
Implementation Engineer owns source/self-checks and implementation handoff. Use existing AGY converter and MCP transport suites; add producer canonical open_tab coverage, error/denial/native/third-party/non-browser preservation, opaque history continuity. Existing renderer canonical and remote guard suites remain. Keep server imports out of web tests. Downstream executable validation must include real AGY Daily Assistant in **corrected worktree-built isolated desktop**, proving automatic Browser selection, matching returned tab in shell snapshot, native content/positive viewport—without manual focus or result injection. Repeat from Activity; record evidence. Original installed-app probe was valid for baseline only, not changed-code validation. Stop only test instances started by this task; never operate user's running app/data as test target.

## Open risks / non-goals
No claim all historical intermittent failures share this cause. F-002 store error propagation and missing-assignment recovery are separately documented, not approved implementation scope. Do not invent tab_id on missing/malformed provider output. No UI redesign, global session discovery, retries, tool-success visibility acknowledgement policy, browser rewrite, remote pairing, or CAPTCHA/auth changes. No material unresolved blocker for the narrow valid-output correction.

## Canonical artifacts (absolute paths)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/investigation-result.md` (historical results; superseded current status clearly marked)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/solution-handoff.md` (this full current result)
- Independent architecture review: **N/A — not applicable** unless returned rules select it; no prior review claimed.
- Independent code review, implementation/API-E2E/delivery artifacts: **N/A — not applicable yet**; future owners produce them.
- External Product/UI/UX supplements: **N/A — not applicable**.

## Supporting evidence inventory
All evidence-only; original source screenshot/incident paths recorded in investigation notes. This inventory includes original diagnostic failures and controls; do not rewrite them to appear green for the future implementation.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/connection-audit.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/deep-connection-probe.cjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/deep-connection-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/after-focus-state.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/after-open-state.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/agy-open-success-no-browser.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/assert-desktop.cjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/assertions.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/cleanup.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/desktop-reproduction.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/explicit-focus-control.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/instance.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/manual-browser-empty.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/native-page-after-focus.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/native-page-after-focus.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/native-page-before-focus.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/run-metadata.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/tabs-after-open.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/desktop/test-run-traces.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/incident-events.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/installed-code-check.txt`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-probe.cjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/replay-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/third-open-and-list-events.json`

## Routing
Rules queried after completed design. Selected rule: Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low. Exact recipient `/implementation_engineer`; direct implementation route (skips independent architecture review, not design, implementation self-checks, API/E2E or delivery gates). Other rules do not match. Handoff transmission follows this persisted decision.
