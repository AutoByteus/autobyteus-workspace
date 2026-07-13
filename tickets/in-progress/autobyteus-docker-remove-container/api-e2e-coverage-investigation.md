# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/design-spec.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/ui-ux-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/tickets/in-progress/autobyteus-docker-remove-container/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Frontend follow-up source review passed for implementation commit `73f09e5c`
- Prior Investigation Reviewed: Round 1 backend/Docker coverage investigation and execution
- Latest Authoritative Investigation: Yes

## Current Requirement And Design Basis

The reviewed change adds `destroy --name <normalized-managed-node>` to the Bash and PowerShell public launchers while preserving explicit `destroy --all`. The targeted path must validate selector grammar before state/Docker setup, resolve ownership through state plus the complete exact set of `com.autobyteus.launcher=server-docker` and `com.autobyteus.nodeName=<node>` labels, refuse ambiguity/disagreement/collisions without mutation, remove at most the proven container, delete and verify only the selected launcher state, preserve named volumes and host workspaces, and perform image cleanup only after successful state cleanup. A stale state-only node may be explicitly forgotten. The Buildx container is a separate owner and must not be removed.

Critical acceptance criteria are AC-001 through AC-012, with AC-010 covering duplicate/disagreement/collision handling, AC-011 checked partial cleanup, and AC-012 preflight ordering. The implementation handoff confirms the approved persisted-data decision: discard/rebuild selected launcher metadata; named volumes and host workspaces are not affected. No migration or compatibility branch is in scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Targeted `destroy --name` command grammar and dispatch | Added | Requirements R-001/R-002/R-012; `commands.sh` and `Commands.ps1` | Execute valid, invalid, conflicting, missing-value, extra-argument, and malformed-selector forms before any setup. |
| Deterministic managed-node resolver | Added/Changed | Requirements R-003/R-010; runtime resolver functions | Exercise stateful, stale, label-only, duplicate, disagreement, malformed-state, and unmanaged-collision cases. |
| Checked selected-state deletion and partial-failure result | Added | Requirements R-004/R-011; `remove_state_file_checked` / `Remove-NodeStateChecked` | Inject filesystem deletion failure and assert nonzero, retained state, no rollback claim, and no image cleanup. |
| Targeted Docker/image lifecycle | Added | Requirements R-005/R-006; runtime destroy path | Assert only selected `docker rm`, no volume/prune operations, image cleanup ordering/scope, and other nodes remain. |
| Stale-state status and lowest-index reuse | Changed/Preserved | Requirements R-004 and approval record; existing allocator | Execute status after forget and `new-container` slot reuse. |
| Buildx/unmanaged ownership boundary and public docs/help | Changed | Requirements R-007/R-008; three README files and help | Assert unmanaged/Buildx names fail and both platform source contracts document the owner boundary. |
| Bash/PowerShell platform parity | Preserved/Added | Requirements R-009; parallel modules | Run Bash executable scenarios; run PowerShell parser when available and retain source-contract parity assertions otherwise. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No application/backend code changed. | N/A | None in this task. | None |
| API / transport / contract | No | No network API changed. | N/A | None. | None |
| Frontend component / state | No | No frontend changed. | N/A | None. | None |
| Browser integration / user journey | No | Shell CLI only. | N/A | None. | None |
| Authentication / session / permissions | No | No auth/session behavior. | N/A | None. | None |
| Desktop renderer / web-equivalent UI | No | No desktop renderer changed. | N/A | None. | None |
| Desktop shell / Electron-specific integration | No | No desktop shell changed. | N/A | None. | None |
| Process / lifecycle | Yes | Public Docker launcher command, container removal, state cleanup, image cleanup. | Isolated fake-Docker durable tests and disposable real-Docker CLI probe. | Fake Docker does not prove Docker daemon interpretation of filters/labels; real probe is selected to close this bounded gap. | CLI/lifecycle with disposable Docker resources. |
| Persisted-data transition | Yes | Selected `.env` launcher metadata is discarded; volumes/workspaces are preserved. | State-file/status/slot-reuse checks and fake call records. | No real volume-content preservation test is needed for a no-volume-delete command, but real Docker can inspect volume absence if created. | CLI/lifecycle. |
| Worker / queue / distributed coordination | No | No worker/queue/multi-node coordination changed. | N/A | No. | None |
| External integration | Yes | Docker CLI is an external dependency; Buildx remains explicitly outside scope. | Fake Docker emulation plus one disposable real Docker target. | PowerShell runtime unavailable locally; concurrent-operator races out of scope by approved design. | CLI with Docker daemon; PowerShell parser when available. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container`
- Project type and runtime stack: POSIX Bash/PowerShell public CLI modules, Docker CLI, Python `unittest` fake-Docker harness.
- Conflicting, missing, or unclear project instructions: No task-specific `AGENTS.md` applies under `scripts/`; root README and `autobyteus-server-ts` Docker docs are the applicable operational guidance. `pwsh` is not installed in this environment. Python is 3.9.6, so the documented baseline `zip(..., strict=True)` error is expected and unrelated.
- Required environment variables or secrets available: N/A; isolated tests set `HOME`, `AUTOBYTEUS_DOCKER_STATE_DIR`, `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`, `FAKE_DOCKER_ROOT`, and a test-only `PATH`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `README.md` | Public launcher usage and test guidance | Use `autobyteus-docker destroy --name`; keep named volumes; Buildx cleanup is `docker buildx rm multi-platform-builder`; no live Docker mutation is prescribed for this task. |
| `autobyteus-server-ts/README.md` | Public launcher operational docs | Same targeted lifecycle, slot reuse, state location, volume and Buildx ownership guidance. |
| `autobyteus-server-ts/docker/README.md` | Docker-specific operational docs | Public launcher is preferred; source helper is separate; Buildx is created by `build-multi-arch.sh`. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Existing executable coverage boundary | Use `unittest`, isolated fake Docker, temporary state/home/workspace; run narrow tests first, then full module. |
| `scripts/public/docker/autobyteus-docker.sh` and `.ps1` | Public entry loaders/installers | Bash can be run directly or source-loaded; PowerShell parser is tested only if `pwsh` exists. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fake Docker CLI | Task worktree, unittest fixture | `python3 -m unittest ...` creates a temporary fake `docker` at the front of `PATH` | No live Docker mutation; records calls and container metadata under a temporary root. | `docker info` fake returns success; call records are asserted. | `TemporaryDirectory` cleanup. |
| Bash launcher | Task worktree | Tests invoke `scripts/public/docker/autobyteus-docker.sh` with isolated env. | Real Bash and Python subprocesses; no persistent services. | Command exit/output plus state/container files. | Temporary environment cleanup. |
| PowerShell launcher | Task worktree | Parser test invokes `pwsh` only when available; source-contract parity runs unconditionally. | `pwsh` unavailable locally, so executable PowerShell result is not fabricated. | `command -v pwsh`; skipped parser test when absent. | N/A. |
| Disposable real Docker target | Task worktree | Later targeted probe creates uniquely named labeled container(s) and an isolated launcher state file. | Uses only resources created by the probe; a holder prevents the target image from being removed if needed. | `docker info`, `docker inspect`, launcher status/exit and call behavior. | `trap` removes unique containers/state/temp directory; no user containers or Buildx resources touched. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Two managed nodes and state | Existing `new-container` path in fake-Docker fixture | Temporary state and fake containers only. | Fixture temp cleanup. |
| State-only stale node | Test helper writes valid `.env`, omits corresponding fake container | Proves explicit forget without Docker rm. | Fixture temp cleanup. |
| Label-only/duplicate/disagreement/collision | Test helper writes container metadata with explicit label/node values and state records | No live resource; all refusal cases assert no state or Docker mutation. | Fixture temp cleanup. |
| State deletion failure | Valid state then remove write permission on temporary state directory after setup | Failure is injected at filesystem boundary; no root escalation. | Temp directory cleanup restores ownership/removes files. |
| PowerShell parity | Combined Bash/PowerShell source contract assertions plus optional parser test | Does not claim runtime execution without `pwsh`. | N/A. |

## Persisted Data Transition Coverage Basis

- Approved decision (`Discard or Rebuild`): selected launcher state is intentionally deleted; Docker named volumes and host workspaces are not affected.
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision” and `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: valid node state plus managed fake container; after targeted destroy only selected state/container disappears, while workspace directories and the other node remain. A stale state record is explicitly forgotten and disappears from `status`.
- Evidence planned for the approved discard/rebuild outcome: targeted state path absence, status output, lowest-free-index recreation, call-record absence of volume/prune commands, and optional real Docker target.
- Migration-specific completion/recovery scenarios: Not applicable; no schema migration.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_mutating_commands_do_not_default_to_all_nodes` | Rejects unqualified mutating commands; expected destroy error updated by implementation. | R-002/R-012, AC-006/AC-012 | Still Valid | Explicit selector contract is approved; the changed assertion matches current behavior. | Retain and add preflight side-effect assertions. |
| `...::test_powershell_launcher_parses_when_pwsh_is_available` | Parses all PowerShell public source files when runtime exists. | R-009, AC-008 | Still Valid | Existing skip is honest when `pwsh` is absent. | Retain; execute if availability changes. |
| `...::test_powershell_launcher_matches_the_shared_workspace_cli_contract` | Checks parallel Bash/PowerShell source contracts and shared workspace behavior. | R-009, AC-008 | Needs Update | It currently lacks targeted destroy invariants. | Add parity assertions for help, resolver, checked cleanup, and Buildx ownership. |
| Existing new-container/workspace/upgrade/parser tests in same module | Prove launcher install, ports, state, workspace mounts, image refs, and all-node guard. | AC-001/AC-002/AC-006/AC-007 related preserved behavior | Still Valid | Source review found no regressions; existing fixture remains the intended isolation boundary. | Retain; run focused and full suites. |
| Live Docker user environment | Read-only investigation only; no durable test. | Buildx ownership context, not a mutation criterion. | Out Of Scope | User's existing containers must not be changed by coverage. | Use unique disposable resources only if real probe is run. |

## Stale Or Obsolete Coverage Decisions

No durable test is stale or removed. The existing unqualified-destroy assertion was intentionally updated in the implementation commit, not removed: it now asserts the approved explicit-selector refusal.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | Targeted destroy removes only selected managed node, state, and image candidate; preserves other node, workspace, and volume/prune safety. | R-001/R-003/R-004/R-005/R-006; AC-001/AC-002/AC-003 | Existing shared-workspace unittest module | Core lifecycle regression must remain executable and isolated. |
| API-002 | Stale state-only destroy forgets metadata; status has no missing row; next allocation reuses lowest free index. | R-004; AC-003/AC-004 and approved slot reuse | Existing shared-workspace unittest module | This is the reported user problem and persisted-state transition. |
| API-003 | Unknown, Buildx/unmanaged, and same-name collision refuse without rm/state mutation. | R-003/R-007; AC-005/AC-010 | Existing shared-workspace unittest module | Ownership boundary is safety-critical. |
| API-004 | Duplicate exact candidates, state/label disagreement, malformed/mismatched state refuse closed. | R-010; AC-010 | Existing shared-workspace unittest module | Prevents arbitrary first-match destructive selection. |
| API-005 | State-delete failure returns nonzero partial cleanup, retains state, makes no rollback claim, and stops image cleanup. | R-011; AC-011 | Existing shared-workspace unittest module | Error path is a critical lifecycle guarantee. |
| API-006 | Invalid selector forms fail before state-dir creation and Docker info; Bash and PowerShell contracts/help agree. | R-002/R-009/R-012; AC-006/AC-008/AC-012 | Existing shared-workspace unittest module | Guards parser purity and platform drift. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-006 | `test_mutating_commands_do_not_default_to_all_nodes` | Add assertion that invalid destroy forms leave no state directory and no `docker info` call. | R-012/AC-012 | Keep existing upgrade behavior assertions. |
| API-006 | `test_powershell_launcher_matches_the_shared_workspace_cli_contract` | Add targeted destroy help/resolver/cleanup/ownership tokens for both platform source bundles. | R-009/AC-008 | Source parity is the available PowerShell-equivalent evidence. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `bash -n scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.d/bash/{core.sh,docker-runtime.sh,commands.sh}` | Task worktree | Bash syntax | Pass | `execution-evidence/bash-syntax.log` |
| 2 | `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py` | Task worktree, Python 3.9.6 | Durable test syntax | Pass | `execution-evidence/python-compile.log` |
| 3 | Focused `python3 -m unittest ...` for API-001 through API-006 plus docs/parity | Task worktree, isolated fake Docker | Targeted destroy lifecycle, stale/slot reuse, ownership refusal, ambiguity/disagreement, malformed state, partial cleanup, all-node safety, preflight, source parity, docs | Pass — 11 tests | `execution-evidence/focused-unittest.log` |
| 4 | `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` | Task worktree, Python 3.9.6 | Existing launcher regression suite and baseline comparison | Fail with baseline debt only — 27 pass, 2 skipped, 2 pre-existing failures, 1 pre-existing error; no task-specific failure | `execution-evidence/full-unittest.log` |
| 5 | `git diff --check` | Task worktree | Patch whitespace | Pass | `execution-evidence/diff-check.log` |
| 6 | `python3 -m unittest ...test_powershell_launcher_parses_when_pwsh_is_available` | Task worktree | PowerShell parser gate | Pass as an honest skip; `pwsh` and `powershell` unavailable | `execution-evidence/powershell-parser.log`, `powershell-availability.log` |
| 7 | `execution-evidence/real-docker-targeted-destroy.sh` | Task worktree; actual Docker daemon; unique target/holder/volume and isolated state | Real Docker exact labels, selected `rm`, state deletion/status cleanup, named-volume preservation, image-holder safety | Pass; exit 0 and cleanup verified | `execution-evidence/real-docker-targeted-destroy.log` |

The full-suite failure is not attributed to this change: the installer quote expectation and preferred-port availability assertion are existing environment/test debt, and `zip(..., strict=True)` is unsupported by Python 3.9.6. The new targeted tests all pass independently and in the full run.

## Post-Repository Confidence Scorecard

These scores are the checkpoint after durable repository coverage and before the real-Docker probe below.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | API-001 through API-006 plus docs/parity checks directly cover AC-001–AC-012 in the isolated Bash fixture. | PowerShell executable runtime remains unavailable; real daemon path is pending. | Disposable real Docker target and PowerShell host execution. |
| Changed-boundary execution directness | 90% | Fake-Docker invokes the real Bash launcher and records Docker/state effects for the complete targeted matrix. | Real daemon behavior and PowerShell runtime remain unproven. | Disposable real Docker target; `pwsh` parser/runtime if available. |
| Cross-boundary integration realism and mock gap | 85% | Fake CLI models labels, inspect, ps, rm, and image calls. | Fake Docker is not a real daemon and does not prove Docker filter semantics. | Real Docker disposable container. |
| Environment, configuration, identity, and fixture fidelity | 85% | State/home/workspace are isolated and deterministic; fake labels/state are explicit. | Windows/PowerShell environment and actual daemon are unavailable at this checkpoint. | Real Docker and PowerShell host validation. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Duplicate candidates, disagreement, malformed/mismatched state, collision, stale state, preflight, partial cleanup, all-node preservation, and slot reuse all pass. | Concurrent operator race is explicitly out of scope. | No additional failure matrix needed; real success path still helps lifecycle confidence. |
| User-surface, browser, and desktop-shell confidence | N/A | This is a shell CLI; browser and desktop surfaces are not applicable. | None for this task. | N/A. |
| Durable regression coverage quality and relevance | 95% | 11 focused tests use the existing isolated fixture, map to requirements, and retain all existing coverage; source-contract parity and docs checks are durable. | Full suite retains unrelated baseline debt. | Proportional test-code review by `code_reviewer`. |

- Overall post-repository confidence: 90.0% across six applicable categories (N/A excluded), calculated as `(90 + 90 + 85 + 85 + 95 + 95) / 6`.
- Every critical acceptance criterion directly proven: No; real daemon and PowerShell runtime evidence were pending at this checkpoint.
- Any applicable category below 90%: Yes — cross-boundary realism (85%) and environment fidelity (85%).
- Default clean-confidence target of 95% met: No.
- Material residual risks: fake-vs-real Docker boundary; PowerShell runtime unavailability; no concurrent-operator race test (approved out of scope).

## Broader Validation Decision

- Decision: Required — executed successfully for the real Bash/Docker boundary.
- Selected execution mode: CLI / Lifecycle with disposable real Docker resources; PowerShell parser attempted when available.
- Specific confidence gap addressed: fake Docker did not prove real Docker label enumeration, exact label inspection, `docker rm -f`, actual state transition, image-holder behavior, or named-volume survival.
- Why the selected mode materially improved confidence: the real probe created only uniquely named containers, an isolated launcher state file, and a unique named volume, then verified the selected target was removed, state/status were cleaned, the holder remained, and the volume remained.
- Expected versus actual confidence: expected at least 95% for the Bash/Docker boundary; actual final score is 94.5% overall because PowerShell/Windows remains unavailable.
- Browser-specific decision and rationale: Not applicable; no browser/user journey changed.
- If `Not Required`: Not applicable; the required real Docker probe was executed.
- If `Blocked`: only PowerShell runtime validation remains environment-blocked after an attempted Homebrew preview installation failed because `sudo` required an interactive password; Bash/Docker validation was not blocked.

## Desktop Application Validation Decision

- Desktop framework / shell: Not applicable.
- Relevant README or development instructions: Root and Docker READMEs; no desktop instructions apply.
- Web-equivalent behavior: None.
- Shell-specific or lifecycle behavior: CLI parsing and Docker lifecycle are the changed boundaries.
- Chosen validation approach and why it fits the project: isolated fake-Docker repository coverage followed by a disposable real Docker lifecycle probe.
- Server/frontend setup when browser validation is used: None.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: PowerShell runtime/Windows JSON/filesystem semantics remain unproven; source parity and conditional parser test remain the available evidence.

## Live Environment And Fixture Plan

- Startup order and commands: verified `docker info`; created a unique holder and target with exact launcher/node labels and a unique named volume; wrote one isolated Bash `.env` state file; invoked targeted destroy; checked target/state/status/volume/holder; cleanup trap removed only owned resources.
- Environment choices that materially affected the run: task worktree; macOS host; unique `codex-api-e2e-*` resources; holder retained the image to prevent unrelated image deletion; no Buildx or user launcher state was touched.
- Health / readiness checks: `docker info`, target label inspect, target/container/state/volume/holder checks before and after.
- Seed data / fixtures: one real managed-label target, one unlabelled same-image holder, one unique named volume, one state record.
- Test identities, authentication, permissions, or session state: None.
- Requirement-linked journeys or scenarios: LIVE-001 equivalent of API-001/AC-001–AC-003 and volume safety; fake-Docker tests cover the full refusal matrix.
- DOM, screenshot, log, API, process, or other evidence to capture: `execution-evidence/real-docker-targeted-destroy.log` includes labels, launcher output, target/state/volume/holder exit checks, and status output.
- Owned processes and temporary state to clean up: unique target/holder containers, unique volume, and temporary state/shared workspace; cleanup verified no `codex-api-e2e-*` leftovers.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-001 | `execution-evidence/real-docker-targeted-destroy.sh` with unique real Docker resources and cleanup trap | Real daemon label/state/`rm` boundary, status cleanup, and named-volume preservation | Durable fake-Docker tests are deterministic and safer for the full matrix; real daemon evidence is environment-sensitive and must not retain resources. |
| PS-BLOCKED-001 | `pwsh` parser/runtime command; parser test executed as skip | PowerShell syntax/runtime parity when the runtime is present | No runtime was available; source parity is durable, executable validation must run on a PowerShell-capable host. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| PowerShell executable runtime and Windows JSON/filesystem behavior | `pwsh` and `powershell` are absent; Homebrew stable cask was unavailable and preview installation required interactive sudo. | Platform-specific parser/runtime drift could remain. | Run parser and equivalent scenarios on a Windows/PowerShell-capable environment before release if available; do not fabricate a pass. |
| Concurrent operator race between final label verification and rm | Explicitly outside approved design scope. | A concurrent Docker mutation could change target after proof. | No follow-up unless concurrency becomes a requirement. |
| User's live Buildx container | Must not mutate user-owned infrastructure. | No live mutation evidence of refusal. | Durable unmanaged/Buildx fake scenario, source/docs checks, and real probe that used separate names are sufficient and safe. |

## Ambiguities Or Reroute Triggers

None. The approved requirements and design specify all targeted resolver cases, partial cleanup, preflight, and Buildx ownership. No test-validity or requirement gap was discovered during execution.

## Investigation Decision

- Proceed To API/E2E Execution: Completed
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes; focused fake-Docker scenarios and Bash/PowerShell source-contract/docs parity checks added in `scripts/tests/test_public_docker_launcher_shared_workspace.py`.
- Post-repository confidence: 94.5% overall applicable-category average; no applicable category below 90%.
- Broader validation decision: Required and completed for Bash/Docker; PowerShell execution remains unavailable, not blocked for the overall task.
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: Feature scenarios pass; full-suite baseline debt is preserved separately. The package is ready for proportional durable test-code review, with PowerShell/Windows runtime validation explicitly noted as residual risk.

---

# Frontend Follow-up Coverage Investigation — Round 2

## Investigation Meta

- Trigger: Frontend implementation source review passed for commit `73f09e5c`, code review Round 2.
- Reviewed upstream supplement: `ui-ux-spec.md`, approved for the static Nodes -> Docker Guide follow-up.
- Frontend changed paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web/utils/dockerNodeLauncherCommands.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web/localization/messages/en/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web/localization/messages/zh-CN/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`

## Frontend Requirement And Design Basis

R-013/AC-013 require the in-app Docker Guide to show exactly `autobyteus-docker destroy --name <node-name>`, instruct users to replace the placeholder using an exact node from `autobyteus-docker status`, explain state/container removal with named-volume and workspace preservation, and explain indexed-slot reuse. R-014/AC-014 require equivalent English and Simplified Chinese meaning, existing copy/ARIA/feedback behavior, and no node picker, live lookup, backend/API call, Docker reachability check, or command execution.

The UI supplement defines a static data flow: typed command catalog -> existing generic `DockerNodeStartGuideCard` / `CommandCard` -> locale title/description -> existing clipboard copy feedback. No API, service, persisted state, browser storage, or desktop-shell behavior is introduced.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Evidence Directness | Residual Risk | Broader Validation Candidate |
| --- | --- | --- | --- | --- |
| Static frontend command catalog | Yes | Utility unit test inspects exact ID, order, command, phase, platform, and placeholder-only invariant. | Low; no runtime dependency. | None beyond repository tests. |
| Localization / localized parity | Yes | Utility test inspects English and zh-CN title/description keys and required safety meaning. | Translation quality beyond required tokens is bounded by source review. | Optional manual locale render; not required for static data. |
| Guide component rendering/copy/ARIA | Yes | Vue Test Utils component test mounts the real component, checks card text/pre, copy button, clipboard payload, copied feedback, ARIA label, and absence of fetch/target. | Browser layout/visual rendering not directly tested; existing generic component is unchanged. | Browser validation considered, but not required because no browser-specific behavior or responsive change was added. |
| Backend/API/Docker runtime | No | Static test spies `window.fetch`; implementation source review confirms no API/runtime import or call. | None from this frontend patch. | None. |
| Browser integration / user journey | No material new boundary | Existing component test exercises the same Vue render/copy boundary in happy-dom; no route or browser API beyond clipboard mock changed. | Real browser clipboard permission behavior is inherited from the existing card. | Browser smoke is optional, not required. |
| Desktop shell / Electron | No | No Electron imports or shell lifecycle changed. | None. | None. |
| Persisted data transition | No | UI only describes backend-owned discard/rebuild and volume-preservation semantics. | None in frontend. | None. |
| External integration / live lookup | No | No node-status lookup, Docker call, or backend request exists. | None. | None. |

## Project Execution Discovery — Frontend

- Applicable instructions: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web/AGENTS.md`.
- Project/runtime: Nuxt/Vue 3, TypeScript, Vitest 3, Vue Test Utils, happy-dom/jsdom test environment, pnpm 10.
- Authoritative commands from the instructions and implementation handoff:
  - `pnpm exec nuxt prepare`
  - `pnpm exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts --config vitest.config.mts`
  - `pnpm guard:localization-boundary`
  - `pnpm guard:web-boundary`
  - `pnpm audit:localization-literals`
  - `pnpm exec tsc --noEmit --pretty false` (diagnostic repository-wide gate; known noisy baseline)
- Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-docker-remove-container/autobyteus-web`.
- Available setup: `node_modules` exists under `autobyteus-web`; no service, account, fixture, secret, or database is required.
- Cleanup: commands are repository-local and do not start a persistent service or mutate user data.

## Existing Durable Coverage Inventory — Frontend

| Path / Scenario | Current Assertion / Intent | Related Requirement | Validity Decision | Action |
| --- | --- | --- | --- | --- |
| `utils/__tests__/dockerNodeLauncherCommands.spec.ts` exact command list and placeholder tests | Verifies command IDs/order, exact targeted command, no concrete node, locale guidance parity. | R-013/R-014; AC-013/AC-014 | Still Valid | Run unchanged; this is direct utility/catalog evidence. |
| `components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` guide rendering/copy tests | Verifies command appears in mounted guide, existing copy feedback, clipboard payload, ARIA label, no fetch/live target. | R-013/R-014; AC-013/AC-014 | Still Valid | Run unchanged; this is direct component-boundary evidence. |
| Existing generic `CommandCard` behavior in `DockerNodeStartGuideCard.vue` | Owns rendering, copy, ARIA, and feedback for all commands. | R-014; AC-014 | Still Valid / Out Of Scope for source change | The follow-up does not alter component implementation; focused component tests exercise its behavior with the new catalog entry. |
| Backend fake-Docker launcher tests and real-Docker probe from Round 1 | Prove runtime command semantics, not frontend rendering. | R-001–R-012; AC-001–AC-012 | Still Valid | No rerun required for a static frontend-only patch; prior authoritative report remains cumulative evidence. |

## Durable Coverage Validity And Changes

- No frontend durable test is stale, removed, or requires replacement.
- Durable test code was added in the implementation follow-up commit and is now being executed/reviewed proportionally; this coverage stage does not add another test file.
- No API, E2E browser, or live integration test is appropriate for a static instructional catalog with explicit no-execution requirements.

## Planned Frontend Execution

| Order | Command | Boundary / Evidence | Result |
| --- | --- | --- | --- |
| 1 | `pnpm exec nuxt prepare` | Nuxt-generated types/setup remains valid. | Planned |
| 2 | Focused two-file Vitest run with `--run` | AC-013/AC-014 utility and component behavior. | Planned |
| 3 | `pnpm guard:localization-boundary` | Locale boundary contract. | Planned |
| 4 | `pnpm guard:web-boundary` | Static web-boundary restrictions; no runtime dependency leak. | Planned |
| 5 | `pnpm audit:localization-literals` | Localization literal hygiene. | Planned |
| 6 | `pnpm exec tsc --noEmit --pretty false` | Diagnostic type check; classify only follow-up-specific errors. | Planned |
| 7 | Browser/live API validation decision | Determine whether repository checks directly prove the changed boundary. | Planned |

## Initial Frontend Confidence And Broader Validation Decision

- Initial confidence before rerun: 90% based on source review and implementation-reported focused checks; execution evidence is still independently required.
- Browser decision: `Not Required` if focused mounted-component tests, utility tests, guards, and localization audit pass. The changed surface has no route, responsive behavior, real browser permission flow, API, live lookup, or shell-specific boundary; the generic copy interaction is directly exercised with a controlled clipboard mock.
- Live API/Docker decision: `Not Required`; requirements explicitly forbid frontend live lookup/execution and production code has no such dependency.
- Type-check expectation: repository-wide TypeScript may fail on known unrelated Vue/module declarations; any new error mentioning the changed five paths must be investigated before Pass.
- No reroute is currently indicated.

## Temporary / Not Tested

| Boundary | Decision | Reason / Risk |
| --- | --- | --- |
| Real browser clipboard permissions | Not Tested | Existing generic component behavior is unchanged and focused component coverage proves the command's copy path with a deterministic clipboard mock. |
| Live Docker/API/node status | Not Tested by design | The UI must remain static and must not execute or resolve a target. |
| Electron shell | Not Applicable | No shell-specific code changed. |

## Investigation Decision — Frontend Round 2

- Proceed to frontend API/E2E execution: Yes.
- Durable coverage changes by this stage: None; execute and validate the already-added focused utility/component tests.
- Broader validation: Not Required if repository checks pass.
- Reroute before execution: No.

## Frontend Round 2 Execution Results

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm exec nuxt prepare` | Pass | `frontend-execution-evidence/nuxt-prepare.log`; `.nuxt` types generated. |
| 2 | `pnpm exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts --config vitest.config.mts` | Pass — 2 files, 7 tests | `frontend-execution-evidence/focused-vitest.log`. |
| 3 | `pnpm guard:localization-boundary` | Pass | `frontend-execution-evidence/guard-localization-boundary.log`. |
| 4 | `pnpm guard:web-boundary` | Pass | `frontend-execution-evidence/guard-web-boundary.log`. |
| 5 | `pnpm audit:localization-literals` | Pass with non-blocking Node module-type warning | `frontend-execution-evidence/audit-localization-literals.log`. |
| 6 | `pnpm exec tsc --noEmit --pretty false` | Diagnostic fail with repository baseline errors; no follow-up-specific production error | `frontend-execution-evidence/tsc.log`; changed test import reports the known missing Vue module declaration pattern. |
| 7 | `pnpm test:nuxt --run` | Diagnostic fail: 350 files passed, 5 failed, 1 skipped; failures are unrelated to changed frontend paths | `frontend-execution-evidence/full-nuxt-vitest.log` and `.result`. |
| 8 | `git diff --check` | Pass | `frontend-execution-evidence/git-diff-check.log`. |

The five full-suite failures are in workspace-history draft integration, MemoryHome, CodexFullAccessCard, managedExtensionService, and zh-CN glossary consistency. None references the changed command catalog, locale entries, or Docker guide card. The focused changed-boundary tests pass.

## Frontend Final Confidence Scorecard

| Confidence Category | Score | Support | Residual Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Utility and mounted-component tests directly cover AC-013/AC-014: exact command/order, placeholder-only safety, status-first guidance, localized meaning, rendering, copy, feedback, ARIA, and no fetch/target. | Full browser rendering is not independently run, but no layout/route/component implementation changed. |
| Changed-boundary execution directness | 95% | Real command catalog and real `DockerNodeStartGuideCard` component are executed in focused Vitest; Nuxt prepare and guards pass. | Browser clipboard permission behavior remains inherited. |
| Cross-boundary integration realism and mock gap | 95% | The only production path is catalog -> existing component -> localization/copy; tests exercise that path directly. No API or Docker boundary exists by design. | Clipboard is mocked as in the existing component test environment. |
| Environment, configuration, identity, and fixture fidelity | 95% | Nuxt/Vitest setup generated types and ran under the project Node/pnpm environment; locale catalogs and static command data load successfully. | Windows visual/browser runtime not exercised; command is platform-neutral installed CLI text. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Placeholder-only/no-execution and existing copied feedback assertions pass; no new lifecycle or error branch was added. | Real clipboard rejection and visual overflow are inherited component behavior, not changed by this patch. |
| User-surface, browser, and desktop-shell confidence | 95% | Mounted component verifies rendered card, semantic button, ARIA label, `<pre>` command, copied feedback, and no live lookup. Browser validation is not materially additive for this static data-only addition. | No screenshot or real browser clipboard permission evidence. |
| Durable regression coverage quality and relevance | 95% | Existing focused utility/component tests are requirement-linked, deterministic, and passed; source review found no test-structure issue. | Full repository suite retains unrelated baseline failures. |

- Overall frontend confidence: 94.3% across seven applicable categories, simple average.
- Every critical frontend acceptance criterion directly proven: Yes for the changed static/component boundary; no live API/browser validation is required by the approved static design.
- Any applicable category below 90%: No.
- Default clean-confidence target of 95% met: No; bounded browser clipboard/visual uncertainty remains, though it is inherited and not material to this change.
- Material residual risks: repository-wide baseline TypeScript/Vitest failures unrelated to the follow-up; real browser clipboard permission behavior and screenshots not exercised.

## Frontend Broader Validation Decision

- Decision: Not Required.
- Rationale: The changed behavior is a static typed catalog and localized copy rendered through an unchanged generic command card. Focused utility and mounted-component tests exercise the actual changed boundary, including no-fetch/no-execution behavior, command copy, feedback, ARIA, and placeholder safety. No route, responsive CSS, API, live lookup, Electron integration, or new browser-specific behavior was added.
- Browser decision: Not Required; a browser run would not materially improve confidence over the direct component test for this patch. Existing generic clipboard behavior is authoritative and unchanged.
- Live API/Docker decision: Not Required by explicit design; the frontend must not call these boundaries.
- If a later requirement adds real browser visual/accessibility or clipboard-permission behavior, run targeted browser validation then.

## Frontend Round 2 Investigation Decision

- Proceed to API/E2E execution: Completed.
- Durable coverage changes in this coverage stage: No; implementation-provided focused utility/component tests remain valid and passed.
- Broader validation: Not Required.
- Reroute: No.
- Next workflow recipient: `code_reviewer` for the separate proportional durable test-code review of the frontend test changes.
