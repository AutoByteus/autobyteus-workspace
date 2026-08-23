# Docs Sync Report

## Scope

- Ticket: `codex-shell-cwd-conversion-investigation`
- Trigger: `CRR-002` recorded the post-API/E2E proportional durable-test review as `Not Applicable` after `API-REV-001` passed at 98% final validation confidence with no API/E2E-owned durable coverage delta.
- Bootstrap base reference: `origin/personal` at `a098b205ca990bf86b5e452950a49fc5dc39c8d1`
- Integrated base reference used for docs sync: refreshed `origin/personal` at `a098b205ca990bf86b5e452950a49fc5dc39c8d1`; the ticket branch was already current and no base commit required integration.
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-shell-cwd-conversion-investigation/delivery-integrated-state-refresh.log`

## Why Docs Were Updated

- Summary: The final implementation corrects the shared Codex command projection so stable App Server `commandExecution.cwd` and command-approval `cwd` become canonical `run_bash.arguments.cwd` for live lifecycle events, approval presentation, diagnostic native-history normalization, and future application-owned raw traces.
- Why this should live in long-lived project docs: The stable App Server boundary, projection-only ownership, non-fabrication rule, and no-migration trace behavior are durable runtime contracts. Leaving them only in ticket evidence would make future converter, approval, history, or persistence changes vulnerable to dropping CWD again or incorrectly treating canonical `run_bash` as the executor.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical Codex runtime, normalized event, memory, and native-history contract | `Updated` | Records exact stable `command`/`cwd` promotion, the raw `workdir` exclusion, Codex-owned execution, future trace persistence, and old-trace direct readability. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Authoritative raw-to-canonical mapping and audit table | `Updated` | Adds the live/approval/history CWD mapping, non-fabrication boundary, persistence compatibility, and owner paths. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/agent_execution.md` | Generic server-owned recorder and projection ownership | `No change` | The generic document already states that accepted normalized runtime events feed server-owned local memory; no provider-field mapping belongs there. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Workspace-level runtime/testing guidance | `No change` | Existing Codex E2E gating and external-capability reporting remain accurate; the internal field projection does not alter setup or commands. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/README.md` | Server-specific execution and validation guidance | `No change` | No user setup, environment variable, public API, or test invocation changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/codex_integration.md` | Durable integration/runtime contract | Documented stable item/request `command` and `cwd` projection, exclusion of raw model `workdir`, projection-only execution ownership, future trace enrichment, and unchanged old-trace readability. | Keep the high-level Codex integration authority aligned with final behavior. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Durable mapping/audit contract | Added a command-CWD projection section and made the live, approval, and diagnostic history audit rows explicit about exact CWD preservation and non-fabrication. | Make the corrected shared parser boundary discoverable to future event/history maintainers. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Stable CWD source and canonical name | Live and history command items use stable App Server item `cwd`; approval requests use top-level `cwd`; canonical output remains `run_bash.arguments.cwd`, not raw model-facing `workdir`. | `requirements.md`; `codex-cwd-probe-evidence.md`; `design-spec.md`; `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Projection versus execution | Codex App Server already executes in the selected directory; AutoByteus only normalizes presentation/persistence facts and must not re-execute or reroute the command. | `requirements.md`; `investigation-notes.md`; `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Persistence compatibility | Future local tool-call traces receive optional `cwd` within the existing arguments object; pre-change command-only traces remain valid, byte-preserved, and intentionally unenriched. | `requirements.md`; `design-spec.md`; `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Canonical Codex `run_bash` projection retaining command text but silently dropping a supplied stable App Server CWD | Shared argument parsing that preserves exact stable `cwd` across live lifecycle, approval, and diagnostic native-history projection without fabricating a missing value | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: Not applicable; the final behavior has a durable integration and persistence-contract impact.
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Complete. The user verified the candidate; the ticket was archived, merged and pushed to `personal`, and cleaned up without a release.
- Notes: The tracked base did not advance before either handoff or finalization. Post-merge focused tests and production TypeScript passed; finalization details are authoritative in `delivery-revision-record.md` (`DR-003`) and `release-deployment-report.md`.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
