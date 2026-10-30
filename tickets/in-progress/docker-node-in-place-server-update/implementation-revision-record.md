# Implementation Revision Record — autobyteus-305

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A (N-1 notes followed) | `Initial Baseline` | `SR-005`, `ARCH-REV-002`; `CRR-*`, `API-REV-*`, `DR-*`: N/A | Build step 1 implemented, ready for code review |
| IR-002 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass), build step 2 | N/A (carried: CR-N1 code side) | `Initial Baseline` (step 2) | `SR-005`..`SR-007`, `ARCH-REV-003`; step 1: `CRR-001`, `DR-001` | Build step 2 implemented, ready for code review |
| IR-003 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-004 Pass), build step 3 | N/A (N-2, N-3 applied) | `Initial Baseline` (step 3) | `SR-009`, `ARCH-REV-004`; step 2: `CRR-003`, `API-REV-002`, `DR-002` | Build step 3 implemented, ready for code review |
| IR-004 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-005 Pass), build step 4 | N/A (N-4 and CR3-N1 applied) | `Initial Baseline` (step 4) | `SR-005`, `SR-009`, `ARCH-REV-005`; step 3: `CRR-005`, `DR-003` | Build step 4 implemented, ready for code review |

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

### IR-003 — Build step 3: in-place update by command

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-004 Pass for SR-009), after step 2 was finalized (DR-002, merge `a0f4b491f7`)
- Triggering finding IDs: N/A. ARCH-REV-004 notes N-2 (one gate rule for `updateBlocker` and the request) and N-3 (launcher `status`/`update` against stopped or pre-starter containers) are applied.
- Classification: `Initial Baseline` for build step 3
- Prior authoritative result: IR-002 (step 2), passed CRR-003 and API-REV-002, delivered
- Current authoritative result: step 3 implemented and checked (IMP3-01..IMP3-10 Pass); Large / High confirmed; route Code Review
- Related solution revision IDs: `SR-009`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review / API/E2E / delivery revision IDs: N/A (step 3)
- Why this revision is recorded: the next build step (design-spec "Change / Refactor Sequence", step 3)
- Approved behavior or requirement IDs affected:
  - BEH-003, BEH-004, BEH-005;
  - REQ-001, REQ-002, REQ-004, REQ-005, REQ-006, REQ-008, REQ-012, REQ-013, REQ-015;
  - AC-002..AC-006, AC-008, AC-012, AC-013;
  - DS-002, DS-006, DS-007;
  - RU-23, CR2-N1.
- Implementation delta:
  - the starter's update path: UpdateService, UpdateRun, ReleaseSource, PackageVerifier, SelfCheck, DataCopy take, PackageStore install and trial transitions, ServerSupervisor modes, the shared server-process helper;
  - C2 `POST /updates` and `cli.mjs update`;
  - C1 `updateBlocker`;
  - the image carries the public key;
  - launcher `update` and the `status` line in bash and PowerShell;
  - docs.
- Defects my container proof found, fixed in this round:
  - a stop past the point of no return raced the starter's exit and left a misleading INTERRUPTED message (`4985104751`: the run now halts, and the boot rolls back);
  - an update stopped after its download left its package on the volume (`c72107a0fd`: boot keeps only the current and the previous package);
  - FAILED_AFTER_SWITCH now says how the new version ended.
  - I also fixed two test races found while repeating the starter suite: the stop-during-trial test, and the post-rollback health read.
- Changed files or areas: commits `31df015657`, `4985104751`, `c72107a0fd`, `71604951d4`; see the handoff's Key Files
- Local validation and result: IMP3-01..IMP3-10 Pass:
  - 48 starter tests, also 10 runs in a row;
  - 184 script tests;
  - 295 server tests and the typecheck;
  - lint and gates;
  - the real-container proof on an image built from a clean clone of `c72107a0fd`, with a test key and a local release source. It covered AC-002..AC-006, AC-008, AC-012, AC-013, NOT_ENOUGH_SPACE for the package and for the package plus copy, NO_PACKAGES_VOLUME, the tracks, and stops during the copy, the trial and the restore.
- Next recipient or routing: Code Reviewer (Large / High), per `get_handoff_rules`
- Remaining limitations or risks:
  - the launcher on real Docker and PowerShell execution are left to API/E2E;
  - the release that ships step 3 must tell launcher users to reinstall the launcher, then `upgrade --all` (RU-23);
  - the production key and the GitHub path are proven only by a release.

### IR-004 — Build step 4: the desktop's version line and "Update to <version>"

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-005 Pass), after step 3 was finalized and released in beta v1.5.11-beta.6 (DR-003)
- Triggering finding IDs: N/A. Applied: N-4 (the C1 `error` row, a failed GET outside an update) and CR3-N1 (the self-check message and output tail). The optional `previous` cleanup is left out.
- Classification: `Initial Baseline` for build step 4
- Prior authoritative result: IR-003 (step 3), passed CRR-005, delivered
- Current authoritative result: step 4 implemented and checked (IMP4-01..IMP4-06 Pass); Large / High confirmed; route Code Review
- Related solution revision IDs: `SR-005`, `SR-009`
- Related architecture-review revision IDs: `ARCH-REV-005`
- Related code-review / API/E2E / delivery revision IDs: N/A (step 4)
- Why this revision is recorded: the next build step (design-spec "Change / Refactor Sequence", step 4)
- Approved behavior or requirement IDs affected: BEH-002, BEH-007; REQ-003, REQ-007, REQ-011; AC-001, AC-009, AC-010; DEC-018; DS-001, DS-005
- Implementation delta:
  - C1 `POST /rest/node-update` (relay with `requestedFrom` = the client address);
  - `nodeServerUpdateStore` and `NodeServerUpdate.vue` under remote rows, with en and zh-CN texts;
  - the guide card's `update --all`;
  - the starter's self-check message and output tail.
- Changed files or areas: commit `deead7bf05`; see the handoff's Key Files
- Local validation and result: IMP4-01..IMP4-06 Pass:
  - the full web suite (4889 tests), the guards and both typechecks;
  - the server route tests and the starter tests;
  - the real desktop app (an isolated worktree build) updating a test Docker node from 1.5.11-beta.5 to 1.5.11-beta.6 by the button, in the same container, with AC-009 and AC-010 shown on the node side.
- Next recipient or routing: Code Reviewer (Large / High), per `get_handoff_rules`
- Remaining limitations or risks:
  - Q-1, whether the update button should confirm first, is open for the Solution Designer;
  - zh-CN was not rendered;
  - "Downloading…" and the long-down path were not seen in the real app (both unit-tested);
  - AC-007 is step 5.

