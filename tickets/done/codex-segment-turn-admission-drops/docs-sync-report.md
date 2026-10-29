# Docs Sync Report

## Scope

- Ticket: `codex-segment-turn-admission-drops` (Project Task autobyteus-165; FU-001 of autobyteus-143)
- Trigger: API/E2E `Pass` (API-REV-001) on the direct low-risk route (`task_size: Small`, `architectural_risk: Low`; architecture review, code review and test-code review `Not Applicable`)
- Bootstrap base reference: `origin/personal` @ `cba6b85122` (v1.5.6-beta.8)
- Integrated base reference used for docs sync: `origin/personal` @ `20c91afd4d`, merged into the ticket branch as `e6a5adc58b` (`--no-ff` merge)
- Post-integration verification reference: `evidence/DR-001-post-integration-rerun.log` (88/88 tests), `evidence/DR-001-post-integration-typecheck.log` (exit 0), both on `e6a5adc58b`

## Why Docs Were Updated

- Summary: the ticket changes how the Codex exact-turn gate logs rejections (bounded per turn account, a detailed line with item type and both turn ids, count summaries at turn boundaries, client close and thread release). The durable explanation belongs in the Codex event-mapping design doc. The implementation commit `dedaf77fba` already added the section `## Exact-Turn Admission Rejections` to `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, as the design spec asked. Delivery checked that section against the final integrated code and found it accurate, so delivery made no further doc edits.
- Why this should live in long-lived project docs: operators reading `server.log` need to know what `[CodexSegmentTurnAdmissionRejected]` and `[CodexSegmentTurnAdmissionRejectedSummary]` mean, that the normal source is late tool items after Stop (an expected drop, not lost text), and that a burst of rejected text deltas instead means a lost turn.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Canonical Codex event-mapping doc; holds the willRetry section this ticket builds on | `Updated` (by the implementation commit `dedaf77fba`; checked by delivery) | Checked against the code: log tags `[CodexSegmentTurnAdmissionRejected]` / `[CodexSegmentTurnAdmissionRejectedSummary]` (`codex-thread-event-debug.ts:136,152`); flushes at `turn/started` / `turn/completed`, client close (`codex-thread.ts:265,349`), and release (`codex-thread-manager.ts:93`); fields match the API-04..07 receipts. The doc lists the three reason codes the product can reach; `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` exists in code but is unreachable from the product (recorded as an observation by API/E2E), so leaving it out is accurate |
| Other `*.md` outside `tickets/` mentioning the gate | `grep` for `CodexSegmentTurnAdmission`, `exact-turn admission`, `SegmentTurnRejected` | `No change` | The only hit is the doc above |
| `TESTING.md` | New durable integration test and scripted fixture | `No change` | They use existing layers (server integration; scripted runtime). TESTING.md keeps suite descriptions out; the test file header documents itself |
| `RELEASE.md` | Finalization rules | `No change` | Followed as written; no gap found |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | New section (implementation commit `dedaf77fba`) | `## Exact-Turn Admission Rejections`: the gate rule and reason codes, the normal source of rejections, bounded logging with per-turn accounts, detailed-line and summary formats, and the flush points | Durable runtime knowledge for operators and developers |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Meaning of Codex gate rejections | Late tool items after Stop are correct drops; a burst of rejected text deltas means a lost turn (the willRetry cause is fixed) | `investigation-notes.md`, `requirements-doc.md` (BEH-001..BEH-004) | `codex_raw_event_mapping.md` |
| Bounded rejection logging | One detailed line per turn account per thread lifetime; count summaries at `turn/started`, `turn/completed`, client close and thread release; no item content logged | `design-spec.md`, `implementation-handoff.md` | `codex_raw_event_mapping.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| One unbounded 6-line `[CodexSegmentTurnAdmissionRejected]` warning per rejected event, without item type or turn ids | Per-thread `CodexSegmentTurnRejectionAccounts` (`codex-segment-turn-rejection-accounts.ts`): first detailed line plus `[CodexSegmentTurnAdmissionRejectedSummary]` counts | `codex_raw_event_mapping.md` § Exact-Turn Admission Rejections |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated (by the ticket's implementation commit; checked by delivery).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, archive the ticket, finalize into `origin/personal`.
- Notes: none.
