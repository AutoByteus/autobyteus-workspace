# Implementation Handoff — AGY CLI runtime redesign

## Upstream Artifact Package

- Independent architecture review applies: `design-review-report.md` ARCH-REV-004 **Pass** on SR-023 technical correction; approved intended behavior remains SR-016 plus user-approved SR-021. Handoff-rule lookup remains the routing authority; this package requests renewed source review, not implementation acceptance.
- Authorities: `requirements-doc.md` (REQ-001–011, AC-001–010); `investigation-notes.md`; `solution-revision-record.md` (SR-016/019/021/023); `design-spec.md` DS-005; `investigation-result.md`; `design-review-report.md`; `architecture-review-revision-record.md`; `solution-org-launch-recovery-handoff.md`.
- Supplements/evidence: `agy-cli-experiment-report.md`, `agy-tool-event-capture-analysis.md` and capture directory, workspace/capsule/MCP/toolset/skill probe scripts and result directories, `agy-command-outcome-matrix-probe.py` and result directory, `implementation-local-live-probe.json`, `implementation-local-mcp-team-live.json`, `implementation-local-mcp-org-live.json`, `implementation-local-skill-live.json`. Provider controls are not product integration or E2E sign-off.
- Triggering evidence: the user's packaged Electron 18-placement Org launch/health-timeout screenshot; read-only original/test persisted trees; Solution Designer's browser reproduction against the packaged backend and catalog/health overlap control; `solution-org-launch-recovery-handoff.md` and ARCH-REV-004. Earlier CRR-009 source, API-REV-006 96% and CRR-012 test passes are prior-basis evidence only; `handoff-summary.md`/`delivery-revision-record.md` preserve Delivery's explicit user-verification hold.

## Current Implementation Summary

The AGY 1.2.10 runtime is registered and production-generated through the existing run, identity, MCP, stream, trace, and UI owners. SR-021 maps AGY tool `DONE` without explicit error to canonical `TOOL_EXECUTION_SUCCEEDED` (green), preserving `provider_state: "DONE"` and output without inventing a shell exit code. Explicit error/denial wins over `DONE` and overall turn `SUCCESS`. The unmerged IR-001 AGY-only neutral `TOOL_EXECUTION_COMPLETED` / `completed_unverified` contract and UI path were removed. IR-003 corrected Org member permission edits. IR-004 admitted AGY through current Team/Org run-tree validation; API-REV-002 then passed real AGY Team ping→pong and exact Team restore/continuation. IR-005 admitted AGY through the native Org stream DTO; API-REV-003 then passed real direct/nested AGY Org turns and scoped director→worker delivery. IR-006 diagnosed repeated full TypeGraphQL schema builds in the API/E2E fixture but added an unsupported process-wide production cache. IR-007 removed that cache; CRR-009, API-REV-006 and CRR-012 subsequently passed the earlier source/test basis, including real browser Team/Org restart and continuation. IR-008 implements SR-023 DS-005: Org creation validates every ordered placement in one request-local batch, and AGY version/help/models discovery runs as bounded asynchronous child I/O with safe typed failure messages. This correction is not a new UX, permission, identity, MCP, skill or trace contract.

- Cycle: Rework; current revision **IR-008** in `implementation-revision-record.md`.
- Related revisions: SR-016/019/021/023; ARCH-REV-001–004; CRR-001–012 (CRR-009 source, CRR-012 test pass on prior basis); API-REV-001–006 (API-REV-006 pass on prior basis); DR-001 user-verification hold.
- Trigger: SR-023 / ARCH-REV-004 DS-005. An 18-placement AGY Org eventually activated but serial synchronous preflight discovery delayed launch and blocked concurrent health in a controlled overlap; the original screenshot does not prove a permanent hang. The reviewed technical correction adds batch validation, nonblocking bounded discovery and safe failure propagation without changing approved intended behavior.
- Current result: SR-023 production correction and implementation-scoped checks complete; ready for **independent source review** under the Large/High route. No post-SR-023 full 18-placement browser/package, rendered failure alert, API/E2E or Delivery/user-verification pass is claimed.

## Routing Classification

- Task size: **Large**. Architectural risk: **High**. Source: `design-spec.md` §Task Size And Architectural Risk.
- Classification: **Confirmed**. Implementation still spans provider protocol, run identity/restore, scoped MCP, persisted trace, shared contracts, frontend and trust boundary. No evidence to downgrade.
- Selected route: independent Code Review, if returned by `get_handoff_rules`. Direct-route lightweight self-review: Not Applicable.
- New design impact/escalation: None. SR-023 DS-005 covers this bounded correction; SR-021 green convention remains unchanged.

## Reviewed Behavior Implementation Trace

| Behavior | Approved outcome | Implemented production path / result |
| --- | --- | --- |
| BEH-001 / REQ-001 | Select available AGY and dynamic model | AGY capability now runs bounded nonblocking version/help/models child probes; catalog, availability/GraphQL/application and factory await the same owner. Typed safe diagnostic passes through model selection to first addressed Org error; a valid catalog missing the slug stays distinct. Focused local checks pass; real browser/package gate pending. |
| BEH-002 / REQ-002 | Generated custom main agent/toolset, including real Team/Org launch | Shared identity composition into durable capsule main agent before CLI init; live custom-agent/toolset probe passed. IR-004 admits AGY through current Team/Org trees. API-REV-002 passed real Team scoped member ping→pong and exact restore/continuation; Prior real Team/Org scoped delivery, exact restore and browser restart/continuation passed on the pre-SR-023 basis; full 18-placement AGY Org is the new downstream gate. |
| BEH-003 / REQ-003–004 | Exact early ID and restore | AGY process `init` bound to run metadata; saved snapshot/capsule and exact provider ID comparison before input; local create/restore/mismatch checks passed. |
| BEH-004 / REQ-007–008/010 | AGY-only auto-execute default and explicit-off denial | Launch draft policy to effective CLI permission flag; Org Team/Agent store transitions and nested editor's synchronous selection batch now retain AGY default-on and preserve later explicit-off, including effective child scope; explicit-off live tool denial stayed non-green; other runtime policy unchanged. |
| BEH-005 / REQ-005 | Run capsule and selected real workspace | Distinct run capsules; real workspace persisted and passed via `--add-dir`; minimal two-line main-agent task-root statement; local file/shell target, concurrent/collision checks passed. This is model-directed targeting, not filesystem isolation. |
| BEH-006 / REQ-009/011 | Canonical tool/assistant trace, green `DONE`, red failure/denial, reload | `agy-stream-event-converter.ts` → canonical recorder/trace → historical projection/hydration → chat and Activity cards. Live exit-0, exit-8, command-not-found all green; source `DONE` and output retained; denial non-green; segment lifecycle healthy. IR-005 admits AGY Org snapshot values; API-REV-003 passed real Org turns/delivery; its projection error was caused by the fixture's second schema build, not an established production defect. IR-007 left the normal production builder unchanged; API-REV-006 later passed real browser Team/Org projection/reload on the prior basis. SR-023 does not change trace behavior; renewed validation follows the modified launch/discovery source. |
| SCN-005 / REQ-006 | Existing runtimes preserved | AGY-specific activation/policy; representative Codex/Claude/AutoByteus manager, trace, status and UI regression tests passed. |

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/backends/antigravity/` — process, capsule and NDJSON converter.
- `agent-org-run-service.ts` / `run-model-selection-service.ts` — ordered complete Org batch preflight, request-local runtime/workspace catalog sharing, first-address safe AGY diagnostic and missing-slug distinction.
- `antigravity-cli-capability.ts` / `antigravity-model-catalog.ts` / `runtime-availability-service.ts` / AGY factory — one bounded asynchronous version/help/models command owner and awaited callers; GraphQL availability and application host await AGY results.
- Server run manager/runtime capability/MCP and `agent-memory` / `run-history` — authoritative binding, scoped tools, current Team/Org execution-tree validation, canonical traces and replay.
- `autobyteus-agent-presentation-contracts`, `autobyteus-team-stream-contracts` and `autobyteus-collaboration-stream-contracts` — canonical, Team and native Org stream DTOs; neutral event removed and AGY Org snapshot kind admitted.
- `autobyteus-web` launch policy, `agentOrgRunConfigStore.ts`, `TeamScopeConfigEditor.vue`, streaming handlers, hydration, `ToolCallIndicator.vue` and `ToolActivityItem.vue` — AGY selection, Org member overrides and live/reloaded tool presentation.

## Important Assumptions And Known Risks

- Green means AGY **provider tool step `DONE`**, not verified shell success. Exit 8 and command-not-found are green under the approved convention because AGY reports `DONE` without a structured shell exit. Exposed output remains available; no exit 0 is fabricated.
- The provider's selected-workspace behavior is model-directed, not a static sandbox. `NONE` configured skills does not suppress user/provider skill discovery. AGY-native subagents are out of scope.
- AGY 1.2.10 is the tested provider version; other versions/tool kinds and user environments require independent validation.
- API-REV-001 confirmed explicit-off denial **DENIED** live/reloaded and DONE green with source output/no invented exit. API-REV-002/003 passed real AGY Team/Org scoped delivery; API-REV-006 later passed browser Team/direct+nested Org persisted-history continuation on the prior source. These bounded earlier passes do not validate the changed SR-023 18-placement launch/discovery path or constitute new API/E2E acceptance.
- The older opt-in `agy-mcp-team-live.test.ts` has stub delivery and is not parity evidence. API-REV-006/CRR-012 closed the earlier browser hydration gap on prior source. SR-023's 18-placement active tree, health responsiveness and visible sanitized failure path are new gates; Delivery remains on explicit user-verification hold.

## Task Design Health Assessment Implementation Check

- Reviewed posture/root cause/refactor decision: feature/larger requirement; boundary/ownership integration risk; bounded **Refactor Needed Now**.
- Matched: **Yes**. Existing manager, identity, MCP, event and trace owners remain authoritative; no new bypass or second trace store. Design Impact: **N/A**.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: **None**. Legacy old behavior retained: **No**.
- Neutral IR-001 event/status/DTO/trace/web branches and tests were removed; repository search found no remaining canonical `TOOL_EXECUTION_COMPLETED` or `completed_unverified` producer/consumer. Codex's unrelated `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` notification remains intentionally.
- Shared structures stayed tight. IR-008 changes existing Org/model/capability/availability/factory owners without new provider-specific Org validator or process-global model cache; all changed source implementation files remain below 500 effective non-empty lines, each with <220 changed lines. `git diff --check` passed. Prior IR-005 collaboration contracts remain unchanged.

## Persisted Data Transition Check

- Existing run metadata/traces: **Directly Usable — No Migration**, per design spec; current generic reader and stored identity shape retained.
- One **local development-only** IR-001 neutral trace was audited: `daily_assistant_b421bebb5fa045c1b737d1565a45a43b/raw_traces_active.jsonl`, sequence 3, `TOOL_EXECUTION_COMPLETED` with `completed_unverified` and output `AGY-UI-MARKER-8492`. No released AGY record population exists; no production migration or version-specific reader was added. That old local test artifact is not evidence of current behavior.
- IR-004 assessment: the released-Team-V2 migration-only decoder imports the shared launch validator. Its historical shape and migration mechanics are unchanged; this correction only widens the generic runtime admission to the newly supported enum value, with no old AGY population or reason to migrate. The separate V1 migration decoder retains its historical uppercase-kind policy. Deviation: None.
- IR-005 changes a current stream DTO runtime value set only. Existing persisted Team/Org records are unchanged and no migration or historical fallback is indicated.
- IR-007 removed IR-006's in-process schema cache. IR-008 changes only in-process discovery/preflight and diagnostic results; stored data, readers and transition policy are unchanged. **Directly Usable — No Migration** remains.

## Environment Or Dependency Notes

- Worktree branch: `codex/antigravity-cli-runtime-redesign-20260924`. Delivery's packaged test backend and user Org are existing data and were not modified. IR-008 production server TypeScript check and full build/bootstrap smoke passed after shared preparation. No new preview or packaged test backend was launched by implementation.

## Local Implementation Checks Run

- Server: focused AGY converter/capsule, run-manager, trace-sequencer and replay suites **57 passed, 5 live tests skipped by default**; server build TypeScript check and full server build passed. Converter fixture matrix covers exit 0, exit 8, command-not-found, ERROR denial and explicit error even if DONE. Denial replay writer/server projection tests cover AGY ERROR/DONE marker, exposed output and unchanged generic error mapping.
- Web: focused launch policy, tool card/Activity, streaming lifecycle and hydration suites **59 passed**; previous focused UI/launch suites also passed. Web `vue-tsc` is not available as an executable; no full web typecheck claim.
- IR-003 Web: focused Org store/effective projection, real component event-batch, mounted panel, shared Team editor and non-AGY Team launch/form suites **79/79 passed** across nine files. This includes Team/Agent AGY select-then-off regressions. The intentional error-path tests logged expected rejection messages. `git diff --check` and changed-source size audit passed.
- IR-004 Server: current Team/Org execution-tree admission and existing Team package tests **6/6 passed**; migration-only flat-family suite **16/16 passed**; server production `tsc -p tsconfig.build.json --noEmit` passed after `prepare:shared`. An additional broader historical-candidate safety suite had **8/11 failures** in its independent old-table token fixture because Prisma now expects `claude_sdk_usage_state_json`; this fixture-schema drift is not in the changed validator and is not claimed as passing. The standard all-tests TypeScript config also reports pre-existing rootDir/out-of-tree errors; the production build config passed.
- IR-005: `pnpm -C autobyteus-collaboration-stream-contracts test` rebuilt the checked-in contract and passed **8/8**, including root/direct/nested AGY snapshot, unknown-kind rejection at each scope and preservation of AutoByteus/Claude/Codex. Focused `AgentOrgStreamHandler` tests passed **11/11**, including an AGY root/direct/nested native `CONNECTED`→`ROOT_EXECUTION_VIEW_SNAPSHOT`→`ROOT_LIFECYCLE` projection. Server production TypeScript check passed after shared-package build. These are local implementation checks, not an Org E2E pass.
- IR-006 diagnosis: a second `buildGraphqlSchema()` in one process shifted the projection service call from `(org-123, /director, agent-456)` to `(org-123, org-123, /director)`; CRR-008 determined this second build is fixture-only, not a supported production lifecycle. IR-007 removed the production cache and its cache-specific test assertion. With the restored one-build schema path, distinct-ID public Org projection and adjacent trace-page/cursor unit queries pass; focused Org, Team and definition-catalog GraphQL suites **9/9 passed**, production `tsc -p tsconfig.build.json --noEmit` passed after `prepare:shared`, and `git diff --check` passed. These local checks do not establish real Org HTTP/reload acceptance.
- IR-008: focused server Org/model/capability/application/Team-save suites **79/79 passed** across seven files, including one discovery for 18 equivalent root/Team/Agent placements, distinct workspace/runtime contexts, first-address and incomplete-batch errors, typed/sanitized timeout/unexpected failure versus valid missing slug, async availability/application callers, and a concurrent local health request completing while fake AGY discovery waits. Production `tsc -p tsconfig.build.json --noEmit` and full server build/bootstrap smoke passed; `git diff --check` passed. A broad test-inclusive TypeScript command still reports pre-existing out-of-rootDir/test fixture errors and is not claimed as passing. These are implementation checks, not real packaged/browser API/E2E sign-off.
- Prior IR-001 local production-path evidence files (above) cover generated custom agent/toolset, real workspace file/shell targeting, exact restore, scoped AutoByteus team/org MCP calls, configured `PRELOADED_ONLY`/`NONE` and user-owned skill collision. These are implementation probes, not downstream API/E2E sign-off.
- Current live run `daily_assistant_09fba2c5cd2e4093bbf7f992157b144b`: raw trace tool-result sequences 3/5/7 are `TOOL_EXECUTION_SUCCEEDED`, with `provider_state: DONE` and output respectively `AGY-EXIT0-LIVE`, null (exit 8), and visible command-not-found text. No exit field. The live and reloaded chat/Activity showed three green SUCCESS cards and no lifecycle error banner. Explicit-off run `daily_assistant_b41a98b435ce40b7a1af410851d32b0c` emitted `TOOL_DENIED` despite overall turn success; live DENIED and pre-refinement reload FAILED, both non-green.
- `git diff --check` and changed-source-size audit passed. No independent review or acceptance is inferred.

## Frontend Rendered-Result Check

- IR-008: **Not Applicable** to this server-only code change; the existing browser alert surface was not edited. The required rendered slow/failure/valid-missing-slug and full Org journey checks are explicitly pending API/E2E against the corrected backend. Prior visual evidence below is historical, not an SR-023 pass.
- Affected journey: workspace agent run chat, tool card, Activity/Event Monitor, reload, AGY launch auto-execute switch. Reviewed adjacent other-runtime green tool presentation and existing shared components; no separate Product Design supplement.
- The project-supported browser preview at `127.0.0.1:3000/workspace` was directly exercised. Exit-0/exit-8/command-not-found live and reloaded cards were green SUCCESS; command-not-found result text remained readable. The earlier canonical lifecycle error did not reappear and assistant response rendered. Explicit-off denial displayed non-green live and after reload. No layout/label issue observed in the green cards.
- Subsequent API-REV-001 browser evidence closed that prior limitation: final-code fresh denial rendered **DENIED** both live and after reload. This independent bounded evidence is not full API/E2E acceptance.
- IR-003 fresh Org editor inspection used the project-supported local browser preview: selecting AGY for an Org Team with root off showed Team auto-execute on; toggling it off retained AGY and showed off. Selecting AGY for a direct Org Agent showed on; toggling it off and collapsing/reopening retained off. Root remained off, and the nested editor layout was visually consistent. This inspected draft presentation, not a launched Org or downstream E2E result.

## Downstream Coverage Hints / Suggested Scenarios

- Independently verify generated custom main agent/toolset, real workspace relative file and shell targets, exact saved-ID restore/mismatch, scoped MCP team/org attribution, skill `PRELOADED_ONLY`/`NONE` and collision control, AGY-only auto-execute and non-AGY regressions.
- In the live/reloaded Event Monitor and raw traces, check exit 0, exit 8, command-not-found and explicit-off denial. Preserve `DONE`/output, never synthesize shell exit zero; confirm final denied label and no `AGENT_SEGMENT_LIFECYCLE_INVALID`.
- Earlier API-REV-006/CRR-012 passed real Team/direct+nested Org browser restart, visible old/new reply and continuation on the prior source basis. Do not infer this proves SR-023's 18-placement launch or failure diagnostics.
- After source review, API/E2E must run full 1-root/3-Team/14-Agent AGY Org through a browser against a packaged/equivalent backend, confirm active persisted 18-placement tree and concurrent `/rest/health`, and render finite addressed safe discovery timeout/failure versus valid missing-slug errors with `launching` reset. Then renew affected Team/Org and non-AGY regression checks. Do not alter the user's original Org or historical test Org.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent Code Review and API/E2E validation remain required. Provider controls and implementation-local checks do not satisfy those gates.
