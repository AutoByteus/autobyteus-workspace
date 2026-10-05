# Docs Sync Report

## Scope
- Ticket: agy-compaction-analysis. Antigravity (AGY) automatic compaction detection and raw-trace rotation.
- Trigger: API-REV-001 Pass (95.0%) on IR-001 / SR-002.
- Classification: task_size `Medium`, architectural_risk `Low` (carried unchanged). Direct low-risk route. Architecture, source and test-code review: `N/A — not applicable`.
- Bootstrap base reference: origin/personal @ 517409d40.
- Integrated base reference used for docs sync: origin/personal @ 6243689566534b80df297d483b0707fbf164bcd0, merged into the ticket branch as de93aa8a0.
- Post-integration verification reference: release-deployment-report.md, "Initial Delivery Integration Refresh".

## Why Docs Were Updated
- Summary: implementation commit f615e5d06 already added the AGY compaction contract to antigravity_cli_runtime.md, agent_memory.md and TESTING.md. Delivery corrected one claim and completed the testing index:
  - Evidence (investigation A08) proves that older AGY versions wrote early non-compaction checkpoint steps to their transcripts. It does not prove they appear in the stream. The doc said "also stream"; it now says "may also stream".
  - The new gate-off E2E, the `AGY_FAKE_VERSION` fixture override and the `AGY_COMPACTION_E2E_CHECKPOINTS=2` live option are now documented.
  - run_history.md listed only Codex and Claude as providers that rotate on a provider boundary; Antigravity is added.
- Why long-lived: the version gate and its evidence basis determine when AGY checkpoints are trusted. The test entries are the re-verification path after AGY CLI bumps.

## Long-Lived Docs Reviewed
| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md | AGY "Automatic compaction" contract | Updated | Corrected the older-version stream claim; referenced the gate-off E2E |
| TESTING.md | AGY fake-CLI and live E2E rows | Updated | Added the gate-off file, `AGY_FAKE_VERSION` and `AGY_COMPACTION_E2E_CHECKPOINTS=2` |
| autobyteus-server-ts/docs/modules/run_history.md | Archive/rotation boundaries | Updated | Added Antigravity to the providers that rotate on a provider boundary |
| autobyteus-server-ts/docs/modules/agent_memory.md | Provider Compaction Boundaries | No change | The implementation commit already added an accurate AGY bullet |
| autobyteus-web/docs/agent_execution_architecture.md | COMPACTION_STATUS and Activity | No change | The generic phase contract covers a single-phase `completed` row; no frontend source change |

## Docs Updated
| Doc Path | Type | What Changed | Why |
| --- | --- | --- | --- |
| antigravity_cli_runtime.md | Accuracy correction | "also stream" → "wrote … to their transcripts and may also stream"; added the gate-off test reference | API/E2E OBS-2; A08 evidence |
| TESTING.md | Test index | New gate-off file, fixture version override, two-checkpoint live option | Discoverability of durable coverage |
| run_history.md | Provider list | Added Antigravity to the rotation sentence | The doc was stale after this feature |

## Durable Design / Runtime Knowledge Promoted
| Topic | What Future Readers Need | Source | Target |
| --- | --- | --- | --- |
| Version gate basis | Detection requires AGY ≥ 1.2.16; older checkpoints had different meaning (A08) | investigation-notes.md A08, requirements-doc.md REQ-A04 | antigravity_cli_runtime.md |
| Gate-off proof | Fake CLI version override; separate file because the CLI version is cached per process | api-e2e-execution-coverage-report.md | TESTING.md, antigravity_cli_runtime.md |

## Removed / Replaced Components Recorded
None. The change is additive: AGY checkpoints were previously dropped by the converter. This is documented by the implementation commit.

## Delivery Continuation
- Result: `Pass`
- Next delivery action: user verification hold.
- Notes: OBS-1 (the web row does not display duration_ms for AGY or Claude) is a display follow-up candidate for solution_designer, not a docs change.

## DR-002 continuation
The user accepted finalization; no release. The base is unchanged, so the docs remain accurate. Ticket archived under tickets/done/agy-compaction-analysis.
