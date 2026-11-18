# Docs Sync Report

## Scope

- Ticket: `org-settings-save-stale-reread` (Project Task `autobyteus-265`), SR-001 / IR-001 / API-REV-001
- Trigger: API/E2E validation Pass (API-REV-001), direct low-risk route (`task_size=Small`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal` @ `1138e8fbef`
- Integrated base reference used for docs sync: `origin/personal` @ `5f085effbc`, merged into the ticket branch as `57efcdeeaf`
- Post-integration verification reference: DEL-01 (`evidence/DEL-01-integrated-unit-org-settings-suites.log`, 34 files / 369 tests passed on `57efcdeeaf`)

## Why Docs Were Updated

- Summary: the Settings "Save recovery" text in `autobyteus-web/docs/settings.md` now says that a running Org's view reloading during the readback no longer fails it. The Org reads its settings again, up to three times, and only a closed Org, a switched node or a pending Org operation fails the readback. The implementation added this sentence in `29b51ebcef`. Delivery checked it against the integrated code and kept it unchanged.
- Why this should live in long-lived project docs: the doc already describes the "could not be refreshed" message and its Refresh recovery. Without the sentence, readers could not tell when that message is expected.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` ("Save recovery", around line 1395) | Owns the Settings readback and recovery behavior | Updated (by implementation; verified) | Matches `readRunConfig` on `57efcdeeaf`: `MAX_CONFIG_READ_ATTEMPTS = 3`, and the refusals are released context, node binding, Org operation or inspection pending. "A switched node" still reads correctly under the base's new node vocabulary (autobyteus-290) |
| `autobyteus-web/docs/settings.md` ("Org and Agent views reload", lines ~1388-1392) | BEH-002, which must be preserved | No change | The stream's checkpointed reload is unchanged |
| Other `*.md` mentioning `readRunConfig` or "could not be refreshed" | Search over the integrated tree | No change | Only ticket artifacts and earlier `tickets/done/*` records match; no other long-lived doc describes this path |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Behavior clarification (in `29b51ebcef`) | One sentence: an Org view reload during the readback causes a bounded re-read (3 attempts), and which target changes still fail it | REQ-001/REQ-002 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Org canonical readback vs. the Org view's own reload | A view refresh of the same Org is not a stale target. The read retries (bounded). A target change refuses with the existing error | `design-spec.md`, `requirements-doc.md` DEC-001/DEC-002 | `autobyteus-web/docs/settings.md` "Save recovery" |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The single `current()` staleness closure in `readRunConfig` (it treated any view replacement as stale) | Separate target-change and view-refresh checks with a bounded re-read | `autobyteus-web/docs/settings.md` "Save recovery"; code `autobyteus-web/stores/agentOrgContextsStore.ts` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification. The evidence proves AC-001…AC-004. AC-005 is the user's own check, which the requirements and the Task ask for before finalization.
- Notes: follow-up FU-001 (in-place recording for Org/Agent views) is unchanged and was not raised by docs sync.
