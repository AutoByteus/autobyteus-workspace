# Implementation Revision Record

The current code (branch `codex/external-messaging-agent-participant-redesign`) and `implementation-handoff.md` are authoritative. This record only locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass (`design-review-report.md`, ARCH-REV-002, round 2) | N/A (non-blocking N-1, N-2, N-3 addressed or carried) | `Initial Baseline` | SR-016, ARCH-REV-002; CRR/API-REV/DR `N/A` | Implementation complete, commit `a1478259d` |
| IR-002 | Code Reviewer (`code-review-report.md`, CRR-001, round 1) | CR-001 | `Local Fix` | SR-016, ARCH-REV-002, CRR-001; API-REV/DR `N/A` | Out-of-scope SDK `dist/` untracked; amended commit `e9bbb28ab` |
| IR-003 | Code Reviewer failure-origin review of API/E2E G-01 (`code-review-report.md`, CRR-003, round 3; API-REV-001) | CR-002 | `Local Fix` | SR-016, ARCH-REV-002, CRR-003, API-REV-001; DR `N/A` | Tracked messaging runtime file removed; amended commit `40f769e0d` |

## Revision Entries

### IR-001 — Remove external messaging from the main product (initial implementation)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md` ARCH-REV-002 (round 2, Pass).
- Triggering finding IDs: `N/A`. The non-blocking notes are handled as follows:
  - N-2: dispositions are recorded in the handoff "Residue Search Dispositions".
  - N-3: carried to API/E2E as validation obligations.
  - N-1: upstream artifact text, not an implementation item.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete on commit `a1478259d` (503 files; +2280/−32275), ready for code review.
- Related solution revision IDs: `SR-014` (requirements approval), `SR-016` (design)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the first implementation round of the SR-016 design.
- Approved behavior or requirement IDs affected: REQ-101, REQ-102, REQ-103, REQ-114, REQ-116 (preserved), REQ-117, REQ-118, REQ-119 (preserved), REQ-120, REQ-121; BEH-101–BEH-109.
- Implementation delta: design sequence steps 1–7 and 6a. See handoff "Key Files Or Areas". Design-plan deviations DV-1 to DV-8 are listed in the handoff.
- Changed files or areas:
  - Gateway type move: 18 R100 renames, plus 44 import rewrites and the `package.json`/`vitest.config.ts` edits.
  - `autobyteus-ts`, the two contract packages (source + tracked `dist/`), server, web, CI/Docker/scripts, pnpm workspace + lockfile, and docs.
  - Three tickets moved to `tickets/done/`.
- Local validation and result: implementation-scoped checks are listed in the handoff. Every failure found also occurs on a clean `40b1783f4` baseline with identical file and test sets. There are no new typecheck errors.
- Next recipient or routing: `get_handoff_rules` → code review (Large/High).
- Remaining limitations or risks:
  - DV-1: the AgentOrg callback was kept, contrary to one removal-plan row.
  - The Docker all-in-one image build fails for a pre-existing reason: `agent-presentation-contracts` is never copied into the image.
  - The AC-102, AC-103, AC-114, AC-116, AC-117, AC-119, and AC-121 probes belong to the validation stage.

### IR-002 — Untrack out-of-scope generated SDK build output (CR-001)

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/code-review-report.md`, CRR-001, round 1 (Fail → Local Fix)
- Triggering finding IDs: `CR-001`
- Classification: `Local Fix`
- Prior authoritative result: IR-001, commit `a1478259d`. That commit accidentally added 64 files (+1701 lines) under `autobyteus-application-sdk-contracts/dist/**` (52) and `autobyteus-application-backend-sdk/dist/**` (12).
- Current authoritative result: commit `e9bbb28ab`, which amends `a1478259d`. Those folders are no longer tracked. The added files are exactly the 6 designed additions.
- Related solution revision IDs: `SR-016`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded:
  - The server `prepare:shared` step (prebuild/pretest) regenerates the SDK `dist/` folders.
  - `.gitignore` does not cover them, and the IR-001 `git add -A` staged them.
  - They are untracked on base (since `28a8c368e`) and are not in the design inventory.
- Approved behavior or requirement IDs affected: none (hygiene only). REQ-120/AC-120 cleanliness of the change set.
- Implementation delta: `git rm -r --cached autobyteus-application-sdk-contracts/dist autobyteus-application-backend-sdk/dist`, then `git commit --amend --no-edit`. No source or test change.
- Changed files or areas: the index only. The 64 SDK `dist/` files were removed from tracking and remain untracked on disk.
- Local validation and result:
  - `git diff 40b1783f4..HEAD --name-status | grep '^A'` lists 6 entries: the cleanup migration, its unit test, the Prisma migration, and 3 `superseded.md`.
  - `git diff --stat a1478259d e9bbb28ab`: 64 files, 1701 deletions, all under the two SDK `dist/` folders.
  - The only tracked `dist/` changes are the designed contract rebuilds.
  - The IR-001 checks carry over unchanged.
- Next recipient or routing: `get_handoff_rules` → the Local Fix rule for a Large/High package → `/code_reviewer`.
- Remaining limitations or risks: unchanged from IR-001, including the pre-existing Docker all-in-one gap and the validation-stage probes.

### IR-003 — Remove tracked messaging runtime-data file (CR-002)

- Triggering role, report path, and round:
  - `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/code-review-report.md`, CRR-003, round 3. This is a failure-origin review of the API/E2E G-01 finding.
  - API/E2E evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/api-e2e-execution-coverage-report.md` (API-REV-001) and `api-e2e-evidence/G-01/default-data-dir-probe.txt`.
- Triggering finding IDs: `CR-002`
- Classification: `Local Fix`
- Prior authoritative result: IR-002, commit `e9bbb28ab`. It still tracked `autobyteus-server-ts/external-channel/gateway-callback-outbox.json` (`{"version":1,"records":[]}`), committed by accident in `76bd9107d`.
  - When the server runs with the default data dir (the server package root, per `app-config.ts` and the server README), the approved cleanup migration correctly deletes `<appData>/external-channel`.
  - That deletion showed up as ` D` in `git status` in the G-01 probe.
- Current authoritative result: commit `40f769e0d`, which amends `e9bbb28ab`. The file is no longer tracked, and no messaging runtime data remains in the product tree.
- Related solution revision IDs: `SR-016`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-003` (prior: `CRR-001`, `CRR-002`)
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded:
  - It is path-level REQ-120 residue in the main product (REQ-101/REQ-120, Legacy Removal Policy).
  - The IR-001 gate was content-only (`git grep`), so it could not see a filename-only hit. This is the same class of item as AE-20 (the stale root `index.html`).
- Approved behavior or requirement IDs affected: REQ-101, REQ-120/AC-120. There is no behavior change: the migration outcome is unchanged, and the binding root will now be SKIPPED in that layout.
- Implementation delta: `git rm autobyteus-server-ts/external-channel/gateway-callback-outbox.json`, then `git commit --amend --no-edit`. No source, test, or ignore-file change.
- Changed files or areas: `autobyteus-server-ts/external-channel/gateway-callback-outbox.json` (deleted). The `autobyteus-server-ts/external-channel/` folder no longer exists.
- Local validation and result:
  - `git diff --name-status e9bbb28ab 40f769e0d` shows only that deletion.
  - The content gate shows only the 4 allowed registry lines.
  - The new path gate (`git ls-files` + the REQ-120 identifiers, with the allowed set excluded) is empty.
  - A broader case-insensitive path scan finds only the unrelated application/LLM gateway modules.
  - No tracked `.gitignore`/`.dockerignore` mentions external-channel or messaging.
  - The added-file set is unchanged (6 designed additions).
- Next recipient or routing: `get_handoff_rules` → the Local Fix rule for a Large/High package → `/code_reviewer` (narrow re-review of the delta plus the content and path gates). API/E2E then reruns the R-09 gates and the G-01 probe.
- Remaining limitations or risks: unchanged, including the pre-existing Docker all-in-one gap (AC-117 Docker part), the release workflows that cannot be exercised without a tag, and the R-3 release-notes mention.
