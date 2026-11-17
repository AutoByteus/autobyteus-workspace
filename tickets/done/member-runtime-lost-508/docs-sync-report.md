# Docs Sync Report — autobyteus-508

## Scope

- Ticket: `member-runtime-lost-508` (Project Task `autobyteus-508`)
- Trigger: API/E2E `Pass` (`API-REV-001`, 96.3%), direct low-risk route (`task_size` Small, `architectural_risk` Low); code `e0b58997f3`, durable test `756e31b084`, validation docs `a7339a8e35`
- Bootstrap base reference: `origin/personal` @ `a8ac226e65`
- Integrated base reference used for docs sync: `origin/personal` @ `a8ac226e65` (fetched 2026-11-17 at the start of delivery; the branch was already current, 0 new base commits)
- Post-integration verification reference: not needed, since no base commit was integrated (rationale in the release/deployment report, Initial Delivery Integration Refresh)

## Why Docs Were Updated

- Summary: the 461 conversion now applies a saved Settings edit as one unit (runtime, model, settings) and records the Settings source. The run-history module doc said what the conversion did but did not say what it does with an edit. The testing guideline's rule for migration fixtures let a fixture whose edit changed only the model pass, which is how the loss went unseen. The migration guideline keeps a table of past migration mistakes for designers.
- Why this should live in long-lived project docs: the conversion's behavior is what a reader of `run_history.md` needs to know to understand a converted run's launch and source. The fixture rule and the lesson are what every later migration that carries a user's saved value needs, and the earliest stage that can catch this class of escape is the migration tests (`project-documents.md`, "When a later stage catches a problem").

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules, "Persisted data and migrations" | No change | Its rules (same-ID correction through the guideline, old shapes only inside migrations, no reader fallbacks) were followed and are unchanged. The conversion's lesson is a migration-specific one and lives in the migration guideline it links. |
| `TESTING.md` | Migration and upgrade test rule | Updated | See Docs Updated. |
| `RELEASE.md` | Finalization target, release decision, "Cutting The Release" (`RELEASED` list) | No change | The guide was followed as written. This delivery cuts no release, so the registry's `RELEASED` set stays as it is; the corrected conversion adds no migration. The REQ-004 gate is a decision for this release, not a standing rule. |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Section 7 "Correcting a released migration" (the route this ticket took); section 10 "Mistakes not to repeat" | Updated | Section 7 is accurate as written and unchanged (same-ID repair fixes pending installations; terminal records stay skipped). Section 10 gets one row. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Describes what the `20261111_delegated_runs_own_runs_v1` conversion did to each stored shape | Updated | See Docs Updated. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-7, CM-8 tree row) | Names the migration `20261111_…` and what it converted | No change | The row lists the converted shapes (`taskAgent`, `hostRoot`, Task entries, trees); it does not describe edits, and stays true. |
| `autobyteus-server-ts/docs/modules/agent_communication.md`, `projects.md` | Mention the migration ID (downgrade unsupported; converted Task fields) | No change | Neither describes launches or edits. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` (the `20261111_…` bullet under the run files list) | Behavior description | Adds what the conversion does with a saved Settings edit (`userLaunchSelection`; a team-level edit reaches each member that followed the team): the edit's runtime (else the started runtime), model and settings become the run's own launch together; an edited run or member records `{ origin: "settings", fallbacks: [] }` as a live Settings save does; an unedited member keeps its recorded source; the first version dropped the runtime and was corrected under autobyteus-508 | The doc described the conversion's other steps but not this one; this is the part a reader needs to explain a converted run's runtime and its "own edit" label |
| `TESTING.md` (migrations and upgrades bullet, "Test Rules") | Rule | When a conversion carries a value the released build combined from several fields, one fixture record changes every one of those fields from its starting value, and the runtime is read back where the user sees it | The 461 fixtures' edits changed only the model, so a conversion that dropped the runtime still passed; this is the local check that would have caught it, in the earliest stage that can reproduce it (`project-documents.md`) |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` (section 10, "Mistakes not to repeat") | Lesson row | "Lost choice": the 461 conversion copied only an edit's model and settings; map a released value from the released rule's whole input, give the fixture an edit that changes every field, and keep the ID for the correction (section 7) | The table is where this guideline keeps migration mistakes; it points to the TESTING.md rule and to section 7 instead of repeating them |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| What the 461 conversion does with a Settings edit | The edit is applied whole (runtime when named, model, settings) as the run's own launch and recorded with the Settings source; model-only edits keep the started runtime; unedited members keep their source | `requirements-doc.md` (REQ-001, REQ-002), `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/run_history.md` |
| Fixtures for a combined released value | Change every field the released rule combined; read the result where the user sees it | `api-e2e-execution-coverage-report.md` (API-07, API-07R) | `TESTING.md` |
| Same-ID correction in practice | Installations that had not converted yet are corrected; converted ones keep their data and the user repairs them; no new migration | `requirements-doc.md` (DEC-001, DEC-003) | `data_migration_guideline.md` section 10 (row), section 7 (rule, unchanged) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `withSelection` (copied only model and settings) and the inline agent-run mapping in `run-file-conversion.ts` | One module-local `withEdit(launch, edit)` used by both conversions; the frozen `SETTINGS_EDIT_SOURCE` literal | The source's doc comments (updated by implementation) and `run_history.md` (behavior). Neither is an application API; both live in the sealed migration area. |
| The converted edited run's dropped `launchSource` (shown as "Inherited from the run") | The Settings source on every edited record | `run_history.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: three docs were updated (above).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release/deployment report; archive the ticket; Secret Gate; finalize into `origin/personal`
- Notes: nothing found outside the ticket's scope besides `FU-001` (already in `follow-ups.md`, found by the Solution Designer; unchanged by delivery). No new follow-up from docs sync.
