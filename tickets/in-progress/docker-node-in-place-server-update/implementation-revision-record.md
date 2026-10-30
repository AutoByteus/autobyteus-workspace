# Implementation Revision Record — autobyteus-305

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A (N-1 notes followed) | `Initial Baseline` | `SR-005`, `ARCH-REV-002`; `CRR-*`, `API-REV-*`, `DR-*`: N/A | Build step 1 implemented, ready for code review |
| IR-002 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass), build step 2 | N/A (carried: CR-N1 code side) | `Initial Baseline` (step 2) | `SR-005`..`SR-007`, `ARCH-REV-003`; step 1: `CRR-001`, `DR-001` | Build step 2 implemented, ready for code review |

## Revision Entries

### IR-001 — Build step 1: signed server package

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-002, Pass), round 2
- Triggering finding IDs: N/A. Non-blocking note N-1 was applied: the authoritative sections govern (`<node>-server-packages`, the DS-004 `system-level.json` shape).
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: step 1 implemented and checked locally (IMP-01..IMP-11 Pass); Large / High confirmed; route Code Review
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation round (design-spec "Change / Refactor Sequence", step 1)
- Approved behavior or requirement IDs affected: REQ-009 / AC-011 (publish and byte identity); groundwork for REQ-004 and REQ-008 (signature, system level); BEH-001 preserved; Removal plan items; derived consumers of the old layout
- Implementation delta:
  - `Dockerfile.monorepo`: a `server-package` stage; the runtime starts from the chrome-vnc base pinned by digest and carries `/opt/autobyteus/server-package` instead of the workspace copy.
  - `system-level.json` and its CI check.
  - The release workflow: the level check, the base digest per variant, and the `publish-server-package` job.
  - The describe, sign and key scripts, and the public key. The secret `SERVER_PACKAGE_SIGNING_KEY` was created after the user was told.
  - Removed: `bootstrap.sh` and its environment.
  - Consumers, docs and tests updated.
  - Two gaps were closed inside the design (handoff A-1: refs before packages are refused with a way out; A-2: the escaping self-link is removed, plus a guard).
- Changed files or areas: commits `01c56f1b95` (code, docs) and `5c33c1b7b0` (TESTING.md); see the handoff's Key Files
- Local validation and result: IMP-01..IMP-11 Pass. Both architectures' archives are byte-identical to the image's folder (IMP-06, IMP-07). The archives are 0.28 GB (QR-001).
- Next recipient or routing: Code Reviewer (Large / High), per `get_handoff_rules`
- Remaining limitations or risks: the real release path, including the secret/key pairing and the 30-minute release wait, is proven only by the first release. Steps 2–5 are not started; step 5 waits for autobyteus-284, -285 and -287.

### IR-002 — Build step 2: starter and server-packages volume

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass: the ARCH-REV-002 Pass covers step 2), after step 1 was finalized (DR-001, merge `eec6522b27`)
- Triggering finding IDs: N/A. Carried from step 1: CR-N1, code side. The reviewer's non-blocking note (supervisord `stopwaitsecs`) is applied.
- Classification: `Initial Baseline` for build step 2
- Prior authoritative result: IR-001 (step 1) passed code review CRR-001 and API/E2E, and was delivered
- Current authoritative result: step 2 implemented and checked locally (IMP2-01..IMP2-08 Pass); Large / High confirmed; route Code Review
- Related solution revision IDs: `SR-005` (SR-006, SR-007)
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: N/A (step 2)
- Related API/E2E revision IDs: N/A (step 2)
- Related delivery revision IDs: N/A (step 2)
- Why this revision is recorded: the next build step (design-spec "Change / Refactor Sequence", step 2)
- Approved behavior or requirement IDs affected: BEH-001 / REQ-012 / AC-006 (selection, NEEDS_NEW_IMAGE); BEH-007 / REQ-011 (status: C2, C1 GET); DS-003, DS-007; AC-009 (the phone refusal on the new route); C1, C2 (status), C4 now live
- Implementation delta:
  - the starter (`autobyteus-server-ts/docker/starter/`): boot, recovery, cleanup, selection, ServerSupervisor, socket, `cli.mjs status`;
  - C1 GET `/rest/node-update` (owner route);
  - image: supervisord runs the starter; `/opt/autobyteus/system-level`;
  - launcher (bash, PowerShell): `<node>-server-packages`, config hash v7, storage text; PowerShell `ContainerConfig.ps1` split for the size rule;
  - shared release-version vectors;
  - the e2e Prisma test reads the pid from the starter;
  - CR-N1;
  - docs, and TESTING.md (its own commit).
  - Deviations D-1 (boot order), D-2 (track table and launcher status deferred to step 3) and D-3 (recovery before it is reachable) are explained in the handoff.
- Changed files or areas: commits `b1029fc1b0` (code, docs) and `82e2e7f931` (TESTING.md); see the handoff's Key Files
- Local validation and result: IMP2-01..IMP2-08 Pass:
  - 26 starter tests;
  - 176 script tests;
  - 294 server tests around the change, and the typecheck;
  - the gates;
  - in a test container: boot, C1/C2, the phone refusal, crash restart, supervisord stop, and the three selection outcomes.
- Next recipient or routing: Code Reviewer (Large / High), per `get_handoff_rules`
- Remaining limitations or risks:
  - PowerShell not executed (no `pwsh`);
  - the launcher upgrade path and the Docker e2e probes are left to API/E2E;
  - the trial recovery path becomes reachable only with step 3.

