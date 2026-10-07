# Docs Sync Report

## Scope
- Ticket: grok-compaction-analysis. Grok Build compaction detection and raw-trace rotation.
- Trigger: API-REV-001 Pass (94.3%) on IR-001 / SR-002. The user accepted the validated behavior on 2026-10-07.
- Classification: task_size `Medium`, architectural_risk `Low` (carried unchanged). Direct low-risk route. Architecture, source and test-code review: `N/A — not applicable`.
- Bootstrap base reference: origin/personal @ ea826a5e4.
- Integrated base reference used for docs sync: origin/personal @ 154bedc84a1adcaba00d54d13475ba22e2b3a1b6, merged into the ticket branch as a17794a1c.
- Post-integration verification reference: release-deployment-report.md, "Initial Delivery Integration Refresh".

## Why Docs Were Updated
- Summary:
  - Implementation commit 20d4a9441 documented the Grok compaction contract in grok_build_runtime.md and agent_memory.md, and added a TESTING.md live row.
  - Delivery documented the API/E2E zero-credit replay E2E, which runs in default CI with no gate. It also documented the live test's added reopened-history and terminate → restore checks, and `GROK_E2E_EVIDENCE_DIR`.
  - Delivery added Grok Build to the generic provider lists in agent_memory.md and run_history.md, which still named only Codex, Claude and Antigravity.
- Why long-lived: the replay E2E is the routine zero-cost re-verification path, and the provider lists are the canonical statement of which runtimes rotate on provider boundaries.

## Long-Lived Docs Reviewed
| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/grok_build_runtime.md | Grok compaction contract and Validation section | Updated | Replay E2E, live-test checks, evidence dir |
| TESTING.md | Grok compaction row | Updated | Replay command (no gate) and `GROK_E2E_EVIDENCE_DIR`; merged cleanly with the base's new chat rows |
| autobyteus-server-ts/docs/modules/agent_memory.md | Provider Compaction Boundaries | Updated | Grok Build added to two generic provider lists (the implementation's Grok bullet was already accurate) |
| autobyteus-server-ts/docs/modules/run_history.md | Archive/rotation boundaries | Updated | Grok Build added to the provider list |
| autobyteus-web/docs/agent_execution_architecture.md | COMPACTION_STATUS and Activity | No change | The generic phase contract covers Grok; no frontend source change |

## Docs Updated
| Doc Path | Type | What Changed | Why |
| --- | --- | --- | --- |
| grok_build_runtime.md | Validation | Zero-credit replay E2E; live reopened history, terminate → restore, `GROK_E2E_EVIDENCE_DIR` | API/E2E durable coverage |
| TESTING.md | Test index | Replay command; evidence dir | Discoverability |
| agent_memory.md, run_history.md | Provider list | + Grok Build | Stale after this feature |

## Durable Design / Runtime Knowledge Promoted
| Topic | What Future Readers Need | Source | Target |
| --- | --- | --- | --- |
| Zero-credit compaction proof | Real server plus fake Grok replaying 1.0.46 recordings covers automatic, Stop and manual compaction | api-e2e-execution-coverage-report.md | grok_build_runtime.md, TESTING.md |

## Removed / Replaced Components Recorded
None. The change is additive.

## Evidence Hygiene (delivery)
api-e2e-evidence/live-grok-probe/grok-home was a copy of the probe's temporary GROK_HOME (14 MB). Delivery removed Grok CLI vendor content (bundled/, docs/, README.md), the CLI identity `agent_id`, caches, the database and locks, and kept logs/, sessions/, memtrace/ and config.toml. See PRUNED-BY-DELIVERY.md. The secret scan found no credentials; two `access_token` matches were documentation placeholders.

## Delivery Continuation
- Result: `Pass`
- Next delivery action: obtain finalization and release instructions.

## DR-002 continuation
The user authorized finalization without a release. The base is unchanged, so the docs remain accurate. Ticket archived under tickets/done/grok-compaction-analysis.
