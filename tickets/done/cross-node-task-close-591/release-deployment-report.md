# Delivery / Release / Deployment Report

## Scope

Deliver `codex/cross-node-task-close-591` (Project Task `autobyteus-591`, cross-node Task close; `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`) into `origin/personal`. **Status (2026-11-21): `Blocked` at the initial integration refresh.**

## Release Decision

`No release` unless the user asks (RELEASE.md default).

## Initial Delivery Integration Refresh

- Merge base `7591aa307f`; latest `origin/personal` `6533d7be04` (release `v1.5.14-beta.6`; tickets 583, 594, 15, 16, 22, …). No change under `src/app-data-migrations/` on either side.
- Checkpoint `4e16b9a136` (the review documents that were untracked).
- Merge attempt: **3 conflicts**, one hunk each; aborted, branch clean:

| File | Base | This branch |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | `443f1c2c0f` (autobyteus-22, Team runs follow their definition) | `52a1507b80`, `00851c5c8d` (RC-51…53, SR-010) |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | `d005fa2a5b` (22: leaving marker, committer-owned release) | `a811f94348` (DN-9) |
| `docs/design-cases.md` | `014e281990` (autobyteus-583) | `fca9214b2c` (CRR-002 design case) |

- `global-agent-run-message-router.ts` itself auto-merges, but both 22 and this ticket changed its behavior: the merged state needs its checks.
- Routed to the implementation engineer (Local Fix), then the merge review and API/E2E on the merged state (the two-server suite at least).

## Docs sync note kept for later

- `autobyteus-web/tests/e2e/mobile-shell-probe.mjs:192-194`, MSP-93's catalogue line: "returns when beta gives it the Task again" → "returns when the assigner's message continues it (SR-010)" (the code reviewer's note).

## Second pass (2026-11-21)

- Integration: IR-003 merge `037e6bec5c` of `6533d7be04` (the three conflicts keep both sides; in the router DN-9's `admitPeerRun` runs first, 22's `ownsAgentRun` adds a Team's former members), CRR-005 Pass; API/E2E round 3 (API-REV-003) Pass at 95%; CRR-006 Pass. `origin/personal` still `6533d7be04`.
- Build-only release run: not required. Against the merged base this ticket changes no build input (`scripts/`, `.github/`, `package.json`s, the lockfile, Nuxt config).

## Verification

- Evidence judged: `Sufficient`.

| AC | Cases and files checked | What I saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | RC-10, RC-11, RC-49, RC-51 (Task page) | `API-r3-runs.txt` §3 "Tests  55 passed (55)"; `API-r3-rc-receipt.json`; r2 receipts | Proven |
| AC-002 | RC-23, a scripted AGY member held mid-turn (`HOLD_TURN`) | same suite | Proven. AC-002's verification is a "Two-node E2E"; the member is a real process held mid-turn and is interrupted. A real model as that member: not tested, a residual risk (the closure Stop is the same for every runtime); no `DEC-*` was needed |
| AC-003 | RC-23 (another open Task) | same suite | Proven |
| AC-004 | RC-52 (beta down, alpha and beta restarted, 30 s retry, an older beta's 404 keeps it owed; a reopen alone still stops; a continued run never recorded closed) | r2 runs §1 "rfOutcome …"; r3 suite 55/55 | Proven (aligned with REQ-002 at `f39a92d5d3`) |
| AC-005 | RC-35 (a third node refused) | same suite | Proven |
| AC-006 | RC-11, RC-51, MSP-93 (desktop and phone) | `API-r3-runs.txt` §5 "[mobile-shell] MSP-93 Pass"; r2 screenshots | Proven |
| AC-007 | RC-54 (agent; renamed from 591's RC-51), RC-53 (Team), RC-52 (B unreachable), RC-09; RC-55 with 22 | r3 §3 | Proven |

- User check needed: `No`.
- Residual: a real runtime mid-turn (above); FU-591-01 (base-side); both nodes on the same release (release notes).

## Release Decision

`No release` (not requested). `release-notes.md` ready.
