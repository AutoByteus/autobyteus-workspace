# Code Review Report — backend-port-conflict-20261024

## Review Round Meta
- Entry point: **Implementation Review**, round **1**, **Full Review**, **CRR-001**, 2026-10-24.
- Decision: **Fail — implementation-owned Local Fix**, CR-001 and CR-002. Do not advance to API/E2E yet.
- Reviewed HEAD: `0eb15a1374cc8ae0a0ed2272282c171e601c4b8b`; source/check/build baseline `10990feb1`; diff base `034bfe51ab697817773ff545d369e1cfc03a79c5` (`origin/personal`). Source unchanged between validated baseline and reviewed HEAD, independently checked.
- Workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`; branch `task/backend-port-conflict-20261024`.
- Requirements context: `requirements-doc.md`, **R1 Approved**, including Scope Guardrail, REQ-001..006 / AC-001..006. No behavior-defining supplements.
- Investigation context: `investigation-notes.md`; `codex-origin-clarification.md`; `codex-background-investigation.md` (SR-006).
- Solution history/design: `solution-revision-record.md` **SR-001..006**; `design-spec.md` **D3.1**.
- Architecture context: `design-review-report.md`, `architecture-review-revision-record.md`, **ARCH-REV-003 Pass**; earlier AR-001..003 and IMP-DI-001 resolved in design.
- Implementation context: `implementation-handoff.md`, `implementation-check-ledger.md`, `implementation-revision-record.md`, **IR-002** (prior IR-001 recovery retained).
- Supplements/evidence inspected: native anchor source/tests; IMP-13..21 receipts and source inventory; earlier defect/anchor and shutdown transport evidence as linked by design; SR-006 Codex evidence limitations; `follow-ups.md`.
- Code-review history: `code-review-revision-record.md`, first result, prior result **N/A**. No prior review pass inferred.
- Coverage investigation/execution report, API-REV, DR: **N/A** (not this entry point; API/E2E has not run).
- Authorities: code-reviewer skill/templates; shared design-principles, ticket-scope and design-examples Example 7; repository `DESIGN.md`, `TESTING.md`, `AGENTS.md`, applicable server/web AGENTS. No closer DESIGN document found in the affected packages; no policy conflict established.

## Routing Classification Review
- **task_size=Large / architectural_risk=High**, unchanged. Independent implementation-source review required.
- Cross-package command lifetime, OS signal authority, startup/shutdown sequencing, private IPC and renderer diagnostics justify the classification.
- Selected rule: source review identifies an implementation-owned Local Fix before executable coverage → `/software_engineering_team/implementation_engineer`.
- Neither finding changes intended behavior or the reviewed ownership architecture; both are bounded defects inside its assigned owners.

## Review Scope
Full changed implementation audit: core command launch/control/observation/admission/stop/retirement and output records; runtime config copy and native provider injection; Studio and standalone host close/partial-build paths; process shutdown readiness/barrier/cleanup transfer; platform desktop start/stop, Windows request/result/exit/force; cached application quit and updater preparation; read-only port diagnosis and all typed/derived renderer consumers. Read relevant current callers, not just diffs; inspected modified tests proportionately.

Excluded: provider-policy redesign, ordinary individual-agent/idle behavior changes, crash/daemon escape reclamation, persisted ownership, release/install/merge, and independent API/E2E acceptance. No source or durable test fix was made by the reviewer. New ticket-local probes are evidence only.

## Upstream Behavior And Production-Path Basis Confirmation
Approved intent and scenario basis **Confirmed**. Implementation defects below do not redefine that basis. No new requirement, missing product approval, or newly invented user journey.

| Behavior | Status | Current production path / lifecycle evidence | Qualification |
|---|---|---|---|
| BEH-001 | Confirmed | Desktop launch → `BaseServerManager.startAttempt` → `waitForBackendPort`/post-exit diagnosis → typed `ServerStatusManager` → preload/shared snapshot → store/loading/monitor | Read-only bounded diagnosis; non-address failures retain generic errors; stale-generation guards present |
| BEH-002 | Confirmed | Renderer Restart → status manager → awaited captured-child stop → fresh availability check/start → fresh diagnostic state | External holder is not signal authority; conflict branch hides reset; real IMP-20 recovery is scoped evidence |
| BEH-003 | Confirmed basis; local defects | Native tools → context manager / executor → host scope → retained gated anchor → verified observation/drain; host `preClose` → provider/resource cleanup; desktop quit waits backend | CR-001 breaks explicit stop during new maintenance; CR-002 retains completed foreground captures. Host shutdown architecture otherwise follows D3.1 |
| BEH-004 | Confirmed | Runtime-only injected scope; exact child/group handles; observer gates; standalone/Studio composition; inspection separated from cleanup | No data migration/reset or port-based kill. Codex ownership remains provider-specific; native tests do not prove reported incident fixed |

## Supported Product Scenario And Reachability Gate
| Scenario / contract | Kind / initiating basis | Forward path / lifecycle | Expected outcome | Independent authority | Validity / review use |
|---|---|---|---|---|---|
| SCN-001/005 | User/System: launch with occupied endpoint, or failed owner inspection | Launch → bind check → advisory lookup → visible typed conflict | Truthful identity/unknown; no external interruption | R1 REQ-001/002/004, AC-001/002; historical conflict and P-001 | Supported Explicit Edge Scenario / Use |
| SCN-002 | User: resolve other app's conflict and Retry | Restart control → managed stop → fresh launch | Block while occupied, recover after removal | R1 AC-003 and exposed Restart; IMP-20 | Supported Normal Scenario / Use |
| SCN-003 | User/System: application quit or backend restart after native work | Tools → injected scope → Fastify early drain → remaining cleanup → backend exit → desktop continuation | All owned groups absent or honest bounded failure | User approval, R1 REQ-003/004, AC-004/005, D3.1 DS-003 | Supported Normal Scenario / Use |
| SCN-004 | System: shell/run ends but native descendants remain | RESULT/agent end → retained scope lease → later shutdown | Ownership outlives agent; unrelated work survives | R1 SCN-004, baseline P-003/005 and IMP-DI-001 | Supported Explicit Edge Scenario / Use |
| D3.1 native explicit-stop preservation | User via agent: stop an ordinary managed preview after its launching shell returns; automatic maintenance continues independently | `stop_background_process` → manager.stopProcess → scope.stop, while 1s `retireEmpty` inspects that same completed shell's live group | Stop must execute the drain, not return a non-stopping inspection result | R1 REQ-005 preserved tools/lifetimes; D3.1 “same scope stop operation serves explicit stop”; existing tool registration and timer | Supported Normal Scenario / Use; CR-C01 |
| D3.1 per-agent output lifetime / completed-command retirement | User via agent: ordinary sequential foreground commands in one conversation | `runBash` always passes context manager → executor capture → command completion/no survivors → scope retirement | Preserve returned output; no historical capture retained without a record/consumer | R1 REQ-005 preserved normal commands; D3.1 manager owns per-agent records, immediate empty completion retirement; shared resource ownership principles | Supported Normal Scenario / Use; CR-C02 |
| D3.1 startup/Windows/quit contract | System: quit/restart during startup or ongoing work | captured child → private request/signal → startup barrier → latest cleanup → complete+exit → app/updater | No late startup, no concurrent initialize/close, no false success on force | R1 REQ-003/004, QR-001; MP-001/002 | Supported Explicit Edge Scenario / Use |

### Candidate Finding And Mechanism Gate
| Candidate | Observation / mechanism | Scenario / contract; independent trigger | Forward path / lifecycle / consequence | Evidence | Disposition / scope | Response |
|---|---|---|---|---|---|---|
| CR-C01 | `stop` shares a pending maintenance result as if it were a drain | D3.1 explicit-stop preservation above; user stops a preview while system maintenance is inspecting it | Completed shell retains child; maintenance stores promise in `operations`; stop returns it at line57; “Group still active” is returned with no TERM/KILL and stop intent suppresses future natural retirement | scope `:52-64,101-117`; tool/manager callers; CR-01 probe first case: survivor84831, unconfirmed “Group still active”, one live lease | **Promote / This ticket** | CR-001: sequence stop after maintenance, recheck retirement and drain within the caller budget; do not share an inspection-only result as stop completion |
| CR-C02 | Every foreground command creates a permanent strong output-map entry | D3.1 output/retirement contract above; ordinary repeated `run_bash` | executor captures before START; no-survivor completion retires scope but never releases manager capture; no PID record exists to explicitly stop/release it; retained handle and up to1MB output per command accumulate for context lifetime | manager `:14,21-26,64-80`; executor `:27-30,36-42,48-50`; CR-01 probe second case: zero leases/records but3 captures/51 bytes after3 commands | **Promote / This ticket** | CR-002: release unneeded captures without discarding output required by live/adopted or legitimate historical background records; add lifecycle regression |
| CR-C03 | Hypothesized late platform spawn after pre-spawn cancellation | D3.1 cancellation contract; quit during preflight | Potential await inside launcher would matter, but current macOS/Linux/Windows launch bodies spawn synchronously after final preflight signal check | All3 platform launchers inspected; shell PATH resolution is synchronous | **Reject** | No finding, no new generation machinery prescribed |
| CR-C04 | Requiring native anchors to prove or replace Codex command ownership | R1 SCN-003/004 and SR-006; reported Codex-launched listener | Native branch does not intercept provider-internal conversation exec; current provider owner is intentionally preserved | Native factory injection, SR-006 actual-client-only results, no Codex source diff | **Reject as source-defect inference** | Preserve integrated Codex validation gate downstream, not a speculative provider rewrite or acceptance claim |

Existing and new safety machinery was judged against the established contracts: retained gate before user code, identity revalidation, concurrent collective bounded drain, startup cancellation barrier, result+exit Windows confirmation, generation-safe diagnostic publication and cached app preparation are justified. No unsupported safety mechanism was promoted. No candidate held for missing evidence.

## Structural / Design Checks
| Check | Result | Evidence | Required action |
|---|---|---|---|
| Task design health assessment present and preserved | Pass | D3.1 ownership/missing-invariant assessment; IMP-DI-001 replaced with retained anchors | None upstream |
| Approved supplemental behavior alignment | Pass | No normative supplements; SR-006 limits preserved | Keep acceptance caveats |
| Data-flow spine inventory clarity/preservation | Pass | D3.1 tool→scope, host→close, desktop→status paths trace in source | None |
| Ownership boundary preservation/clarity | Pass | Host scope injected by reference; manager owns records; observer only mechanism | Repair local sequencing, not new owner |
| Off-spine concern clarity | Pass | Read-only inspector; static anchor/framing and identity observers serve specific owners | None |
| Existing capability/subsystem reuse | Pass | Terminal, composition, server/application/updater and localization boundaries reused | None |
| Reusable owned structures | Pass | One anchored handle; one typed diagnostic; shared host shutdown adapter | None |
| Shared structures/data-model tightness | Pass | Runtime scope not serialized; discriminated command/cleanup/diagnostic results | None |
| Repeated coordination ownership | Pass | Scope owns termination policy; desktop captured-child owner owns force policy | CR-001 fixes local operation-kind confusion |
| Empty indirection | Pass | New boundaries own protocol, deadline, identity, aggregation or lifecycle | None |
| SoC/file responsibility | Pass | Focused new modules; larger touched owners shrink or remain under limit | None |
| Ownership-driven dependencies | Pass | Core has no server/Electron dependency; server composes core | None |
| Authoritative Boundary Rule | Pass | Tools do not signal observer directly; hosts close scope via integration; diagnostics never authorize cleanup | None |
| File placement | Pass | Command execution, server shutdown and application shutdown live with their owners | None |
| Flat vs over-split layout | Pass | Small scripts/decoder/identity have concrete platform/protocol responsibilities | None |
| Interfaces/identity clarity | Pass | Handle, exact distro and captured child identities separated from advisory PID | None |
| Naming/vocabulary/local readability | Pass | Scope vs output record, result vs cleanup, conflict vs generic error consistent | No stylistic blocker |
| Unjustified duplication | Pass | Four exact wire strings intentionally paired across separately packaged boundaries and contract-tested | None |
| Patch-on-patch control | Pass | Old numeric group/marker/signal-only paths replaced, not fallback layers | None |
| Dead code removal in touched scope | Pass | Removed factory cache/accessor, WSL marker/parser, old observer stop path and fire-and-forget quit | No additional dead symbol established |
| Relevant test intent/assertions | Pass | Actual owned child absence and listener release; IPC negative cases; localization consumer tests | Add CR-001/002 regressions |
| Fixture/helper reuse/coherence | Pass | Isolated core fixtures and bounded fake transport tests suit their boundaries | Keep platform limits explicit |
| No stale/compatibility-only tests | Pass | Deleted obsolete unsafe API assertions; new replacement behavior tested | None |
| API/E2E readiness | **Fail** | Two confirmed local source regressions remain despite green focused baseline | Fix CR-001/002 then source review again |

## Source File Size And Structure Audit
Independent base/current count in `evidence/CR-02-source-audit.json`: **41 changed implementation files**, none over500 nonempty lines. Tests, fixtures and ticket evidence excluded. Delta counts below are added+deleted lines (conservative churn audit). The3 large deltas are intentional replacements of unsafe command mechanics, not added monoliths. Responsibility/placement checks pass; no size-only finding.

| Source file | Base nonempty | Current nonempty | >500 | >220 delta | SoC / placement | Classification / action |
|---|---:|---:|---|---|---|---|
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 473 | 468 | Pass | 17 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | 205 | 209 | Pass | 4 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 406 | 412 | Pass | 25 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` | 59 | 62 | Pass | 3 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/compositions/native-command-shutdown.ts` | 0 | 21 | Pass | 21 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/server-runtime.ts` | 226 | 215 | Pass | 111 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/shutdown/server-process-shutdown.ts` | 0 | 59 | Pass | 59 — Pass | Pass | No structural change required |
| `autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts` | 353 | 358 | Pass | 11 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/agent/context/agent-config.ts` | 110 | 113 | Pass | 3 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/agent/context/agent-context.ts` | 120 | 121 | Pass | 2 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/index.ts` | 34 | 35 | Pass | 2 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/background-process-context.ts` | 24 | 26 | Pass | 4 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | 266 | 87 | Pass | 344 — reviewed replacement | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/anchor-control-protocol.ts` | 0 | 56 | Pass | 56 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/anchored-command-launcher.ts` | 0 | 138 | Pass | 138 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/command-deadline.ts` | 0 | 6 | Pass | 6 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/native-command-process-scope.ts` | 0 | 138 | Pass | 138 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.ts` | 113 | 103 | Pass | 19 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/posix-command-anchor-script.ts` | 0 | 26 | Pass | 26 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/process-group-observer.ts` | 192 | 73 | Pass | 274 — reviewed replacement | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/process-identity.ts` | 97 | 19 | Pass | 121 — Pass | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts` | 173 | 56 | Pass | 223 — reviewed replacement | Pass | No structural change required |
| `autobyteus-ts/src/tools/terminal/command-execution/wsl-command-anchor-script.ts` | 0 | 28 | Pass | 28 — Pass | Pass | No structural change required |
| `autobyteus-web/components/server/ServerLoading.vue` | 199 | 213 | Pass | 18 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/application/applicationShutdown.ts` | 0 | 29 | Pass | 29 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/application/electronApplication.ts` | 405 | 390 | Pass | 45 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/launch-profile/e2eLaunchPreflight.ts` | 23 | 5 | Pass | 25 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/backendPortAvailability.ts` | 0 | 30 | Pass | 30 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/baseServerManager.ts` | 448 | 414 | Pass | 128 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/managedBackendShutdownClient.ts` | 0 | 61 | Pass | 61 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/managedBackendStop.ts` | 0 | 34 | Pass | 34 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/portOwnerInspector.ts` | 0 | 29 | Pass | 29 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/serverStatusManager.ts` | 163 | 173 | Pass | 20 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/server/windowsServerManager.ts` | 149 | 63 | Pass | 140 — Pass | Pass | No structural change required |
| `autobyteus-web/electron/updater/appUpdater.ts` | 410 | 412 | Pass | 6 — Pass | Pass | No structural change required |
| `autobyteus-web/localization/messages/en/index.ts` | 78 | 80 | Pass | 2 — Pass | Pass | No structural change required |
| `autobyteus-web/localization/messages/en/server.ts` | 0 | 8 | Pass | 8 — Pass | Pass | No structural change required |
| `autobyteus-web/localization/messages/zh-CN/index.ts` | 78 | 80 | Pass | 2 — Pass | Pass | No structural change required |
| `autobyteus-web/localization/messages/zh-CN/server.ts` | 0 | 8 | Pass | 8 — Pass | Pass | No structural change required |
| `autobyteus-web/stores/serverStore.ts` | 411 | 417 | Pass | 8 — Pass | Pass | No structural change required |
| `autobyteus-web/types/serverStatus.ts` | 27 | 33 | Pass | 7 — Pass | Pass | No structural change required |

## Legacy / Backward-Compatibility Verdict
| Check | Result | Evidence |
|---|---|---|
| No backward-compatibility mechanism | Pass | Exact same-version IPC contract; no old-server negotiation/fallback |
| No old-behavior retention | Pass | Unsafe numeric group authority and Windows purported graceful taskkill removed |
| Dead code removed in touched scope | Pass | Removed cached native factory accessor and marker/parser; caller search confirms replacement |
| Persisted-data transition followed | Pass | **Not Affected**; runtime-only reference and transient diagnostic |
| No version-specific dual read/write/request fallback | Pass | No persisted shape change or old payload path |
| Transition mechanics appropriate | Pass | No migration warranted/added |

Dead/obsolete source items requiring removal: **None established**. CR-002 is a live runtime resource-retention defect, not an unused-source-symbol finding.

## Docs-Impact Verdict
**Yes.** Delivery should synchronize terminal ownership/lifetime and desktop shutdown/conflict recovery documentation against the eventual validated behavior, including limitations. `docs/design-cases.md` already records the anchor lesson. Reviewer reports do not replace Delivery documentation sync. No release/install instructions should imply this task installed the fix.

## Additional Material Premise Validation
| Upstream premise | Status | Current evidence |
|---|---|---|
| MP-001 Windows orderly shutdown must reach host cleanup | Confirmed | Actual Windows launcher attaches IPC; server owner exists before async startup; completion+exit client and bounded force path present |
| MP-002 returned shell needs continuous authority; force can kill result emitter | Confirmed | Gated retained anchors, separate command and cleanup latches, `finishStop` fallback; native real-child checks |

No upstream premise reclassified. New concrete witness CR-C01 is automatic maintenance concurrent with an ordinary explicit tool stop, not two contradictory user actions. Its support is the approved D3.1 timer/stop contract and existing production tool path; the deterministic pause only exposes the real async inspection interval. CR-C02 requires no timing premise. Example7 applied before promoting either candidate.

## Review Scorecard
Overall **9.1/10 (91/100)**, simple mean; this does **not** override the failed categories/findings.

| Priority | Category | Score | Why | Weakness / drag | Improvement |
|---|---|---:|---|---|---|
|1|Data-Flow Spine Inventory and Clarity|9.5|Both command forms, both hosts and desktop/status paths are explicit|No blocking clarity defect|Preserve traces through fixes|
|2|Ownership Clarity and Boundary Encapsulation|9.5|Host-lifetime scope, advisory diagnosis and provider ownership separated|No boundary bypass established|Keep local fixes inside current owners|
|3|API / Interface / Query / Command Clarity|9.5|Exact handles/targets and distinct outcomes|No blocking interface ambiguity|No new generic process selector|
|4|Separation of Concerns and File Placement|9.5|Small focused adapters and existing owners|No structural split needed|Maintain current decomposition|
|5|Shared-Structure / Data-Model Tightness and Reusable Owned Structures|9.5|Single handle/diagnostic models and injected scope|No blocking model duplication|Preserve reference-only config copy|
|6|Naming Quality and Local Readability|9.5|Ownership and lifecycle vocabulary is consistent|No evidence-grounded naming defect|No style-only rewrite|
|7|API/E2E Readiness|8.0|Green scoped evidence is credible, but CR-001/002 are uncovered regressions|CR-C01/02 reproduced before independent executable coverage|Fix and add regressions, rerun by shared-core impact|
|8|Runtime Correctness And Behavioral Fidelity|8.0|Major cleanup/conflict paths follow design; explicit stop can be replaced by maintenance result|CR-C01 / CR-001|Ensure a stop request actually drains after inspection|
|9|No Backward-Compatibility / No Legacy Retention|9.5|Unsafe old paths removed without compatibility fallback|No blocking legacy defect|Keep clean cut|
|10|Cleanup Completeness|8.5|OS anchor retirement exists but output captures outlive ordinary commands|CR-C02 / CR-002|Release unconsumed captures/handles within their proper lifetime|

## Findings
### CR-001 — P2 / Medium — Do not return a maintenance observation as explicit-stop completion
- Candidate: **CR-C01**, this ticket; **Local Fix**, implementation owner.
- Location: `autobyteus-ts/src/tools/terminal/command-execution/native-command-process-scope.ts:52-58,101-115`; effect reaches `background-process-manager.ts:64-68` and `tools/stop-background-process.ts`.
- When a shell has completed but its preview is still live, automatic maintenance puts its inspection promise in `operations`. An explicit tool stop arriving during the awaited snapshot returns that promise immediately. Maintenance correctly sees a live child and returns `unconfirmed: Group still active`, but no drain was attempted. The tool reports cleanup failure and the child keeps running. Because stop intent was set, later maintenance skips this lease until a subsequent explicit stop or host close.
- Source-grounded reproduced receipt: CR-01 first case returns `unconfirmed`, survivor84831 remains, scope size1. Finally, an actual host close succeeds and scope size0; a separate read-only `ps -p 84831` finds no row.
- Required correction: serialize against maintenance, then re-evaluate retirement and perform the actual stop if needed, respecting the original bounded deadline and exactly-once settlement. Only actual pending stop work can satisfy another stop. Add a regression at the scope/manager boundary for this supported overlap; preserve empty-retirement, duplicate stop and host-close behavior.
- This is not a request for a new coordinator, timer, or product lifetime policy. The reviewed scope already owns this sequence.

### CR-002 — P2 / Medium — Release foreground captures that have no background record
- Candidate: **CR-C02**, this ticket; **Local Fix**, implementation owner.
- Location: `autobyteus-ts/src/tools/terminal/background-process-manager.ts:14,21-26`; unconditional caller `command-execution/shell-command-executor.ts:27-30`; terminal cleanup `:48-50`; capture deletion exists only in manager explicit stop/stopAll.
- Every ordinary `run_bash` now captures its entire bounded output through the context manager before launch. After successful foreground-only completion, the scope retires its lease and the executor removes only its own listeners. The manager's strong `outputs` Map still retains the handle, streams and buffer despite having no background-process record. No public PID stop can clear this capture because no record exists. Repeated normal commands therefore accumulate one retained entry (up to1MB of output plus handle state) per command for the context lifetime. This is new retention, not pre-existing background-history policy.
- CR-01 second case runs3 real foreground-only `printf` commands: **0 live leases, 0 background records, 3 captures, 51 retained bytes**. This is a small correctness/lifetime witness, not an OOM or performance benchmark claim.
- Required correction: give pre-adoption output capture an explicit release/ownership lifecycle (or an equivalent non-retaining implementation). Preserve live/adopted output and any deliberately retained background record. Add tests proving repeated foreground-only completion and failed launch do not retain unused captures, alongside survivor-output preservation. No application/agent shutdown policy change is needed.

## Checks And Evidence
Read implementation Checks Run before deciding to execute anything. **No recorded successful suite/build was rerun just for reassurance.** Source unchanged since10990feb1 preserves the supplied IMP-13..18 results:132 core +141 Electron +209 server +11 component =493 passing; production server/core/shared and Electron types/build pass. IMP-19/20 remain implementation self-validation of the packaged conflict/retry/recovery and no-active-work quit only.

New focused command (from worktree root):
```bash
env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" autobyteus-ts/node_modules/.bin/vitest run --config tickets/in-progress/backend-port-conflict-20261024/evidence/probe.config.mjs tickets/in-progress/backend-port-conflict-20261024/evidence/CR-01-native-review.probe.test.ts
```
- Output: `evidence/CR-01-native-review.log`; source: `evidence/CR-01-native-review.probe.test.ts`.
- Result: **2 failed assertions**, each caused by the corresponding source defect above; not environment failures. No rerun or base run needed: exact new code cause established. First probe controls one real observer await to expose the supported maintenance/stop interval; second runs real ordinary commands and inspects retention. They are reviewer investigation artifacts, not API/E2E coverage.
- Cleanup: both `finally` blocks close their scope and assert no unconfirmed outcomes; temporary roots removed; live lease counts0. First child's absence also checked read-only after completion. No installed app, user data, paid model/provider, or unrelated process was touched.
- Independent inventory command: git base/current numstat + nonempty counts (recorded `evidence/CR-02-source-audit.json`). Two pre-existing untracked SDK dist directories are untouched; no build outputs staged.
- Next round: implementation records rerun-by-impact plan. Core changes are a shared-foundation impact under TESTING.md; restore affected scoped checks/types before source re-review, then independent API/E2E. Do not simply reinterpret these failures as passes.

## Follow-ups
- Added by this review: **None**.
- Existing FU-001 remains separate exploratory full test-tree typing debt, not a production build failure or score deduction.

## Classification / Recommended Recipient
**Fail — Local Fix, implementation-owned**, CR-001/002 → `/software_engineering_team/implementation_engineer` via returned source-review Local Fix rule. No Design Impact/Requirement Gap established. No API/E2E advance or informational pass notification.

## Residual Risks
- Actual full-host/desktop Codex conversation-launched yielded listener cleanup is still required. SR-006 standalone client success and native anchors do not establish the reported incident fixed.
- Full Studio/standalone ended-agent and active native-work shutdown through the changed desktop remains downstream evidence, including TERM resistance, unrelated sentinel/data preservation and honest forced failure.
- Live Windows/WSL remains unrun; mocked transport/order/argv and macOS feasibility are not platform certification. Actual updater installation is prohibited; preserve continuation testing without installation.
- Review source evidence does not supersede independent API/E2E, final integration verification, documentation sync or cleanup/release decisions.

## Latest Authoritative Result
- Decision: **Fail**; entry point **Implementation Review**, round1 / **CRR-001**, Full Review.
- Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass**.
- Score: **9.1/10, 91/100**, with runtime/readiness/cleanup below9 and two blocking local findings.
- Failure origin: new implementation defects, not an API/E2E failure-origin round.
- Recipient: **implementation_engineer**. Large/High retained; no source fixes, merge, install or release performed.
