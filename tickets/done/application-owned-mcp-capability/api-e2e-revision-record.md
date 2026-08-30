# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` CRR-002; API/E2E round 1 | Solution baseline; architecture review pass; IR-002; CRR-002 | N/A | Pass / 97.2% |
| API-REV-002 | /code_reviewer CRR-004; API/E2E round 2 | SR-006; ARCH-REV-006; IR-003; CRR-004; DR-002 | Pass / 97.2% for prior scope | Fail / 87.1% |
| API-REV-003 | /code_reviewer CRR-006; API/E2E round 3 | SR-007; ARCH-REV-007; IR-004; CRR-006; DR-002 | Fail / 87.1% for superseded SR-006 workflow | Fail / 88.6% |
| API-REV-004 | /code_reviewer CRR-008; API/E2E round 4 | SR-008; ARCH-REV-008; IR-005; CRR-008; DR-002 | Fail / 88.6% for superseded SR-007 workflow | Pass / 97.6% |
| API-REV-005 | /code_reviewer CRR-011; API/E2E round 5 | SR-009; ARCH-REV-009; IR-006; IR-007; CRR-011; DR-004 | Pass / 97.6% for prior state | Fail / 96.4% |
| API-REV-006 | /code_reviewer CRR-013; API/E2E round 6 | SR-010; ARCH-REV-010; IR-008; CRR-013; DR-004 | Fail / 96.4% under superseded oracle | Pass / 98.4% |

## Revision Entries

### API-REV-001 — Strict current-contract matrix and shipped Brief Studio MCP proof

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; round 1.
- Triggering finding or scenario IDs: CRR-002 request for mandatory coverage investigation and the provider/worker/Team/catalog-transition/concurrency/shutdown matrix; API-MCP-001 through API-SHD-001. During execution the user explicitly requested a production-reachable real application MCP case.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `IR-002`, `CRR-002`; current solution and architecture baselines recorded in their canonical revision files; no delivery revision.
- Why this baseline was recorded: this is the first completed API/E2E result. The initial suite contained valid-state v4/v6 fixtures and tests for a deleted refresh owner, while the new runtime boundaries lacked durable cross-process proof.
- Coverage decisions or durable test paths changed: v4/v6 valid fixtures became v5/v7 with old versions retained only as rejection inputs; the refresh-coordinator test and obsolete direct-reentry scenarios were removed/replaced; durable native, MCP, gateway, worker, ownership/Team, catalog-transition, lifecycle/shutdown, package, Brief handler, and shipped Brief MCP coverage was added or expanded. The complete path inventory is authoritative in `api-e2e-execution-coverage-report.md`.
- Scenarios added, changed, removed, or rechecked: API-MCP-001, API-RUN-001, API-WRK-001, API-TEAM-001, API-CAT-001/002/003, API-CON-001, API-LIFE-001/002, API-PKG-001, API-BRF-001, API-SHD-001; obsolete coordinator/direct-reentry assertions removed.
- Commands, environment, fixture, or broader-validation delta: final curated server matrix passes 33 files/234 tests; devkit and maintained Brief/Socratic builds/validation pass; server build passes; real-provider preflight passes 18/18 with optional secrets absent and LM Studio unavailable; real Brief Studio package is called over authenticated MCP through exact Team binding, production gateway, real child worker, and SQLite state.

#### Prior Failure Resolution

None. No prior completed API/E2E result existed. Stale failures encountered during this round were coverage-maintenance findings, not prior revision failures: the last stale REST status expectation was corrected and the final matrix passes.

- Canonical artifacts and sections updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`.
- Current result and confidence: `Pass / 97.2%`.
- New or remaining failure IDs: no feature failure. Residual `API-BROAD-001` records 25 failures in five unchanged workspace/run-history files; supplemental server typecheck is blocked by the repository rootDir/include configuration.
- Recommended recipient: `/code_reviewer` for proportional changed-test review.
- Handoff transport status: delivered to `/code_reviewer` after the user restored the team-tool session; the tool returned `DELIVERED`.
- Remaining risks, blocked evidence, or untested scope: optional paid model inference was not run because secrets are absent; LM Studio is unavailable; the unrelated broad E2E residuals and typecheck configuration remain explicit and do not remove direct proof for any critical ticket criterion.

## Historical Post-API-REV-001 Scope Note — Agent-to-UI Proof

After API-REV-001, the user required an actual Brief Studio Agent call, correlated call/result evidence, and UI outcome. That gap was routed through SR-006 / ARCH-REV-006 / IR-003 / CRR-004 and is no longer an unresolved requirement gap. API-REV-002 below records the completed real-provider/browser execution and its production failure.

### API-REV-002 — Real configured Brief Studio Agent-to-UI execution

- Triggering role, report path, and round: /code_reviewer; /home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md; CRR-004; API/E2E round 2.
- Triggering scenario IDs: API-BRF-AGENT-001, API-BRF-AGENT-002, API-BRF-JOIN-001, API-BRF-UI-001, API-BRF-READ-001, API-BRF-CFG-001, API-CODEX-EXP-001.
- Related revisions: SR-006, ARCH-REV-006, IR-003, CRR-004, and delivery pause DR-002.
- Why recorded: the earlier direct-MCP result did not prove model choice or browser outcome. Round 2 ran the actual shipped Codex/Luna researcher/writer Team from the supported Brief Studio browser.
- Coverage decisions and durable paths changed: the stale brief-studio-team-config.integration.test.ts assertions were classified Needs Update before editing, updated to current source-plus-package role/Team/launch contracts, and passed. No durable file was added or removed.
- Scenarios rechecked: current handler marker/read-only behavior, current prompt/package contract, actual researcher/writer first-call behavior, exact trace/binding/artifact joins, publication/reconciliation, and final browser rendering.
- Commands/environment delta: current Brief package build/validate; focused 3-file/11-test SR-006 matrix; 1-file/27-test Codex exposure diagnostic; isolated server/frontend/same-origin proxy; authenticated codex_app_server / gpt-5.6-luna; Chromium 149 supported browser journey; 20 ms application-DB observer.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| Post-API-REV-001 Agent-to-UI requirement gap | Requirement Gap pending design | Resolved upstream by SR-006/ARCH-REV-006/IR-003/CRR-004; actual execution proceeded | Requirements/design/review revision records |
| Missing actual Agent/browser proof | Not tested in API-REV-001 | Executed, but failed in production path | api-e2e-evidence/api-rev-002 |

- Canonical artifacts updated:
  - /home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md
  - /home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md
  - /home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md
  - /home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-002
- Prior result and confidence: API-REV-001 Pass / 97.2% for AC-001 through AC-031; unchanged.
- Current result and confidence: Fail / 87.1% for the renewed AC-032 through AC-036 scope.
- New or remaining failure IDs: API-BRF-AGENT-001, API-BRF-AGENT-002, API-BRF-JOIN-001 partial, API-BRF-UI-001, and API-BRF-READ-001 partial.
- Failure details: the actual researcher called get_brief_context first exactly once, but configured write_file was unavailable and it published a shell-created blocker. The writer called context first after handoff, but read_file/write_file were unavailable, it published no final artifact, and a follow-up turn caused a second context call. The browser rendered blocked with one blocker and zero final outputs.
- Preliminary classification: Design Impact / implementation-contract mismatch. The maintained Codex configs require file tools that the current Codex composition deliberately omits; existing durable Codex coverage corroborates this behavior.
- Recommended recipient: /code_reviewer for focused failure-origin review, not a successful proportional test-code review.
- Remaining risks: definitive owner decision is pending code review. Delivery remains paused at DR-002. No direct MCP, shell fallback, or mocked provider may be accepted as satisfying the failed live criteria.

### API-REV-003 — Corrected native-edit workflow still fails in the actual shipped provider path

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; `CRR-006`; API/E2E round 3.
- Triggering scenario IDs: `API-BRF-AGENT-001`, `API-BRF-AGENT-002`, `API-BRF-JOIN-001`, `API-BRF-UI-001`, `API-BRF-READ-001`, `API-BRF-NATIVE-001`, `API-BRF-HANDOFF-001`, `API-BRF-FAILCLOSED-001`, `API-BRF-CFG-001`, and `API-BRF-PUB-001`.
- Related revisions: `SR-007`, `ARCH-REV-007`, `IR-004`, `CRR-006`, prior `CR-DI-002`, and delivery pause `DR-002`.
- Why recorded: IR-004 removed unavailable ordinary file tools and shell-compatible wording, retained the shipped Codex/Luna roles, and specified provider-native edit plus full body handoff. API-REV-002 is valid regression evidence for the superseded workflow but cannot prove IR-004 success, so the actual supported journey had to be rerun.
- Coverage decisions and durable paths changed: none. `brief-agent-tool.test.ts`, `brief-studio-agent-prompt-contract.test.ts`, and `brief-studio-team-config.integration.test.ts` were classified `Still Valid`; the latter's stale SR-006 expectations had already been replaced and source-reviewed in IR-004/CRR-006. No Round 3 durable test was edited.
- Commands/environment delta: current SDK/devkit/server/Brief build and package validation; focused 3-file/12-test handler/config/package matrix; 2-file/24-test publication-owner matrix; isolated backend/frontend/host proxy; Chromium 149 supported host/iframe journey; actual authenticated `codex_app_server` / `gpt-5.6-luna`; 20 ms application-database observer; two independent normal UI launches for one selected brief.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-REV-002` ordinary `read_file`/`write_file` exposure mismatch | `Fail — Design Impact` | Superseded config behavior is resolved in current source: the exact shipped configs omit both names, and all Round 3 traces invoke zero ordinary file/shell operations | Current role configs; focused 3-file/12-test log; `identity-trace-artifact-join.json` |
| `CR-DI-002` native-edit replacement expected to restore success | Resolved in source at CRR-006; runtime pending | **Not resolved at the actual provider/model boundary**: both real researchers report provider-native `edit_file` unavailable and emit no normalized edit event | Two execution trees and four raw traces in `api-e2e-evidence/api-rev-003` |
| Missing current Agent-to-UI proof | Pending after CRR-006 | Executed twice; current result fails before publication/reconciliation | Database transitions, final UI screenshot/text, exact join artifact |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-003`
- Prior result and confidence: `API-REV-002 Fail / 87.1%` for the superseded SR-006 workflow; `API-REV-001 Pass / 97.2%` remains unchanged for `AC-001`–`AC-031`.
- Current result and confidence: `Fail / 88.6%` for renewed `AC-032`–`AC-039`.
- New or remaining failure IDs: `API-BRF-AGENT-001`, `API-BRF-AGENT-002`, `API-BRF-JOIN-001` partial, `API-BRF-UI-001`, `API-BRF-READ-001` partial, `API-BRF-NATIVE-001`, `API-BRF-HANDOFF-001`, and `API-BRF-FAILCLOSED-001` partial.
- Failure details: in both supported UI launches, each actual member called context exactly once first with exact identities. Each researcher then stated that provider-native `edit_file` was unavailable and truthfully sent a blocker. Each writer rejected the incomplete handoff. All traces contain zero shell/ordinary-file calls, but also zero native edits and publications; the same brief remains `not_started` with zero artifacts/revisions and UI outputs.
- Preliminary classification: `Design Impact / maintained role-to-provider operation contract mismatch`. Existing event conversion can normalize a provider-emitted file change, but neither actual model run emitted one; the model-facing contract still does not reach the required provider primitive.
- Recommended recipient: `/code_reviewer` for focused failure-origin review, not successful proportional test-code review.
- Cleanup: owned browser tab, backend/frontend/proxy, isolated root, and generated Brief/SDK/devkit outputs were removed; ports were verified closed; unrelated server/data untouched; `git diff --check` passed.
- Remaining risk: definitive owner/repair path is pending focused code review. Delivery remains paused at `DR-002`; direct MCP, runtime switching, shell, mocks, or API/E2E prompt edits cannot substitute for a corrected shipped workflow.

### API-REV-004 — Built-in Luna patch reaches the real configured Team and same-brief UI

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; `CRR-008`; API/E2E round 4.
- Triggering scenario IDs: `AC-032`–`AC-039`; maintained researcher/writer native-patch, normalized-edit, full-handoff, publication/reconciliation, and supported-browser chain.
- Related revisions: `SR-008`, `ARCH-REV-008`, `IR-005`, `CRR-008`, prior `CR-DI-002`, and delivery pause `DR-002`.
- Why recorded: API-REV-003 proved the superseded model-facing normalized `edit_file` wording could not reach the Luna provider primitive. IR-005 changed maintained model-facing text to Luna built-in `apply_patch` while preserving provider-native and normalized evidence layers, so the real production-reachable path required a fresh full execution.
- Coverage decisions and durable paths changed: `codex-agent-run-backend-factory.integration.test.ts` was classified `Needs Update` before editing. It now supplies current backend identity/memory/input/subscription fixture contracts, pins the material case to available `gpt-5.6-luna`, prompts built-in `apply_patch`, and retains verifier-owned normalized `edit_file` checks. One obsolete `TOOL_LOG` wait was classified `Stale / Remove` and removed after actual provider success demonstrated the canonical start/success/end projection. No durable file was added or removed.
- Commands/environment delta: focused `6 files / 97 tests`; current built-package contract `1 file / 4 tests`; SDK/devkit/Brief build, Brief backend typecheck, package validation, and production server build; default optional gate compile/skip; actual exact-Luna live file-change integration `1 passed / 9 skipped`; isolated production backend/Nuxt/same-origin browser stack; package import and launch setup through the UI; 20 ms app-database observer; actual configured researcher/writer Team; semantic same-brief browser capture.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-REV-003` model-facing `edit_file` could not reach a provider operation | `Fail — Design Impact` | **Resolved**: both current real roles used provider built-in `tools.apply_patch`; provider `patch_apply_end` call IDs equal the normalized successful `edit_file` call IDs | `researcher-codex-native-session-events.json`, `writer-codex-native-session-events.json`, both raw traces, machine join |
| `API-REV-003` zero publications and `not_started` UI | Production path failed before publication | **Resolved**: exact relative research/final publications projected under the correct members; reconciliation moved the same brief to `in_review`; browser rendered two outputs and exactly one final | Team message, final DB, transitions, browser observation/screenshot |
| Optional live Codex integration's stale wording/model/factory setup | `Needs Update` | **Resolved as coverage maintenance**: exact-Luna real `item.type=fileChange` case passes current backend contract | attempt-6 log and `codex-live-events/codex-backend-edit-file.json` |
| Missing complete handoff/verbatim-use proof | Unproven in prior rounds | **Resolved**: one message carries exact marker/path and complete 307-word body; writer reads no file and copies complete findings verbatim | Team communication, both files/traces, machine join |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004`
- Prior result and confidence: `API-REV-003 Fail / 88.6%` for the superseded SR-007 workflow; `API-REV-001 Pass / 97.2%` remains unchanged for `AC-001`–`AC-031`.
- Current result and confidence: `Pass / 97.6%` for renewed `AC-032`–`AC-039`.
- New or remaining feature failure IDs: none.
- Material proof: every AC assertion is true in `identity-trace-artifact-ui-join.json`; the actual configured Team and supported browser journey complete without direct MCP, mocks, runtime switching, ordinary file tools, shell fallback, or trace feedback to roles.
- Cleanup: owned browser/processes stopped, ports closed, isolated data and owned generated outputs removed after evidence copy, unrelated data preserved, and `git diff --check` passed.
- Remaining risks: inherent external-provider availability/nondeterminism; pre-existing global TS6059 typecheck configuration; one transient observer-only SQLite lock; bundled bubblewrap fallback. None leaves a critical ticket criterion unproven.
- Recommended recipient: `/code_reviewer` for proportional review of the one updated durable integration file before delivery.

### API-REV-005 — Current lifecycle passes, real Brief Studio MCP succeeds, but shipped roles use shell

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; `CRR-011`; API/E2E round 5 after the latest-base merge and `IR-006`/`IR-007`.
- Triggering scenario IDs: renewed `AC-032`–`AC-044`, including deterministic tokenless activation, stop/restore/current-route behavior, application-lane quiesce with run-session liveness, exact deactivation, shutdown, and the supported Brief Studio Codex/Luna browser journey.
- Related revisions: `SR-009`, `ARCH-REV-009`, `IR-006`, `IR-007`, `CRR-011`, prior `API-REV-004`, and delivery pause `DR-004`.
- Why recorded: the latest-base merge materially changed the host/session/application execution topology and replaced the model-facing built-in-patch wording with operation-neutral business instructions. The prior passing result is valid only for its prior state and cannot prove these merged contracts.
- Coverage decisions and durable paths changed: the deleted issuer/bearer fixture in `agent-package-private-skills.e2e.test.ts` was classified `Stale / Replace` and replaced with the current tokenless run-session activator contract; `codex-agent-run-backend-factory.integration.test.ts` was classified `Needs Update` and repaired for current run identity, memory, batch-dispatch, exact Luna, operation-neutral prompt, and test-owned routed application authority; the stale “authenticated MCP” label in `brief-studio-agent-tool-mcp.integration.test.ts` was classified `Needs Update` and corrected to tokenless MCP. No production file was changed.
- Commands/environment delta: current stale-fixture contract `1 file / 4 tests`; current lifecycle/topology matrix `21 files / 178 tests`; package/publication matrix `10 files / 44 tests`; frontend SDK/devkit/Brief/server builds and package validation; default optional live gate compile/skip; exact actual `gpt-5.6-luna` material diagnostic `1 passed / 9 skipped`; fresh isolated backend/frontend/same-origin browser stack; Brief package import and setup through the supported UI; actual shipped researcher/writer Team; clean no-observer browser run.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-REV-004` pre-merge lifecycle and Brief workflow | `Pass / 97.6%` for prior state | Re-executed rather than inferred; current lifecycle criteria and `AC-032`–`AC-038` pass | current topology matrix and `clean-identity-trace-artifact-ui-join.json` |
| Deleted issuer/bearer fixture | Flagged stale fixture | Replaced before execution with current tokenless activator and capability-object contract | durable test diff and `stale-fixture-current-contract.log` |
| Optional live Codex fixture missing current backend identity and exact current model/prompt | `Needs Update` | Repaired; exact Luna material file-change diagnostic passes | `codex-live-exact-luna-after-repair.log` and provider event JSON |
| Current zero-shell normal-artifact requirement | Required under `AC-039` | **Not resolved in the actual shipped application journey**: both clean members selected shell; the rejected observer run independently showed the same choice | normalized raw traces and sanitized provider sessions |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-005`
- Prior result and confidence: `API-REV-004 Pass / 97.6%` for the superseded pre-merge state.
- Current result and confidence: **`Fail / 96.4%`**. Confidence is high because the critical failure is directly observed, not because the clean-pass threshold is met.
- Passing material proof: `AC-032`–`AC-038` and `AC-040`–`AC-044` pass. Both real configured members call `get_brief_context` first exactly once; exact application/binding/member/run/call/publication identities join; the complete research body is handed off and used verbatim; publication reconciles the same brief to `in_review`; the browser displays two outputs and exactly one final artifact.
- Remaining failure: `AC-039`. The authoritative clean researcher uses normalized `run_bash` call `exec-1520ef2c-dee7-4fe7-8544-58cc04e2561e`, and the writer uses `exec-f4bcd9ea-2a42-4054-b837-f18247e028af`; provider evidence records `tools.exec_command` and no native patch/file-change for either normal artifact. Across the clean and rejected observer runs, four of four actual member executions selected shell.
- Preliminary classification: implementation / requirement-design interaction. Operation-neutral business text plus the automatically available shell did not produce the required zero-shell behavior with the shipped Luna model. Formal origin belongs to `/code_reviewer`; a compliant repair may require `/solution_designer` reconciliation.
- Cleanup: the owned browser and three services were stopped, ports `8015`/`3015`/`3016` were verified closed, isolated root/database and owned generated outputs were removed, unrelated state was preserved, and `git diff --check` passed.
- Recommended recipient: `/code_reviewer` for focused failure-origin review plus proportional review of the three changed durable test files. Delivery remains paused at `DR-004`.

### API-REV-006 — Corrected business oracle accepts the integrity-proven current browser journey

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; `CRR-013`; API/E2E round 6.
- Triggering scenario IDs: corrected `AC-032`–`AC-039`, unchanged `AC-040`–`AC-044`, and completion of the three pending API-REV-005 durable test edits.
- Related revisions: user-approved `SR-010`, `ARCH-REV-010`, documentation-only `IR-008`, `CRR-013`, historical `API-REV-005`, and delivery pause `DR-004`.
- Why recorded: `API-REV-005` must remain truthful failure history under its then-approved zero-shell oracle. The user explicitly rejected that solution-authored rule. Round 6 establishes a distinct current result without rewriting prior evidence or changing production behavior.
- Coverage/evidence decisions: API-REV-005 raw browser/artifact/identity evidence was classified `Still Valid — Reclassify Under Current Oracle`; its operation events are `Diagnostic Only`; its historical synthesis is `Stale For Current Pass/Fail` but retained unchanged. The three durable test edits are `Still Valid — Pending Ownership Completion` and received no new Round 6 edit. v4/v6 valid-state and issuer/bearer/session-secret expectations remain stale or rejection-only.
- Executable/current-input verification: no committed non-ticket executable change from `d26ad181e` through `4994980aa`; no uncommitted production or maintained-input change; all six maintained Brief source inputs are byte-identical to the API-REV-005 snapshot; all API-REV-005 evidence hashes match.
- Commands/environment delta: documented SDK/devkit/Brief build, backend typecheck, package build, and validation pass; exact three-file durable collection passes `2 files / 5 tests` with the optional Codex file compiling and `10` gated tests skipped; the broader Brief/package/publication collection passes `10 files / 44 tests`; current-oracle synthesis passes all authoritative checks; `git diff --check` passes.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-REV-005` AC-039 zero-shell failure | `Fail / 96.4%` under the then-approved oracle | Preserved as truthful history; superseded for current acceptance by explicit user-approved SR-010 | API-REV-005 report/join; SR-010; ARCH-REV-010; CRR-013 |
| Shell-created normal artifacts | Previously disqualified despite complete business success | Valid already-authorized foundation behavior; retained as diagnostic and excluded from current pass/fail | current-oracle join `diagnosticChecks` |
| Real artifact/workspace/publication/handoff/identity/UI proof | Passed in API-REV-005 | Revalidated without weakening: all 27 authoritative checks true | `current-oracle-identity-artifact-ui-join.json` |
| Three pending API-owned durable edits | Executed in Round 5 but proportional review deferred by failure | Ownership execution completed; exact current diff returned for proportional review | `pending-durable-tests-after-package-build.log`; `brief-package-publication-matrix.log`; durable diff |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-006`
- Prior result and confidence: `API-REV-005 Fail / 96.4%` under the superseded zero-shell oracle.
- Current result and confidence: **`Pass / 98.4%`** under the user-corrected `SR-010` oracle.
- Material result: `AC-032`–`AC-044` pass. The actual application-owned `get_brief_context` call, exact artifacts, publications, complete Team handoff, producer/application/binding joins, read-only causality, same-brief UI, deterministic tokenless activation, restore, quiesce, deactivation, and shutdown remain directly proved.
- Durable diff: three updated files, no addition/removal, `157 insertions / 111 deletions`, SHA-256 `b6b0f95c538bec361a0fe512c477d4d94fb6a89ee84d8d4c80e950e7b0807438`; byte-identical to API-REV-005.
- Cleanup: generated Brief/SDK/devkit outputs were removed; no new browser/service/data root was created; unrelated processes/data were untouched; evidence and JSON integrity plus `git diff --check` passed.
- Remaining risks: inherent external-provider nondeterminism, the pre-existing supplemental TS6059 configuration, and delivery documentation/integration work. None leaves a current critical acceptance criterion unproven.
- Recommended recipient: `/code_reviewer` for proportional review of the three changed durable test files before delivery resumes.
