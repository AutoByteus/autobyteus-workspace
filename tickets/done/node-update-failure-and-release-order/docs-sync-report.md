# Docs Sync Report

## Scope

- Ticket: `node-update-failure-and-release-order` (Project Task autobyteus-412). `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (ARCH-REV-002, CRR-001, API-REV-001, CRR-002 Not Applicable).
- Trigger: code reviewer's ready-for-delivery message after CRR-002 (test-code review Not Applicable).
- Bootstrap base reference: `origin/personal` @ `6225a734a3`
- Integrated base reference used for docs sync: `origin/personal` @ `933163361c`, merged into the ticket branch as `8ffbcd361c` (`--no-ff`, no conflicts)
- Post-integration verification reference: DEL-01 (`evidence/DEL-01-post-integration-rerun.log`): `electron/nodeAutoUpdate` 88/88, `components/settings/nodes` 67/67, release step test 11 tests OK, all on `8ffbcd361c`

## Why Docs Were Updated

- Summary: two behaviors changed. (1) The desktop drops an `AUTO_FAILED` node-update entry once the node runs that version or a newer one, whichever route updated it, and a node card's new answer triggers a main-process recheck (`node-auto-update:recheck`). (2) Desktop Release's `publish-release` job uploads the four `latest*.yml` updater files last, only after the six server package files are on the GitHub release (up to 60 minutes), with a new failure mode and its recovery.
- Why this should live in long-lived project docs: the release order, its check after a tag, and its recovery are what every future release follows (RELEASE.md). The record rule and the IPC channel are part of the desktop's node-update contract that later node-update work builds on (`electron_packaging.md`, `settings.md`). The desktop tag-build doc listed the publish job's files, which changed.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `RELEASE.md` | Release guide; the publish order, the rollout check (AC-005) and recovery changed | Updated | Updated in `df789a89a5`; checked against `release-desktop.yml` on the integrated state: Watching The Rollout (order, `createdAt` command), the partial-release sentence, Recovery "The server packages are missing" and the combined Android case, Workflow Reference "Desktop publish order". Paths and the 120 × 30 s poll match the workflow. One wording mismatch with DESIGN.md/TESTING.md on the build-only run is recorded as a proposed fix in the release/deployment report, not changed (a project rule) |
| `DESIGN.md` | Project design document | No change | Rule 12 does not fire (no gate or build step changed). `docs/design-cases.md` Case 10 gained the autobyteus-412 AR-002 entry from the Solution Designer (SR-002); it merged cleanly next to autobyteus-427's Case 2 entry from the base |
| `TESTING.md` | Testing guideline | No change | The Fresh-start build path rule fired and was followed (API-02). No reported discrepancy. The base brought autobyteus-427's two new rules; none concerns this change |
| `autobyteus-web/docs/electron_packaging.md` | Automatic Node Updates section and the release-preparing window | Updated | Updated in `df789a89a5`: the superseded-failure rule (`isSupersededFailure`), the recheck (`recheckFailure`, per-node guard, no update request), and the updater files now going up after the server packages. Matches the code |
| `autobyteus-web/docs/settings.md` | Nodes page, "Update automatically" cell | Updated | Updated in `df789a89a5`: the cell asks for a recheck on a new answer while the outcome is a failure; the notice shows as with no outcome once dropped |
| `autobyteus-web/docs/github-actions-tag-build.md` | It described the publish job's steps and file list | Updated | Updated in `df789a89a5`, outside the design's doc list. Confirmed needed and accurate: steps 7–9 and the updater file paths match `release-desktop.yml` (download layout `release-artifacts/<artifact-name>/`, the merged `latest-mac.yml`); the old "a separate release-orchestration improvement would be required" sentence was obsolete and was replaced truthfully |
| `autobyteus-server-ts/docker/README.md` | Server package publishing (line 641) | No change | "The job waits up to 30 minutes for the GitHub release, which the Desktop Release or the Android APK Release workflow creates" is still true; the server job is unchanged |
| `autobyteus-server-ts/docs/modules/update_notifications.md` | Matched `AUTO_FAILED` | No change | Its `AUTO_FAILED` is the server's own agent-runtime update record, unrelated to the desktop's node-update record |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `RELEASE.md` | Release procedure, rollout check, recovery, workflow reference | Desktop publish order (binaries → wait for six server package files → `latest*.yml`); the `createdAt` order check; failed or late server package job is a partial release; recovery steps | BEH-003, BEH-005; REQ-004..REQ-007; AC-005..AC-008 |
| `autobyteus-web/docs/electron_packaging.md` | Runtime behavior | Superseded-failure rule, the recheck IPC, release-preparing window now lasts until the server packages are up | BEH-001/002, BEH-003 |
| `autobyteus-web/docs/settings.md` | UI behavior | Cell recheck and notice after a dropped failure | BEH-002, AC-003 |
| `autobyteus-web/docs/github-actions-tag-build.md` | CI publish steps and file list | Publish steps 7–9, binaries vs updater files, failure pointer to RELEASE.md Recovery | BEH-003 |

All four were written by implementation in `df789a89a5` and reviewed in CRR-001 (AC-008). Delivery checked them against the integrated state and made no further edits.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Release order desktop ↔ server packages | Desktops are offered a version only after its server packages exist; the publish job waits up to 60 min; check with asset `createdAt` after every tag | `design-spec.md` DS-003, `requirements-doc.md` REQ-004..REQ-007 | `RELEASE.md` |
| Recovery when server packages are missing | Rerun the server job (or fix forward), then rerun the desktop publish job; the combined Android case | `design-review-report.md` residual note, SR-002 | `RELEASE.md` Recovery |
| Superseded automatic-update failure | An `AUTO_FAILED` V entry is removed when the node answers `?target=V` `same`/`older` with no update running; not counted as "Updated automatically" | `design-spec.md` DS-001/DS-002, DEC-004/005 | `electron_packaging.md` |
| Check-then-act across an `await` | Hold the same per-item guard as the other writer and re-read after the await | ARCH-REV-001 AR-002 | `docs/design-cases.md` Case 10 (Solution Designer) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `latest*.yml` in the two `softprops/action-gh-release` `files` lists | The "Publish the desktop updater files" step (`gh release upload --clobber`) after "Wait for the server packages" | `RELEASE.md` Workflow Reference; `github-actions-tag-build.md` |
| "Four independent workflows" | Four workflows that start independently with one order on the release | `RELEASE.md` Watching The Rollout |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs were updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive the ticket, finalize into `origin/personal` (no release)
- Notes: no follow-up added; FU-001 stays as the Solution Designer recorded it.
