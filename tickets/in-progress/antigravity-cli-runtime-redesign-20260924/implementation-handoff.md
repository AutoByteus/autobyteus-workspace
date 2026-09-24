# Implementation Handoff — AGY CLI runtime redesign

## Upstream Artifact Package

- Independent architecture review applies: `design-review-report.md` ARCH-REV-003 **Pass** on user-approved SR-021, after ARCH-REV-002/SR-019. Handoff-rule lookup remains the routing authority; this package requests source review, not implementation acceptance.
- Authorities: `requirements-doc.md` (REQ-001–011, AC-001–010); `investigation-notes.md`; `solution-revision-record.md` (SR-016, SR-019, SR-021); `design-spec.md`; `investigation-result.md`; `architecture-review-revision-record.md`.
- Supplements/evidence: `agy-cli-experiment-report.md`, `agy-tool-event-capture-analysis.md` and capture directory, workspace/capsule/MCP/toolset/skill probe scripts and result directories, `agy-command-outcome-matrix-probe.py` and result directory, `implementation-local-live-probe.json`, `implementation-local-mcp-team-live.json`, `implementation-local-mcp-org-live.json`, `implementation-local-skill-live.json`. Provider controls are not product integration or E2E sign-off.
- Triggering evidence: IR-001 Requirement Gap, user screenshot of gray AGY command and `AGENT_SEGMENT_LIFECYCLE_INVALID`, ARCH-REV-003 reviewed status decision, and Code Reviewer `code-review-report.md` / `code-review-revision-record.md` CRR-001 Fail — Local Fix (CR-001/002).

## Current Implementation Summary

The AGY 1.2.10 runtime is registered and production-generated through the existing run, identity, MCP, stream, trace, and UI owners. SR-021 maps AGY tool `DONE` without explicit error to canonical `TOOL_EXECUTION_SUCCEEDED` (green), preserving `provider_state: "DONE"` and output without inventing a shell exit code. Explicit error/denial wins over `DONE` and overall turn `SUCCESS`. The unmerged IR-001 AGY-only neutral `TOOL_EXECUTION_COMPLETED` / `completed_unverified` contract and UI path were removed across server, shared DTOs, trace, hydration, and web. The separate canonical segment-lifecycle fix from IR-001 was freshly observed in a live rendered run without the error banner. IR-003 corrects the two CRR-001 Org launch edits: Team and Agent AGY selection default auto-execute on, while a later explicit off remains off through the real editor's synchronous runtime/model/config event batch.

- Cycle: Rework; current revision **IR-003** in `implementation-revision-record.md`.
- Related revisions: SR-016/019/021; ARCH-REV-001/002/003; CRR-001; API-REV/DR **N/A**.
- Trigger: CRR-001 findings CR-001/002 on Org Team default-on and Org Agent explicit-off; prior REQ-011/AC-010 green convention and lifecycle fix remain in force.
- Current result: bounded local fixes ready for **independent source re-review**, subject to routing rules. CRR-001 failed the prior revision; no Code Review pass, API/E2E, delivery, or user-acceptance sign-off is claimed.

## Routing Classification

- Task size: **Large**. Architectural risk: **High**. Source: `design-spec.md` §Task Size And Architectural Risk.
- Classification: **Confirmed**. Implementation still spans provider protocol, run identity/restore, scoped MCP, persisted trace, shared contracts, frontend and trust boundary. No evidence to downgrade.
- Selected route: independent Code Review, if returned by `get_handoff_rules`. Direct-route lightweight self-review: Not Applicable.
- New design impact/escalation: None. SR-021 explicitly approves the otherwise ambiguous green convention.

## Reviewed Behavior Implementation Trace

| Behavior | Approved outcome | Implemented production path / result |
| --- | --- | --- |
| BEH-001 / REQ-001 | Select available AGY and dynamic model | Runtime capability, model catalog, backend factory and launch fields; implemented and locally checked. |
| BEH-002 / REQ-002 | Generated custom main agent/toolset | Shared identity composition into durable capsule main agent before CLI init; live custom-agent/toolset probe passed. |
| BEH-003 / REQ-003–004 | Exact early ID and restore | AGY process `init` bound to run metadata; saved snapshot/capsule and exact provider ID comparison before input; local create/restore/mismatch checks passed. |
| BEH-004 / REQ-007–008/010 | AGY-only auto-execute default and explicit-off denial | Launch draft policy to effective CLI permission flag; Org Team/Agent store transitions and nested editor's synchronous selection batch now retain AGY default-on and preserve later explicit-off, including effective child scope; explicit-off live tool denial stayed non-green; other runtime policy unchanged. |
| BEH-005 / REQ-005 | Run capsule and selected real workspace | Distinct run capsules; real workspace persisted and passed via `--add-dir`; minimal two-line main-agent task-root statement; local file/shell target, concurrent/collision checks passed. This is model-directed targeting, not filesystem isolation. |
| BEH-006 / REQ-009/011 | Canonical tool/assistant trace, green `DONE`, red failure/denial, reload | `agy-stream-event-converter.ts` → canonical recorder/trace → historical projection/hydration → chat and Activity cards. Live exit-0, exit-8, command-not-found all green; source `DONE` and output retained; denial non-green; segment lifecycle healthy. |
| SCN-005 / REQ-006 | Existing runtimes preserved | AGY-specific activation/policy; representative Codex/Claude/AutoByteus manager, trace, status and UI regression tests passed. |

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/backends/antigravity/` — process, capsule and NDJSON converter.
- Server run manager/runtime capability/MCP and `agent-memory` / `run-history` — authoritative binding, scoped tools, canonical traces and replay.
- `autobyteus-agent-presentation-contracts` and `autobyteus-team-stream-contracts` — canonical and team stream DTOs; neutral event removed.
- `autobyteus-web` launch policy, `agentOrgRunConfigStore.ts`, `TeamScopeConfigEditor.vue`, streaming handlers, hydration, `ToolCallIndicator.vue` and `ToolActivityItem.vue` — AGY selection, Org member overrides and live/reloaded tool presentation.

## Important Assumptions And Known Risks

- Green means AGY **provider tool step `DONE`**, not verified shell success. Exit 8 and command-not-found are green under the approved convention because AGY reports `DONE` without a structured shell exit. Exposed output remains available; no exit 0 is fabricated.
- The provider's selected-workspace behavior is model-directed, not a static sandbox. `NONE` configured skills does not suppress user/provider skill discovery. AGY-native subagents are out of scope.
- AGY 1.2.10 is the tested provider version; other versions/tool kinds and user environments require independent validation.
- The last narrow denial replay refinement (persisting AGY `provider_state` on denied tool results and restoring a denied label) passed focused tests, but browser automation became unavailable before a second *new* denied run could be rendered after that refinement. The earlier live denial was rendered DENIED and its older pre-refinement trace reloaded as FAILED (still non-green). This UI parity state is a residual verification item for Code Review/API-E2E, not represented as visually confirmed.
- The existing opt-in `agy-mcp-team-live.test.ts` verifies an AGY scoped MCP call with stubbed team-message delivery; it does **not** provide the full real Team GraphQL/WebSocket inter-agent roundtrip coverage that Codex and Claude have. That coverage remains a required downstream API/E2E gate, not an implementation-local pass.

## Task Design Health Assessment Implementation Check

- Reviewed posture/root cause/refactor decision: feature/larger requirement; boundary/ownership integration risk; bounded **Refactor Needed Now**.
- Matched: **Yes**. Existing manager, identity, MCP, event and trace owners remain authoritative; no new bypass or second trace store. Design Impact: **N/A**.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: **None**. Legacy old behavior retained: **No**.
- Neutral IR-001 event/status/DTO/trace/web branches and tests were removed; repository search found no remaining canonical `TOOL_EXECUTION_COMPLETED` or `completed_unverified` producer/consumer. Codex's unrelated `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` notification remains intentionally.
- Shared structures stayed tight. Changed source implementation files are at or below 500 effective non-empty lines; no >220-line source delta was introduced in IR-003. `git diff --check` passed.

## Persisted Data Transition Check

- Existing run metadata/traces: **Directly Usable — No Migration**, per design spec; current generic reader and stored identity shape retained.
- One **local development-only** IR-001 neutral trace was audited: `daily_assistant_b421bebb5fa045c1b737d1565a45a43b/raw_traces_active.jsonl`, sequence 3, `TOOL_EXECUTION_COMPLETED` with `completed_unverified` and output `AGY-UI-MARKER-8492`. No released AGY record population exists; no production migration or version-specific reader was added. That old local test artifact is not evidence of current behavior.
- Deviation: None.

## Environment Or Dependency Notes

- Worktree branch: `codex/antigravity-cli-runtime-redesign-20260924`. Dev preview uses `pnpm dev`, backend `127.0.0.1:8000`, web `127.0.0.1:3000`; a separate full server build passed after final source changes. Live checks used the local development data root only; the preview was stopped cleanly.

## Local Implementation Checks Run

- Server: focused AGY converter/capsule, run-manager, trace-sequencer and replay suites **57 passed, 5 live tests skipped by default**; server build TypeScript check and full server build passed. Converter fixture matrix covers exit 0, exit 8, command-not-found, ERROR denial and explicit error even if DONE. Denial replay writer/server projection tests cover AGY ERROR/DONE marker, exposed output and unchanged generic error mapping.
- Web: focused launch policy, tool card/Activity, streaming lifecycle and hydration suites **59 passed**; previous focused UI/launch suites also passed. Web `vue-tsc` is not available as an executable; no full web typecheck claim.
- IR-003 Web: focused Org store/effective projection, real component event-batch, mounted panel, shared Team editor and non-AGY Team launch/form suites **79/79 passed** across nine files. This includes Team/Agent AGY select-then-off regressions. The intentional error-path tests logged expected rejection messages. `git diff --check` and changed-source size audit passed.
- Prior IR-001 local production-path evidence files (above) cover generated custom agent/toolset, real workspace file/shell targeting, exact restore, scoped AutoByteus team/org MCP calls, configured `PRELOADED_ONLY`/`NONE` and user-owned skill collision. These are implementation probes, not downstream API/E2E sign-off.
- Current live run `daily_assistant_09fba2c5cd2e4093bbf7f992157b144b`: raw trace tool-result sequences 3/5/7 are `TOOL_EXECUTION_SUCCEEDED`, with `provider_state: DONE` and output respectively `AGY-EXIT0-LIVE`, null (exit 8), and visible command-not-found text. No exit field. The live and reloaded chat/Activity showed three green SUCCESS cards and no lifecycle error banner. Explicit-off run `daily_assistant_b41a98b435ce40b7a1af410851d32b0c` emitted `TOOL_DENIED` despite overall turn success; live DENIED and pre-refinement reload FAILED, both non-green.
- `git diff --check` and changed-source-size audit passed. No independent review or acceptance is inferred.

## Frontend Rendered-Result Check

- Affected journey: workspace agent run chat, tool card, Activity/Event Monitor, reload, AGY launch auto-execute switch. Reviewed adjacent other-runtime green tool presentation and existing shared components; no separate Product Design supplement.
- The project-supported browser preview at `127.0.0.1:3000/workspace` was directly exercised. Exit-0/exit-8/command-not-found live and reloaded cards were green SUCCESS; command-not-found result text remained readable. The earlier canonical lifecycle error did not reappear and assistant response rendered. Explicit-off denial displayed non-green live and after reload. No layout/label issue observed in the green cards.
- Limitation: browser connection ceased functioning after the final denial replay-label refinement, so a second fresh denial rendering against that exact final code was not inspected. Unit-level trace/hydration projection passed; downstream validation should check the final denied label visually. Browser self-check is not E2E sign-off.
- IR-003 fresh Org editor inspection used the project-supported local browser preview: selecting AGY for an Org Team with root off showed Team auto-execute on; toggling it off retained AGY and showed off. Selecting AGY for a direct Org Agent showed on; toggling it off and collapsing/reopening retained off. Root remained off, and the nested editor layout was visually consistent. This inspected draft presentation, not a launched Org or downstream E2E result.

## Downstream Coverage Hints / Suggested Scenarios

- Independently verify generated custom main agent/toolset, real workspace relative file and shell targets, exact saved-ID restore/mismatch, scoped MCP team/org attribution, skill `PRELOADED_ONLY`/`NONE` and collision control, AGY-only auto-execute and non-AGY regressions.
- In the live/reloaded Event Monitor and raw traces, check exit 0, exit 8, command-not-found and explicit-off denial. Preserve `DONE`/output, never synthesize shell exit zero; confirm final denied label and no `AGENT_SEGMENT_LIFECYCLE_INVALID`.
- Per the user's explicit parity request, author and execute an AGY **real Team inter-agent roundtrip** test comparable to `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` and `claude-team-inter-agent-roundtrip.e2e.test.ts`: real Team launch over GraphQL/WebSocket, AGY scoped tool call delivered to a real member (not stub delivery), return stream/trace and exact member attribution, plus restore/continuation and permission/off cases as applicable. Assess Org execution coverage and non-AGY regression alongside it. The existing opt-in scoped-MCP team probe is insufficient for this parity gate.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent Code Review and API/E2E validation remain required. Provider controls and implementation-local checks do not satisfy those gates.
