# Delivery Revision Record — search-model-settings (autobyteus-146)

The latest docs sync report, handoff summary and release/publication/deployment report stay authoritative. This record gives the baseline and each later delivery round's change.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Delivery package from code review (CRR-005 Pass, API-REV-002 Pass, CRR-006 Pass) | N/A | Blocked at verification — `Unclear` (O-5 against REQ-007 / AC-015) | `release-deployment-report.md`, `delivery-revision-record.md` |
| DR-002 | Solution Designer's SR-008 / DEC-015 clarification (option a) | Blocked (DR-001) | Delivery Completed — verified on SR-008, finalized to `personal`, no release | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `delivery-revision-record.md` |
| DR-003 | The user asked for a new beta | Delivery Completed, no release (DR-002) | Delivery Completed — beta `v1.5.7-beta.2` published completely | `release-deployment-report.md`, `delivery-revision-record.md` |
| DR-004 | The user's field note | Delivery Completed (DR-003) | Delivery Completed — the user runs `v1.5.7-beta.2` | `delivery-revision-record.md` |
| DR-005 | The user's own check of the Embedding section | Delivery Completed (DR-004) | Delivery Completed — the user confirms it works on `v1.5.7-beta.2` | `delivery-revision-record.md`, `evidence/delivery/DR-005-*` |

## Revision Entries

### DR-001 — Integrated cleanly; verification blocked on O-5

- Delivery round and trigger: first delivery round. Package from `/software_engineering_team/code_reviewer` after CRR-006. `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Triggering upstream report, verification, or evidence: `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, 95%), `code-review-report.md` (CRR-005, CRR-006), `api-e2e-test-review-report.md`. Validated code `8c283c6acc`; evidence `f19c5d6fa9`.
- Prior authoritative result: N/A.
- Current authoritative result: `Blocked`.
  - The integration is clean: `origin/personal` @ `fc93276e6f` (63 commits) merged as `f9de3d57d7` with no conflicts.
  - Post-integration checks all pass: typecheck; server unit 745 files; `tests/e2e/projects` 7 files / 44 tests; web settings and projects 74 files / 450 tests.
  - Verification proves AC-001…AC-014, the server side of AC-015, and QR-001 (thin desktop margin).
  - It stops on O-5: for an already-open panel, server-started indexing (REQ-011) is not updated "at least every 2 seconds" (REQ-007, Must), and Settings showed Ready at 11.2 s against AC-015's "within 10 s". Neither the requirements nor the design settles whether that is acceptable.
- Docs sync report: not written.
- Handoff summary: not written.
- Release/publication/deployment report: `release-deployment-report.md`.
- Integration and post-integration verification: checkpoint `4882be5bc4`; merge `f9de3d57d7`; checks in `evidence/delivery/DR-001-*`.
- Verification and finalization state: verification open; nothing pushed, merged, tagged or cleaned up.
- Terminal return to `/solution_designer`: `Not yet eligible`.
- Why this delivery revision was recorded: a critical acceptance criterion and a Must requirement are not unambiguously met for one scenario, and the decision belongs upstream.
- Next recipient/action: `/software_engineering_team/solution_designer`. Clarify REQ-007 / AC-015, which lets delivery resume on the current evidence, or revise the design cadence, which means rework through the normal route.
- Remaining blockers, rollback concerns, or untested scope:
  - O-5.
  - Residual risks from the package: the QR-001 desktop margin; untested Windows/Linux/macOS x64 and Docker amd64; the Project store's whole-backlog read (DEC-012 follow-up); `project-task-service.ts` near the size limit (autobyteus-147); `native-compaction-terminal-drain.test.ts` (autobyteus-103 Part 4).

### DR-002 — Verified on the clarified requirements and finalized without a release

- Delivery round and trigger: revisiting DR-001. The Solution Designer chose option (a): SR-008 / DEC-015 clarifies REQ-007 and AC-015 for server-started indexing seen on an open panel. The design is unchanged and there is no rework.
- Prior authoritative result: DR-001 `Blocked` (`Unclear`, O-5).
- Current authoritative result: `Delivery Completed`.
- Docs sync report: `docs-sync-report.md`, `Updated`. Delivery added the DEC-015 cadence to `autobyteus-web/docs/settings.md` and "part of" to the no-model-load marks in `embeddings.md`.
- Handoff summary: `handoff-summary.md`.
- Release/publication/deployment report: `release-deployment-report.md`.
- Integration and post-integration verification:
  - `origin/personal` was still `fc93276e6f`.
  - Merge `f9de3d57d7` and its DR-001 checks stand.
  - Since then only ticket files and two doc sentences changed.
- Verification: `Sufficient` on SR-008.
  - AC-015: an open panel showed Ready about 7.4 s after the server finished, within 10 s; Settings opened after the writes shows Ready.
  - Every other criterion as in DR-001.
  - No user check needed.
- Release decision: `No release` (the guide's default).
- Finalization: ticket branch pushed; `--no-ff` merge `d20d9b9d92` pushed to `origin/personal`; worktree and local branches removed.
- Terminal return to `/solution_designer`: `Sent` (Delivery Completed).
- Next recipient/action: `/software_engineering_team/solution_designer` (terminal receipt).
- Remaining blockers: none. Residual risks are listed in `handoff-summary.md`.

### DR-003 — Beta `v1.5.7-beta.2` at the user's request

- Trigger: the user wrote "lets release a new beta thanks" after DR-002.
- Prior authoritative result: DR-002 `Delivery Completed`, `No release`.
- Current authoritative result: `Delivery Completed`. Beta `v1.5.7-beta.2` was published completely: 4/4 workflows succeeded and the release has 17/17 assets.
- Re-verification on the release state:
  - After DR-002, `personal` gained `mcp-run-session-cleanup` (`a66eee725f`, its own delivery DR-001). It changes only MCP and agent-run code, none of this ticket's embeddings, settings or projects files.
  - Its delivery merged a `personal` that already contained this ticket's merge `d20d9b9d92` (`98365d815d`). On that state it ran the full server unit suite (`745 passed`, 6,116 tests) and server E2E (`89 passed`, 0 failed).
  - Product code at the release equals `d2607bd215` plus the version bump.
  - Judgement: `Sufficient`; no user check needed.
- Release, per `RELEASE.md`, with no deviations:
  - Fresh worktree `finalize/search-model-settings-beta` from `origin/personal` `d2607bd215`.
  - `check_licensing.py` → `Licensing is consistent.`; `check_repository_artifact_hygiene.py` → passed.
  - `bash scripts/desktop-release.sh beta --branch finalize/search-model-settings-beta --no-push` → `8b15c5a274 chore(release): bump workspace release version to 1.5.7-beta.2` and annotated tag `v1.5.7-beta.2`.
  - Refetched `personal` (unchanged), then pushed `d2607bd215..8b15c5a274` (fast-forward) and the tag.
- Rollout watched to completion:
  - Desktop Release `39278873827` success.
  - Android APK Release `39278873717` success.
  - iOS App Store Connect Release `39278873716` success, with Archive And Upload To App Store Connect.
  - Server Docker Release `39278873847` success.
  - GitHub pre-release `v1.5.7-beta.2` has 17 assets: macOS arm64/x64 dmg+zip with blockmaps, Linux x64/arm64 AppImages, the Windows exe, four `latest*.yml`, and the APK with its `.sha256`.
  - Docker Hub `autobyteus/autobyteus-server:1.5.7-beta.2` (amd64, arm64); `:beta` has the same digest `sha256:e8eab0c4…`.
- Release notes: GitHub generated notes (pre-release tag).
- After the release, `personal` moved on with another ticket (`unclean-shutdown-delegated-run-restore`). That ticket is not in this beta. This record is committed on top of it.
- Rollback: revert on `personal` and cut the next beta. Desktop never downgrades; Docker users pin `1.5.7-beta.1`. Never move the published tag.
- Cleanup: release worktree and local branch removed after this record was pushed.
- Terminal return to `/solution_designer`: `Sent` (Delivery Completed, DR-003).
- Remaining blockers: none.

### DR-004 — The user runs `v1.5.7-beta.2`

- Trigger: after DR-003 the user wrote: "now i am runnign the latest version now".
- Checked: `v1.5.7-beta.2` was still the newest tag (`origin/personal` @ `c638a6205d`), so the user's build contains this ticket.
- Current authoritative result: `Delivery Completed`; the release is installed by the user. The user did not report on the Embedding section specifically, and no issue was reported.
- Delivery action: record only. No code, release or deployment change.
- Remaining follow-ups: unchanged (`handoff-summary.md`).

### DR-005 — The user confirms the Embedding section works

- Trigger: the user wrote: "now i am running teh latest version now. it works perfect as you can see". They attached a screenshot of their own install (`evidence/delivery/DR-005-user-embedding-settings-v1.5.7-beta.2.png`).
- What the screenshot shows, under Settings → Server Settings → Embedding:
  - **Models:**
    - IBM Granite Embedding Small English R2 (Default): `Active · Ready`, English, 55 MB.
    - MongoDB LEAF-IR (24 MB) and Google EmbeddingGemma 2 (346 MB): `Not downloaded`, each with Download and Use this model.
    - `On disk: 55 MB`.
  - **Project indexes:**
    - "Using IBM Granite Embedding Small English R2"; Index all Projects.
    - Filters `All 7 · Needs indexing 4 · Indexing 0 · Ready 3`.
    - AutoByteus `Ready · 203 Tasks` and AutoByteus Agents `Ready · 32 Tasks`, each with Rebuild; AutoByteus Investor Applications `Ready · 0 Tasks`.
- This supersedes DR-004's note that the user had not reported on the Embedding section. The user's real data on the released build matches AC-001, AC-005, AC-006 and AC-011.
- Delivery action: record only. No code, release or deployment change.
- Remaining follow-ups: unchanged (`handoff-summary.md`).
