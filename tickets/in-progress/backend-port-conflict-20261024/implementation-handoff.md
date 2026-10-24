# Implementation Handoff

## Outcome / Upstream Package
**Design Impact — IMP-DI-001: specify continuous ownership for a short-lived shell's adopted child before dependent implementation.** No production implementation is claimed.

- Workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`
- Branch: `task/backend-port-conflict-20261024`; production/check baseline `956405c80778083455256a5dbe4edb2f583811db`.
- Authoritative inputs in this ticket: `requirements-doc.md` R1 Approved; `investigation-notes.md`; `solution-revision-record.md` SR-001..003; `design-spec.md` D2; `solution-handoff.md`; `design-review-report.md` and `architecture-review-revision-record.md` ARCH-REV-002 Pass.
- Supplements read: P-003/P-005 fixtures and probe inventory, P-006 transport limitations. No behavior-defining supplements.
- Implementation cycle: Initial; record `implementation-revision-record.md`, **IR-001**.
- Related revisions: SR-001/SR-002/SR-003, ARCH-REV-002; CRR/API-REV/DR: N/A.
- Incoming triggering findings: N/A; new finding: IMP-DI-001.

## Routing Classification
- task_size: **Large**; architectural_risk: **High**; carried unchanged from D2 classification section.
- Classification confirmed against cross-package process-lifetime/OS-signalling scope; implementation is not complete.
- Selected route: **Solution Designer**, per returned Design Impact rule. No source-review or validation-complete route applies.
- Direct-route self-review: Not Applicable.
- Escalation trigger: D2 explicitly requires returning unsafe/unverifiable group identity for refinement; the supported short-lived shell path has an unfilled ownership-continuity mechanism.

## IMP-DI-001 — Concrete Missing Mechanism
Requirements REQ-003/004, AC-004/005 and BEH-003/004 require both cleaning the ordinary adopted survivor and not signalling a recycled numeric group. D2's Bounded Local Spines says to capture birth identity at spawn, retain live anchors when the leader exits, and fail closed if all anchors are lost. It forbids rediscovering ownership from an old PGID alone. ARCH-REV-002 also explicitly calls out the ordinary short-lived `run_bash` survivor case.

Current `shell-command-executor.ts:33-42` spawns the command directly. `:119-137` observes/adopts survivors only after the shell has exited, with an additional 75ms delay. Capturing the initial leader earlier is necessary but insufficient: the child may not yet exist in that snapshot. When adoption observes the child, the only previously captured anchor (the leader) is already gone. There is then no live matching anchor from which to authorize the new child under D2's rule.

**Measured:** IMP-02 used the actual resolver and the same detached spawn options, initiated a bounded `ps` snapshot immediately after spawn (before any await), then took a second snapshot after exit. All 10 samples saw the leader but not its child initially, and the child but not the leader after exit: `"observationsWithoutOverlappingOwnedAnchor":10`. The probe separately invoked the actual production ShellCommandExecutor + BackgroundProcessManager: a plain `/bin/sleep 60 &` command returned and adopted its still-live child (`adoptedPid:63070`). This is an ordinary supported command, not deliberate daemon escape, PID reuse, or an installed-app interaction.

**Evidence qualification:** IMP-01's initial hypothesis that the *first* immediate snapshot would miss the leader was disproved (0/10). Its failed test/source/log are retained. IMP-02 corrects the interpretation: this is loss of overlap between spawn and adoption, not demonstrated failure to capture the initial leader. These probes do not prove every conceivable observation strategy impossible. They establish that the currently specified capture/retention/adoption steps do not supply the continuous authority needed for the supported path; opportunistic polling would require its own bounded, failure-safe rationale and cannot be assumed to remove the gap.

**Requested design resolution:** specify the concrete launch/group-lifetime mechanism that keeps verifiable authority until adoption and throughout retained background lifetime, including fast foreground completion, timeout/abort and host close. One candidate to evaluate is a command-group anchor/launch protocol whose lifetime and handoff are explicit; this is not implemented or prescribed as the approved design. Ensure the chosen mechanism also establishes an exclusively owned WSL group (current resolver `:104-121` only emits PID/PGID and invokes bash; no explicit group/session creation). WSL observation here is source-only, not a second runtime finding or certification claim. Do not weaken R1 or allow raw-PGID reclamation to avoid the missing mechanism.

## Reviewed Behavior Implementation Trace
| Behavior | Actual path / outcome |
| --- | --- |
| BEH-001 / BEH-002 | No production change; typed diagnosis/UI and retry still pending. |
| BEH-003 | Production native executor/manager exercised; baseline group-stop defect reconfirmed. Ownership continuity blocks dependent implementation. |
| BEH-004 | Only private temp roots, task-spawned PIDs and OS-assigned fixture port used; no external signalling or user-data changes. |

Scope guardrail respected. No ordinary agent/idle behavior changed. No historical Nuxt ownership inferred. No installs, release, integration, merge, shared-checkout edits or provider calls.

## Key Files / Current Delta
Only ticket evidence and implementation artifacts added. Production remains at review baseline. Evidence sources: `evidence/IMP-01-initial-hypothesis.ts` (frozen initial failing hypothesis), `evidence/IMP-01-short-lived-anchor.probe.test.ts` (corrected probe), and logs listed below. No normal regression tests have been authored or represented as passing fixes.

## Design Health / Removal / Data Checks
- Reviewed posture: bug fix with application-lifetime completion; root cause remains ownership boundary/missing invariant.
- Refactor Needed Now remains appropriate, but target mechanism needs refinement. Routed as Design Impact, not an implementation patch around authority.
- No compatibility mechanisms or expanded shared structures introduced.
- Legacy removal/dead cached accessor removal remains blocked/pending with production implementation. No production source files touched or size limits affected; no unrelated dead-code follow-up established.
- Shared design principles reapplied: approved supported scenario, ownership clarity, safety and truthful evidence.
- Persisted-data decision: **Not Affected**, unchanged; no migration/reset/data writes beyond disposable probe roots.

## Environment / Checks Run
macOS Darwin arm64, Node v26.12.0; existing task-local dependencies. Clean environment commands; no new dependency setup/build. The probe config selects other files but `-t` skips their tests. Command prefix below is `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" autobyteus-ts/node_modules/.bin/vitest run --config tickets/in-progress/backend-port-conflict-20261024/evidence/probe.config.mjs` from worktree root. All checks exercised production baseline `956405c80778083455256a5dbe4edb2f583811db` with new uncommitted probe source; evidence is persisted with this handoff commit.

| Check | Command suffix / code exercised | Behavior / criteria | Result | Evidence | Look for |
| --- | --- | --- | --- | --- | --- |
| IMP-01 | `-t 'IMP-01'`; frozen initial source, actual resolver/spawn + immediate observation | BEH-003/004, AC-004/005 | **Fail**, initial hypothesis disproved, not product acceptance | `evidence/IMP-01-short-lived-anchor.log` | `"firstSnapshotMissingLeaderWithLiveChild":0`; `"cleanupRemaining":[]` |
| IMP-02 | `-t 'IMP-01'`; corrected probe, initial/post-exit snapshots plus real executor/adoption | BEH-003/004, AC-004/005 | **Pass as reproduction only**, no fix implemented | `evidence/IMP-02-anchor-continuity.log` | `"observationsWithoutOverlappingOwnedAnchor":10`; `"adoptedCount":1`; `"cleanupRemaining":[]` |
| IMP-03 | `-t 'group leader exit'`; supplied P-005 through real manager.stopAll | BEH-003/004, AC-004/005 | **Pass as baseline bug assertion only** | `evidence/IMP-03-baseline-group-stop.log` | `"stopAllReported":1,"listenerSurvived":true`; exact owned child cleanup receipt |

Source change between IMP-01 and IMP-02 corrected the test premise; failed evidence is not overwritten. Final read-only `ps` on all 23 fixture-child/leader PIDs returned no rows. Per-run roots were removed in finally. No retained fixture resources.

## Frontend / Remaining Validation
Frontend feedback loop **not performed**: no frontend implementation exists yet. UI state, long/unavailable identities, English/zh-CN, monitor summary and shared declarations remain required after implementation. Not a visual verification claim.

Not run: package builds/typechecks, durable regression suites, full Studio/standalone close, changed Electron build/quit/restart/conflict recovery, updater continuation, Windows transport/failure tests or WSL runtime. No API/E2E sign-off. They remain downstream obligations after design recovery and implementation; preserve D2's 3s/20s+2s/30s budgets, data sentinel and unrelated-process-survival checks. Reviewer's pass is a design pass only.
