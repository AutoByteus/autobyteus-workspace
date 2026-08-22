# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/terminal-cwd-policy.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/code-review-revision-record.md`
- Historical API/E2E investigation/report/revision record: same canonical paths, but `API-REV-001` is superseded by the absolute-only reset and is not approval evidence for this round.
- Current API/E2E Revision ID: `API-REV-002` (created after this round completes)
- Current Investigation Round: `2` (fresh absolute-only contract reset)
- Trigger: Fresh code-review pass `CRR-003` for implementation commit `95f538b66` / `IR-002`.
- Prior Investigation Reviewed: `Yes` for history only; prior `API-REV-001` result/confidence is explicitly superseded and will not be reused as current evidence.
- Latest Authoritative Investigation: This file after fresh absolute-only repository, package-consumer, and documentation-boundary execution.

## Current Requirement And Design Basis

The current approved contract is a clean reset to absolute-only provided cwd values. `run_bash` and `start_background_process` continue to accept an existing accessible absolute directory anywhere local process access permits, including outside the workspace. If `cwd` is omitted or null, the configured workspace root remains the default, otherwise `os.tmpdir()` remains the default. Any provided relative value is invalid regardless of workspace configuration and must fail with `Working directory must be an absolute path.` before workspace joining, physical resolution, target shell creation, executor invocation, manager invocation, or background-record creation.

Absolute candidates retain physical normalization, directory/type validation, host cwd access preflight, existing working-directory error mapping, symlink-to-accessible-directory support, and external-directory support. Process owners retain command output, timeout/abort, ordinary background adoption, PID identity, output/status/stop lifecycle, and result shapes. Explicit cwd remains invocation/process-scoped and does not mutate workspace identity or later calls.

The current design also requires exact concise serialized field descriptions: `Optional working directory for the command.` for `run_bash` and `Optional working directory for the process.` for `start_background_process`. Tool-level descriptions and both durable docs must express absolute-only provided cwd, omitted defaults, per-call/process scope, and the non-sandbox distinction. The generic file-tool path/base_dir/edit_file contract must remain unchanged; only the bounded terminal cross-reference in `docs/tool_schema_and_configuration.md` may change. Interactive server/web terminal, file explorer, multimedia, MCP/provider runtime, persisted data, and desktop UI boundaries remain out of scope except for focused boundary inspection.

The current implementation handoff's legacy/compatibility check is clean: the previous relative branch was removed rather than retained behind a flag or fallback. Persisted data remains `Not Affected`. Current code review `CRR-003` passed with no findings, but its local checks are source-review evidence only; fresh API/E2E execution below is required. The earlier API-REV-001 package/runtime result is historical and superseded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Current Approved Evidence | Fresh Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / foreground absolute cwd | Preserved from prior implementation, current reset revalidated | REQ-001/005/008; AC-001/007; `runBash` -> resolver -> executor | Fresh direct and registered-tool `pwd` in external absolute temp directory; built consumer probe. |
| BEH-002 / managed background absolute cwd | Preserved from prior implementation, current reset revalidated | REQ-002/005/008; AC-002/007; resolver before manager | Fresh registered-tool lifecycle and built consumer start/output/status/stop. |
| BEH-003 / provided relative cwd | Changed | REQ-003/006; AC-003/004/006/007; current resolver rejects before resolution | Fresh foreground/background configured/no-workspace relative rejection with no executor/manager call and zero background records. |
| BEH-004 / omitted cwd defaults/statelessness | Preserved | REQ-004/006; AC-005 | Fresh workspace-root, tmpdir, and repeated-call stateless checks. |
| BEH-005 / absolute validation/preflight | Preserved and narrowed to absolute candidates | REQ-005; AC-006/007; MP-001 | Fresh missing/file/inaccessible/symlink/no-spawn matrix; relative input must not reach physical/fs resolution. |
| BEH-006 / schemas/docs/generic-doc boundary | Changed | REQ-007/009; AC-008/009; current exact field strings and two-doc contract | Fresh serialized schema/docs test plus explicit generic file-tool section non-change comparison against parent. |
| BEH-007 / unrelated boundaries | Preserved | REQ-010; AC-010; current diff scope | Fresh selected file/multimedia/interactive terminal checks and source/doc boundary inspection; MCP fixture availability checked separately. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Absolute-only classification in `execution-cwd.ts` | Unit/no-spawn tests and direct resolver path | Windows ACL/WSL platform behavior | Built package CLI probe; Windows unavailable |
| API / transport / contract | Yes | Registered tool cwd fields/descriptions and serialized provider schemas | Schema tests and registered-tool integration | External consumer/provider package runtime | Packed package consumer |
| Frontend component / state | No | No frontend source/state changed | Diff and scope review | None | None |
| Browser integration / user journey | No | No browser boundary | Requirements and diff | None | None |
| Authentication / session / permissions | No | Local OS cwd accessibility only | Temp permissions fixtures | Windows ACL semantics | Windows runner if available |
| Desktop renderer / web-equivalent UI | No | No renderer/UI changed | Handoff and diff | None | None |
| Desktop shell / Electron-specific integration | No | No Electron/preload/IPC changed | Handoff and diff | Packaged app embedding not exercised | Package import is sufficient for changed package boundary |
| Process / lifecycle | Yes | Resolver rejects relative before process owners; absolute lifecycle retained | Unit spies plus real terminal integration | Windows/WSL process adapter | Built package lifecycle probe |
| Persisted-data transition | No | No stored data/schema changed; `Not Affected` | Requirements/design/handoff | None | None |
| Worker / queue / distributed coordination | No | No workers/queues/nodes | Scope review | None | None |
| External integration | No | No network/provider dependency; local shell only | Credential-free tests | MCP adjacent fixture unavailable | No live external integration needed |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools`
- Project/runtime stack: TypeScript ESM package `autobyteus-ts`, Node.js `v22.23.1`, pnpm `10.28.2`, Vitest `4.0.18`, macOS arm64 POSIX shell.
- Instructions: No `AGENTS.md` exists under `autobyteus-ts`. The server/web `AGENTS.md` files are package-local and do not apply to this backend-only boundary. Root README build/E2E guidance confirms package builds use pnpm filters; no server, frontend, browser, desktop, credentials, or API service is needed for this changed owner.
- Required environment variables or secrets: `N/A`; tests are credential-free and `tests/setup.ts` sets `APP_ENV=test`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/package.json` | Package scripts/build | No test script; use `pnpm exec vitest run`; `pnpm run build` cleans dist, compiles, verifies runtime dependencies. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/vitest.config.ts` | Test runner | Node environment, `tests/setup.ts`, 20s timeout, one-shot `run`; tickets/tmp fixtures excluded. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/package.json` | Workspace package manager | pnpm `10.28.2`; package filtering available. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/README.md` | Root build/E2E guidance | General workspace build paths; server/web/Electron flows are not selected for this backend-only change. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/setup.ts` | Test setup | Credential-free `APP_ENV=test`. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` dependencies | `autobyteus-ts` | Already provisioned; documented fallback `pnpm install --filter autobyteus-ts... --frozen-lockfile` | No service/database/browser/API key | Node/Vitest import and package build | No process; do not alter lockfile |
| POSIX terminal fixtures | Vitest or `/tmp` probe | Temporary dirs and child processes | Real local shell/PIDs owned by run | `pwd`, result/effectiveCwd, PID output/status/stop | `finally` stops PIDs; fixture hooks remove dirs |
| Built package | `autobyteus-ts` | `pnpm run build`; pack/install disposable local tarball | Fresh dist/package export check; historical package evidence is not reused | ESM subpath imports and probes | Remove disposable consumer/temp roots |
| Generic docs boundary | Repository root | Python/shell comparison against `HEAD^` generic section | No runtime service | Exact expected diff shape and generic contract markers | No state created |

| Data / Fixture / Identity Need | Existing Mechanism / Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Workspace/external directories | Existing Vitest `mkdtemp` helpers; probe uses `fs.mkdtempSync` | Isolated local temp roots | Test/probe `finally` cleanup |
| Inaccessible absolute cwd | Existing POSIX chmod `0o600` fixtures | Windows tests unavailable; no cross-platform claim | Restore permissions before removal |
| Relative cwd no-spawn | Existing direct public tool calls with executor/manager spies and manager count | No target shell is launched | Manager fixture remains per-test and is removed by temp context |
| Identity/auth/session | None | No account, auth, or shared state | N/A |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- References: current `design-spec.md` persisted-data decision and `implementation-handoff.md` transition check.
- Existing data/setup: N/A; cwd/effectiveCwd are transient invocation/process state.
- Planned evidence: confirm no persistence source/migration path in current diff and run normal package/lifecycle checks only.
- Migration completion/recovery: N/A.
- Reroute needed: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Current Requirement / Acceptance / Design | Validity Decision | Evidence Basis | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/tools/terminal/run-bash.test.ts` absolute/default/validation matrix | Direct foreground and background public functions cover absolute external cwd, no-workspace absolute, symlink normalization, workspace/tmp defaults, missing/file/inaccessible absolute paths, and relative rejection | REQ-001–006/008; AC-001/003–007; DS-001–003 | Still Valid | Current source/test contract uses absolute-only assertions; old relative-success tests are absent | Re-run unchanged. |
| Same unit file relative rejection/no-spawn cases | Configured-workspace and no-workspace relative values reject exact error; executor/manager spies and background process count prove no spawn/record | REQ-003/005/008; AC-003/004/006/007 | Still Valid | Current tests call both public tools and assert before resolution/manager | Re-run unchanged. |
| `tests/integration/tools/terminal/terminal-tools.test.ts` registered external/lifecycle matrix | Absolute foreground external cwd; managed external background cwd with workspace and no workspace (API-001); output/status/stop; omitted defaults/statelessness/timeout/abort/adoption | REQ-001/002/004/006/008; AC-001/002/004/005/007 | Still Valid | API-001 is current source coverage and semantically matches absolute-only contract | Re-run unchanged. |
| Remaining `tests/integration/tools/terminal/*.test.ts` | Shell/process/PTY manager lifecycle and platform-owned terminal behavior | REQ-008/010; AC-007/010 | Still Valid / Out Of Scope by file | Owners unchanged; selected integration run detects regressions without claiming Windows | Re-run selected/full terminal integration per documented command. |
| `tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts` | Exact concise field descriptions, absolute-only tool wording, two docs alignment, generic file-tool contract markers | REQ-007/009; AC-008/009/010 | Still Valid | Current assertions reflect reset; added docs file is included | Re-run unchanged. |
| `autobyteus-ts/docs/terminal_tools.md` and `docs/tool_schema_and_configuration.md` | Absolute-only terminal docs, omitted defaults, non-persistence, interactive distinction, bounded terminal cross-reference; generic file-tool contract preserved | REQ-009/010; AC-009/010 | Still Valid | Current diff matches approved docs reset; generic section requires fresh exact non-change proof | Re-run test and explicit diff-boundary check. |
| `tests/integration/tools/file/*`, selected multimedia and interactive terminal tests | Unrelated generic path and terminal boundary regression | REQ-010; AC-010 | Out Of Scope for direct change but useful regression evidence | No implementation imports/file resolver changes | Run focused file/media/interactive subset; record MCP fixture separately. |
| Historical API-REV-001 tests/reports and delivery artifacts | Earlier relative-plus-absolute contract result | Superseded by current absolute-only reset | Stale / Do Not Reuse As Approval Evidence | Current handoff and CRR-003 explicitly supersede them | Do not use historical results or confidence; append fresh API-REV-002 only. |

## Stale Or Obsolete Coverage Decisions

No current repository-resident stale test remains. The prior relative-success and relative-workspace-accessibility assertions were removed in commit `95f538b66` and are not to be recreated. Historical API-REV-001 reports are superseded records, not coverage to reuse.

## Durable Coverage To Add / Update / Remove

- Durable coverage to add: `None` identified before execution. Current tests already cover absolute-only relative rejection/no-spawn, omitted defaults, external absolute lifecycle, exact schemas/docs, and the generic file-tool marker boundary.
- Durable coverage to update: `None` planned. If execution exposes a current assertion mismatch, update this investigation before any test edit and route the durable change through `/code_reviewer`.
- Durable coverage to remove: `None` planned. No current stale assertion is retained.

## Repository Coverage Execution Plan And Results

Fresh execution followed the investigation order below. Prior API-REV-001 logs and confidence are not used as current evidence.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/tools/terminal tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts --reporter=verbose` | `autobyteus-ts`; current Vitest config | Absolute-only resolver, configured/no-workspace relative no-spawn, omitted defaults, inaccessible absolute, exact schemas/docs | Pass — 18 files / 111 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-unit.log` |
| 2 | `pnpm exec vitest run tests/integration/tools/terminal --reporter=verbose` | `autobyteus-ts`; all six terminal integration files | External absolute foreground/background lifecycle, no-workspace absolute API-001, preserved lifecycle/interactive behavior | Pass — 6 files / 28 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-terminal.log` |
| 3a | Focused adjacent file/multimedia/MCP/direct-interactive terminal command | `autobyteus-ts`; credential-free; MCP configured with `/opt/homebrew/bin/uv` | Generic file boundary, multimedia, direct interactive terminal, and optional MCP setup | Partial execution — 6 non-MCP files / 38 tests passed; MCP failed before startup because required external fixture cwd was absent | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-adjacent.log` |
| 3b | Same adjacent command without MCP test | `autobyteus-ts`; MCP omitted only after explicit setup failure | Generic file path/protected path, multimedia workspace rules, direct interactive shell boundary | Pass — 6 files / 38 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-adjacent-without-mcp.log` |
| 4 | `pnpm run build` | `autobyteus-ts`; current package build and runtime-dependency verification | Fresh compiled `dist` and runtime dependency graph | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-build.log` |
| 5 | Fresh disposable local tarball package-consumer ESM probe | Temporary consumer installed from current tarball; real POSIX shell/PIDs | Built exports, external absolute foreground/background lifecycle, no-workspace absolute, relative rejection/no records | Pass — package imports, foreground/no-workspace cwd, output/status/stop, and both relative rejections passed | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-package-consumer.log` |
| 6 | Fresh generic file-tool documentation boundary comparison, `git diff --check`, changed-path inspection | Worktree root; current docs compared with `HEAD^` | AC-009/010 generic file-tool documentation non-change and terminal-only scope assertions | Pass — generic contract block byte-identical; terminal wording and diff check passed | `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/api-e2e-round2-boundary.log` |

## Post-Repository Confidence Scorecard (Mandatory)

Historical API-REV-001 confidence is not carried forward. These scores are based only on this fresh round's repository execution; the same score is retained for the current final result except where broader package evidence strengthens the explanation.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | Focused 111-test unit/schema matrix, 28 terminal integration tests, package probe, and docs comparator directly cover the current absolute-only contract and omitted defaults | Windows-specific acceptance clauses remain untested; optional MCP adjacent fixture is unavailable | A supported Windows/WSL run and restored MCP fixture |
| Changed-boundary execution directness | 95% | Direct public tools, registered tools, real POSIX processes, and a freshly packed/installed package consumer all exercised the resolver boundary | No Windows package/runtime execution | Supported Windows package-consumer run |
| Cross-boundary integration realism and mock gap | 92% | Real shell/PID foreground and managed background lifecycle, output/status/stop, package exports, and adjacent boundary suites passed; spies are limited to fail-fast no-spawn assertions | Windows/WSL adapter and MCP stdio were not exercised | Windows/WSL and MCP fixture execution |
| Environment, configuration, identity, and fixture fidelity | 90% | Deterministic temp directories, POSIX permission fixtures, pinned Node/pnpm/Vitest, clean packed consumer, and no credentials/shared service state | macOS/POSIX cannot represent Windows ACL/WSL conversion behavior; MCP fixture cwd is absent | Supported Windows/WSL environment and restored external MCP fixture |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | Relative configured/no-workspace rejection with no spawn/record, invalid/missing/file/inaccessible/symlink cases, defaults/statelessness, timeout/abort, and real output/status/stop all passed | Platform-specific error/access mapping remains untested | Windows ACL/WSL failure matrix |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend, browser, renderer, Electron, or user-surface boundary changed | None in scope | None |
| Durable regression coverage quality and relevance | 95% | Existing colocated tests remain current, deterministic, and requirement-linked; no durable coverage edits were made this round | Proportional reviewer confirmation is still required | None beyond reviewer confirmation |

- Overall post-repository confidence: `93.3%` — `(94 + 95 + 92 + 90 + 94 + 95) / 6`.
- Calculation method: Simple average of applicable scores; user-surface/browser/desktop is N/A and excluded.
- Every critical acceptance criterion directly proven: `Yes` for the host-applicable macOS/POSIX terminal boundary; Windows/WSL-specific behavior is explicitly not tested and not inferred.
- Any applicable category below 90%: `No`.
- Default clean-confidence target of 95% met: `No` — bounded Windows/WSL and MCP setup residuals remain.
- Material residual risks: Windows ACL and host-before-WSL accessibility ordering, WSL conversion/runtime, normal cwd preflight TOCTOU, and missing MCP fixture cwd.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `CLI` and `Lifecycle` through fresh built package-consumer probe, plus repository docs-boundary checks.
- Specific confidence gap: Current source/unit/integration evidence does not prove the freshly built package export/runtime after the absolute-only reset; generic documentation non-change also needs explicit integrated-state evidence.
- Why selected mode materially improves confidence: It exercises the packed current dist artifact through the public subpath boundary, real shell/PID lifecycle, relative rejection, and no-workspace absolute behavior; docs comparison proves the reset did not alter generic file-tool semantics.
- Expected confidence after selected validation: 93–95% on macOS/POSIX with no applicable category below 90%; Windows/WSL remains an explicit untested platform residual.
- Browser-specific decision: `Not Required` — no browser/user journey or renderer boundary changed.
- If `Not Required`, direct evidence: N/A because CLI/lifecycle broader validation is required.
- If `Blocked`, unavailable dependency after safe setup/emulation: Windows/WSL is unavailable by environment; do not fabricate a result. MCP was attempted; `/opt/homebrew/bin/uv` exists (`uv 0.10.2`) but the configured external cwd `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus_mcps/pdf_mcp` is absent, so the test failed with `spawn /opt/homebrew/bin/uv ENOENT` before MCP startup. This optional adjacent gap does not block the changed terminal boundary.

## Desktop Application Validation Decision

- Desktop framework/shell: Not applicable; no Electron/preload/IPC/renderer source changed.
- Relevant instructions: Root README packaged Electron section is outside this package boundary.
- Web-equivalent behavior: None.
- Shell-specific/lifecycle behavior: Node non-interactive shell and background manager are tested directly; Windows WSL adapter remains platform residual.
- Chosen approach: Current package unit/integration plus fresh packed package-consumer CLI/lifecycle probe; actual desktop launch would not exercise the changed owner.
- Effect on running desktop application: `None`.
- Unproven behavior consequence: Windows/WSL only; no desktop-shell uncertainty added.

## Live Environment And Fixture Plan

- Startup order/commands: Run fresh focused tests; run selected adjacent tests; build current package; pack/install disposable consumer; execute probe; run boundary/diff checks.
- Environment: macOS arm64, Node `v22.23.1`, pnpm `10.28.2`, POSIX shell, no credentials/network service.
- Readiness: Test summaries, build `[verify:runtime-deps] OK`, package ESM subpath import, foreground exit/effectiveCwd, background PID/output/status/stop.
- Fixtures: Temporary workspace/external directories; inaccessible POSIX directory chmod fixture; relative strings; no persisted data.
- Identities/auth: None.
- Evidence: command logs, stdout/effectiveCwd, PID lifecycle output, schema/docs assertions, exact generic-doc comparison.
- Cleanup: stop probe process in `finally`, remove consumer/temp roots, restore fixture permissions, leave unrelated processes untouched.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Temporary |
| --- | --- | --- | --- |
| API2-TMP-001 | Fresh Node ESM probe from packed current tarball; import terminal subpaths; run external absolute foreground, no-workspace absolute, relative rejection, and managed background lifecycle | Built package exports/runtime for AC-001/002/003/004/007/008 | Existing repository coverage is the durable regression suite; this is a disposable artifact smoke check. |
| API2-TMP-002 | Python/shell docs-boundary comparator against `HEAD^` | Only terminal cross-reference changed in `tool_schema_and_configuration.md`; generic path/base_dir/edit_file section unchanged | Integrated-state assertion specific to this reset; not a reusable product test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Windows ACL and host-before-WSL accessibility | Current environment is macOS arm64; no Windows/WSL runner/ACL fixture | Platform-specific behavior remains unproven | Keep explicit residual; validate only when supported environment exists. |
| WSL conversion/runtime | No WSL distribution available | Adapter/runtime uncertainty | Do not infer from POSIX package run. |
| MCP stdio adjacent check | The configured `/opt/homebrew/bin/uv` exists, but the test's required external cwd `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus_mcps/pdf_mcp` is absent; the test fails at spawn with `ENOENT` before MCP startup | AC-010 MCP sub-boundary remains untested; this is an external fixture/setup gap, not a terminal cwd failure | Record exact missing fixture, run remaining adjacent suites without MCP, and do not claim MCP pass. |
| Full server/web/Electron live journey | No changed transport/UI/desktop boundary | No material evidence gain | Out of scope. |
| Cwd preflight TOCTOU | Inherent filesystem race after access check | Bounded normal runtime risk | No source change; record residual. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recipient |
| --- | --- | --- | --- |
| No current requirement/design ambiguity; absolute-only reset is explicit and architecture/source review passed | None | REQ-003/AC-003/004/006/007 and CRR-003 | None |
| If a current test still expects relative success or current implementation fails relative no-spawn | Local Fix or Design Impact only after evidence | Current requirements require rejection; inspect actual failure before classifying | `/solution_designer` for design mismatch; `/code_reviewer` for test/source failure origin |
| If API/E2E needs durable test edits | Local Fix | Current plan expects no edits; any change must be current-contract aligned | `/code_reviewer` after execution |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`; current coverage remains valid and no test files changed this round.
- Post-repository confidence: `93.3%` with no applicable category below 90%.
- Broader validation decision: `Required` and completed — fresh built package-consumer CLI/lifecycle plus docs-boundary comparator.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: `N/A`.
- Notes: This is a fresh investigation and result for the absolute-only reset. Historical API-REV-001 and delivery artifacts are explicitly not reused as approval evidence. The optional MCP check remains not tested because its configured external fixture cwd is absent; Windows/WSL remains not tested because no supported host is available. No durable coverage edit, removal, or failure reroute was needed.
