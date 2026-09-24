# Implementation Handoff — AGY CLI runtime redesign

## Upstream Artifact Package

- Independent architecture review applies: `design-review-report.md` ARCH-REV-003 **Pass** on user-approved SR-021, after ARCH-REV-002/SR-019. Handoff-rule lookup remains the routing authority; this package requests source review, not implementation acceptance.
- Authorities: `requirements-doc.md` (REQ-001–011, AC-001–010); `investigation-notes.md`; `solution-revision-record.md` (SR-016, SR-019, SR-021); `design-spec.md`; `investigation-result.md`; `architecture-review-revision-record.md`.
- Supplements/evidence: `agy-cli-experiment-report.md`, `agy-tool-event-capture-analysis.md` and capture directory, workspace/capsule/MCP/toolset/skill probe scripts and result directories, `agy-command-outcome-matrix-probe.py` and result directory, `implementation-local-live-probe.json`, `implementation-local-mcp-team-live.json`, `implementation-local-mcp-org-live.json`, `implementation-local-skill-live.json`. Provider controls are not product integration or E2E sign-off.
- Triggering evidence: IR-001 Requirement Gap, user screenshot of gray AGY command and `AGENT_SEGMENT_LIFECYCLE_INVALID`, ARCH-REV-003 reviewed status decision, prior CRR/API-REV history, and API-REV-003 public Org projection failure / Code Reviewer CRR-007 finding CR-005. API/E2E's coverage report, revision record, ledger, real Team/Org test, `api-e2e-round3-live-evidence.json` and `/tmp/agy-api-r3-{full-final,org-projection-spy,org-http-diag}.log` are attached to the rework package.

## Current Implementation Summary

The AGY 1.2.10 runtime is registered and production-generated through the existing run, identity, MCP, stream, trace, and UI owners. SR-021 maps AGY tool `DONE` without explicit error to canonical `TOOL_EXECUTION_SUCCEEDED` (green), preserving `provider_state: "DONE"` and output without inventing a shell exit code. Explicit error/denial wins over `DONE` and overall turn `SUCCESS`. The unmerged IR-001 AGY-only neutral `TOOL_EXECUTION_COMPLETED` / `completed_unverified` contract and UI path were removed. IR-003 corrected Org member permission edits. IR-004 admitted AGY through current Team/Org run-tree validation; API-REV-002 then passed real AGY Team ping→pong and exact Team restore/continuation. IR-005 admitted AGY through the native Org stream DTO; API-REV-003 then passed real direct/nested AGY Org turns and scoped director→worker delivery. IR-006 fixes the next public view boundary: repeated full TypeGraphQL schema builds append global resolver parameter metadata and shift Org projection identities; the server schema builder now reuses one schema promise. Independent Org projection/trace rerun remains required.

- Cycle: Rework; current revision **IR-006** in `implementation-revision-record.md`.
- Related revisions: SR-016/019/021; ARCH-REV-001/002/003; CRR-001–007; API-REV-001/002/003; DR **N/A**.
- Trigger: API-F-003 / CR-005: public GraphQL projection for a real Org member passed shifted `(orgRunId, orgRunId, memberAddress)` identities despite distinct query values. CR-001–004 remain resolved; prior REQ-011/AC-010 green convention remains in force.
- Current result: bounded shared GraphQL schema-build correction ready for **independent source re-review**, subject to routing rules. API-REV-003 confirmed real Team and Org execution/delivery but did not pass Org public projection/reload. No API/E2E overall pass, delivery, or user-acceptance sign-off is claimed.

## Routing Classification

- Task size: **Large**. Architectural risk: **High**. Source: `design-spec.md` §Task Size And Architectural Risk.
- Classification: **Confirmed**. Implementation still spans provider protocol, run identity/restore, scoped MCP, persisted trace, shared contracts, frontend and trust boundary. No evidence to downgrade.
- Selected route: independent Code Review, if returned by `get_handoff_rules`. Direct-route lightweight self-review: Not Applicable.
- New design impact/escalation: None. SR-021 explicitly approves the otherwise ambiguous green convention.

## Reviewed Behavior Implementation Trace

| Behavior | Approved outcome | Implemented production path / result |
| --- | --- | --- |
| BEH-001 / REQ-001 | Select available AGY and dynamic model | Runtime capability, model catalog, backend factory and launch fields; implemented and locally checked. |
| BEH-002 / REQ-002 | Generated custom main agent/toolset, including real Team/Org launch | Shared identity composition into durable capsule main agent before CLI init; live custom-agent/toolset probe passed. IR-004 admits AGY through current Team/Org trees. API-REV-002 passed real Team scoped member ping→pong and exact restore/continuation; Org GraphQL launch passed but its stream/member delivery awaits rerun after IR-005. |
| BEH-003 / REQ-003–004 | Exact early ID and restore | AGY process `init` bound to run metadata; saved snapshot/capsule and exact provider ID comparison before input; local create/restore/mismatch checks passed. |
| BEH-004 / REQ-007–008/010 | AGY-only auto-execute default and explicit-off denial | Launch draft policy to effective CLI permission flag; Org Team/Agent store transitions and nested editor's synchronous selection batch now retain AGY default-on and preserve later explicit-off, including effective child scope; explicit-off live tool denial stayed non-green; other runtime policy unchanged. |
| BEH-005 / REQ-005 | Run capsule and selected real workspace | Distinct run capsules; real workspace persisted and passed via `--add-dir`; minimal two-line main-agent task-root statement; local file/shell target, concurrent/collision checks passed. This is model-directed targeting, not filesystem isolation. |
| BEH-006 / REQ-009/011 | Canonical tool/assistant trace, green `DONE`, red failure/denial, reload | `agy-stream-event-converter.ts` → canonical recorder/trace → historical projection/hydration → chat and Activity cards. Live exit-0, exit-8, command-not-found all green; source `DONE` and output retained; denial non-green; segment lifecycle healthy. IR-005 admits AGY Org snapshot values; API-REV-003 passed real Org turns/delivery but public projection failed. IR-006 reuses the full GraphQL schema to prevent parameter-metadata duplication; local distinct-ID projection/trace-page queries pass, with real API/E2E reload pending. |
| SCN-005 / REQ-006 | Existing runtimes preserved | AGY-specific activation/policy; representative Codex/Claude/AutoByteus manager, trace, status and UI regression tests passed. |

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/backends/antigravity/` — process, capsule and NDJSON converter.
- Server run manager/runtime capability/MCP and `agent-memory` / `run-history` — authoritative binding, scoped tools, current Team/Org execution-tree validation, canonical traces and replay.
- `autobyteus-server-ts/src/api/graphql/schema.ts` — one process-wide schema build; avoids TypeGraphQL 2.0.0-rc.3 global parameter-metadata duplication that shifted public Org member query identities when the schema was built twice.
- `autobyteus-agent-presentation-contracts`, `autobyteus-team-stream-contracts` and `autobyteus-collaboration-stream-contracts` — canonical, Team and native Org stream DTOs; neutral event removed and AGY Org snapshot kind admitted.
- `autobyteus-web` launch policy, `agentOrgRunConfigStore.ts`, `TeamScopeConfigEditor.vue`, streaming handlers, hydration, `ToolCallIndicator.vue` and `ToolActivityItem.vue` — AGY selection, Org member overrides and live/reloaded tool presentation.

## Important Assumptions And Known Risks

- Green means AGY **provider tool step `DONE`**, not verified shell success. Exit 8 and command-not-found are green under the approved convention because AGY reports `DONE` without a structured shell exit. Exposed output remains available; no exit 0 is fabricated.
- The provider's selected-workspace behavior is model-directed, not a static sandbox. `NONE` configured skills does not suppress user/provider skill discovery. AGY-native subagents are out of scope.
- AGY 1.2.10 is the tested provider version; other versions/tool kinds and user environments require independent validation.
- API-REV-001 confirmed final-code explicit-off denial **DENIED** live/reloaded and DONE green with source output/no invented exit. API-REV-002/003 passed real AGY Team GraphQL/WebSocket member ping→pong, exact Team restore/continuation, real direct/nested Org turns and scoped recipient delivery; these bounded results do not compensate for the real Org public projection/reload failure or constitute overall API/E2E acceptance.
- The older opt-in `agy-mcp-team-live.test.ts` has stub delivery and is not parity evidence; API-REV-002/003 real Team/Org tests are. Real Org public projection/trace and reload remain unproven until post-IR-006 E2E rerun.

## Task Design Health Assessment Implementation Check

- Reviewed posture/root cause/refactor decision: feature/larger requirement; boundary/ownership integration risk; bounded **Refactor Needed Now**.
- Matched: **Yes**. Existing manager, identity, MCP, event and trace owners remain authoritative; no new bypass or second trace store. Design Impact: **N/A**.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: **None**. Legacy old behavior retained: **No**.
- Neutral IR-001 event/status/DTO/trace/web branches and tests were removed; repository search found no remaining canonical `TOOL_EXECUTION_COMPLETED` or `completed_unverified` producer/consumer. Codex's unrelated `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` notification remains intentionally.
- Shared structures stayed tight. IR-006's changed schema source is 89 effective non-empty lines with a 9-line diff; no >220-line source delta. `git diff --check` passed. Prior IR-005 checked-in collaboration contract dist artifacts match source.

## Persisted Data Transition Check

- Existing run metadata/traces: **Directly Usable — No Migration**, per design spec; current generic reader and stored identity shape retained.
- One **local development-only** IR-001 neutral trace was audited: `daily_assistant_b421bebb5fa045c1b737d1565a45a43b/raw_traces_active.jsonl`, sequence 3, `TOOL_EXECUTION_COMPLETED` with `completed_unverified` and output `AGY-UI-MARKER-8492`. No released AGY record population exists; no production migration or version-specific reader was added. That old local test artifact is not evidence of current behavior.
- IR-004 assessment: the released-Team-V2 migration-only decoder imports the shared launch validator. Its historical shape and migration mechanics are unchanged; this correction only widens the generic runtime admission to the newly supported enum value, with no old AGY population or reason to migrate. The separate V1 migration decoder retains its historical uppercase-kind policy. Deviation: None.
- IR-005 changes a current stream DTO runtime value set only. Existing persisted Team/Org records are unchanged and no migration or historical fallback is indicated.
- IR-006 changes only in-process GraphQL schema construction; stored data, readers and transition policy are unchanged. No migration.

## Environment Or Dependency Notes

- Worktree branch: `codex/antigravity-cli-runtime-redesign-20260924`. Dev preview uses `pnpm dev`, backend `127.0.0.1:8000`, web `127.0.0.1:3000`. A full server build passed in an earlier runtime implementation round; IR-006 passed server production TypeScript check after shared-package preparation. Prior live checks used the local development data root only; the preview was stopped cleanly.

## Local Implementation Checks Run

- Server: focused AGY converter/capsule, run-manager, trace-sequencer and replay suites **57 passed, 5 live tests skipped by default**; server build TypeScript check and full server build passed. Converter fixture matrix covers exit 0, exit 8, command-not-found, ERROR denial and explicit error even if DONE. Denial replay writer/server projection tests cover AGY ERROR/DONE marker, exposed output and unchanged generic error mapping.
- Web: focused launch policy, tool card/Activity, streaming lifecycle and hydration suites **59 passed**; previous focused UI/launch suites also passed. Web `vue-tsc` is not available as an executable; no full web typecheck claim.
- IR-003 Web: focused Org store/effective projection, real component event-batch, mounted panel, shared Team editor and non-AGY Team launch/form suites **79/79 passed** across nine files. This includes Team/Agent AGY select-then-off regressions. The intentional error-path tests logged expected rejection messages. `git diff --check` and changed-source size audit passed.
- IR-004 Server: current Team/Org execution-tree admission and existing Team package tests **6/6 passed**; migration-only flat-family suite **16/16 passed**; server production `tsc -p tsconfig.build.json --noEmit` passed after `prepare:shared`. An additional broader historical-candidate safety suite had **8/11 failures** in its independent old-table token fixture because Prisma now expects `claude_sdk_usage_state_json`; this fixture-schema drift is not in the changed validator and is not claimed as passing. The standard all-tests TypeScript config also reports pre-existing rootDir/out-of-tree errors; the production build config passed.
- IR-005: `pnpm -C autobyteus-collaboration-stream-contracts test` rebuilt the checked-in contract and passed **8/8**, including root/direct/nested AGY snapshot, unknown-kind rejection at each scope and preservation of AutoByteus/Claude/Codex. Focused `AgentOrgStreamHandler` tests passed **11/11**, including an AGY root/direct/nested native `CONNECTED`→`ROOT_EXECUTION_VIEW_SNAPSHOT`→`ROOT_LIFECYCLE` projection. Server production TypeScript check passed after shared-package build. These are local implementation checks, not an Org E2E pass.
- IR-006: reproduced API-F-003 in a full-schema distinct-ID unit query: a second `buildGraphqlSchema()` shifted the projection service call from `(org-123, /director, agent-456)` to `(org-123, org-123, /director)`. After reusing the first schema promise, the same full-schema projection and adjacent trace-page query pass with exact distinct identities and cursor. Focused Org, Team and definition-catalog GraphQL suites passed **9/9**; production `tsc -p tsconfig.build.json --noEmit` passed after `prepare:shared`; `git diff --check` passed. The generic `tsconfig.json` noEmit command retains pre-existing test-outside-rootDir TS6059 errors and is not reported as passing. These are local checks, not HTTP/real Org API/E2E acceptance.
- Prior IR-001 local production-path evidence files (above) cover generated custom agent/toolset, real workspace file/shell targeting, exact restore, scoped AutoByteus team/org MCP calls, configured `PRELOADED_ONLY`/`NONE` and user-owned skill collision. These are implementation probes, not downstream API/E2E sign-off.
- Current live run `daily_assistant_09fba2c5cd2e4093bbf7f992157b144b`: raw trace tool-result sequences 3/5/7 are `TOOL_EXECUTION_SUCCEEDED`, with `provider_state: DONE` and output respectively `AGY-EXIT0-LIVE`, null (exit 8), and visible command-not-found text. No exit field. The live and reloaded chat/Activity showed three green SUCCESS cards and no lifecycle error banner. Explicit-off run `daily_assistant_b41a98b435ce40b7a1af410851d32b0c` emitted `TOOL_DENIED` despite overall turn success; live DENIED and pre-refinement reload FAILED, both non-green.
- `git diff --check` and changed-source-size audit passed. No independent review or acceptance is inferred.

## Frontend Rendered-Result Check

- IR-006: **Not Applicable** to the current server-only schema-builder and unit-test change; no rendered frontend changed in this round. Prior IR-002/003 and API-REV-001 visual evidence follows for continuity, not new IR-006 E2E sign-off.
- Affected journey: workspace agent run chat, tool card, Activity/Event Monitor, reload, AGY launch auto-execute switch. Reviewed adjacent other-runtime green tool presentation and existing shared components; no separate Product Design supplement.
- The project-supported browser preview at `127.0.0.1:3000/workspace` was directly exercised. Exit-0/exit-8/command-not-found live and reloaded cards were green SUCCESS; command-not-found result text remained readable. The earlier canonical lifecycle error did not reappear and assistant response rendered. Explicit-off denial displayed non-green live and after reload. No layout/label issue observed in the green cards.
- Subsequent API-REV-001 browser evidence closed that prior limitation: final-code fresh denial rendered **DENIED** both live and after reload. This independent bounded evidence is not full API/E2E acceptance.
- IR-003 fresh Org editor inspection used the project-supported local browser preview: selecting AGY for an Org Team with root off showed Team auto-execute on; toggling it off retained AGY and showed off. Selecting AGY for a direct Org Agent showed on; toggling it off and collapsing/reopening retained off. Root remained off, and the nested editor layout was visually consistent. This inspected draft presentation, not a launched Org or downstream E2E result.

## Downstream Coverage Hints / Suggested Scenarios

- Independently verify generated custom main agent/toolset, real workspace relative file and shell targets, exact saved-ID restore/mismatch, scoped MCP team/org attribution, skill `PRELOADED_ONLY`/`NONE` and collision control, AGY-only auto-execute and non-AGY regressions.
- In the live/reloaded Event Monitor and raw traces, check exit 0, exit 8, command-not-found and explicit-off denial. Preserve `DONE`/output, never synthesize shell exit zero; confirm final denied label and no `AGENT_SEGMENT_LIFECYCLE_INVALID`.
- The user's real Team parity request now has API-REV-002/003 direct evidence: AGY member ping→pong scoped MCP delivery, exact attribution/persisted projection and Team terminate/restore/continuation passed, with no stub delivery. API-REV-003 also proved direct/nested Org native turns and scoped delivery. The remaining critical Org gate is public GraphQL projection/trace-page and reload, not scoped delivery.
- After source re-review, rerun **AGY-05 Org public projection/trace first** against the single-build schema, then full real Team+Org and focused non-AGY checks. Verify both direct/nested exact GraphQL member identities and persisted conversation/activity/Event Monitor reload; do not substitute direct service calls or older Org MCP stub probes.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent Code Review and API/E2E validation remain required. Provider controls and implementation-local checks do not satisfy those gates.
