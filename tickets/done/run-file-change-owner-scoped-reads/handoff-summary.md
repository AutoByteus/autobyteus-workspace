# Handoff Summary — run-file-change-owner-scoped-reads

## What Changed For Users

- **Member files open fast.** Opening the Artifacts list or a file of a delegated copy, a team member or an org member now reads only the run the agent belongs to. Before, each read searched every saved run, about 1–2 s on the user's machine with 680 saved team runs. With 680 unrelated saved team runs, owner-scoped reads take 2.4–3.4 ms median, and the time no longer grows with the number of saved runs.
- **Task agents' files open.** Files written by a team's or an org's task agents now open like configured members' files. Before, they answered "not available" for lack of a workspace root.
- **Live while running.** While a team or org runs, a member's list comes from the live record, including files still being written. Opening such a file answers "not ready yet".
- **Same on desktop and mobile.** The desktop Artifacts tab and the mobile Artifacts view both read through the owner.
- **API contract (clean cut).** New `getTeamMemberFileChanges` and `getAgentOrgMemberFileChanges` queries and three owner content routes. The run-id reads (`getRunFileChanges`, `/runs/:runId/file-change-content`) serve standalone runs only, with no fallback search. Web and server ship together.

## Classification And Route

- `task_size=Medium`, `architectural_risk=High`
- Route: reviewed. Architecture review (ARCH-REV) → implementation → source review CRR-001 (Pass, 9.4/10) → API/E2E API-REV-001 → test-code review CRR-002 (Fail, TR-001) → API/E2E API-REV-002 (Pass, 95.4%) → test-code review CRR-003 (Pass) → delivery.

## Integrated State

- Ticket branch `codex/run-file-change-owner-scoped-reads`, head before delivery edits `aff2039205`. Product code: server `5d6127cee4`, web `03f2d4da05`, unchanged since source review.
- Integration: merge `34487d8878` brought in `origin/personal` @ `e677fe98da` after validation (made by the code reviewer at the user's request). Delivery re-fetched `origin` at its start: 0 commits behind, so no further integration was needed.
- Integration method: `Merge`. Checked base revision: `origin/personal` @ `e677fe98da`.
- Post-integration checks by delivery, on `aff2039205`. The merge brought in new server code (work journal, Codex thread admission, run resource manager, app-data migration), so the checks rerun by impact (logs in `evidence/DLV-*`):
  - DLV-01 server typecheck: exit 0.
  - DLV-02 full server unit suite: 738 files passed, 4 skipped; 6042 tests passed, 7 skipped; exit 0.
  - DLV-03 the ticket's gated server E2E suites (owner-scoped member reads; copy reads): 2/2 and 3/3.
  - DLV-04 the ticket's web specs (viewer, Artifacts tab, mobile Artifacts, run hydration, org hydration, mobile identity, team lazy hydration): 19 files, 160/160.
  - DLV-05 `run-file-changes-api` integration: 6/6.
  - The code reviewer had also run, on the merge: server typecheck and `runProjectionConversation.spec.ts` (14/14).

## Verification

- Verified from the evidence; no user check was needed. Every critical criterion is proven on a real server and a real browser stack (desktop and mobile), at 95.4% confidence. The table is in `release-deployment-report.md` (Verification).

## Release Decision

- `No release`. None was requested, and that is the `RELEASE.md` default. The change ships with the next beta or stable release; `release-notes.md` is ready for it.

## Known Residuals (accepted, documented)

- FU-C (autobyteus-180): a pre-existing live-cache race in `RunFileChangeService.load`. It is outside this ticket's scope and identical on the base.
- The pending-file state was emulated with a scripted runtime. Timings come from synthetic trees, because TESTING.md forbids using real user data.
- The Electron shell was not exercised; no shell code changed.
- Follow-ups already tracked: FU-A (autobyteus-176, context-file reads), FU-B (autobyteus-125 item 6), FU-C (autobyteus-180).

## Durable Artifacts

- Docs sync: `docs-sync-report.md`
- Delivery: `release-deployment-report.md`, `delivery-revision-record.md`, `release-notes.md`
- Validation: `api-e2e-execution-coverage-report.md`, `evidence/`
