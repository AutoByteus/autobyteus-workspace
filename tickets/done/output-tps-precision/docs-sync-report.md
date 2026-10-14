# Docs Sync Report — output-tps-precision

## Scope

- Ticket: `output-tps-precision`. The server measures each model call's TPS and the Token Meter shows the newest reading per exact AgentRun. This replaces the old two-report "Output TPS" estimate.
- Trigger: code_reviewer handoff after CRR-004 Pass (proportional test-code review), API-REV-002 Pass at 95%, and CRR-003 Pass (9.4/10).
- Bootstrap base reference: `origin/personal@1ea74caa2d`.
- Integrated base reference used for docs sync: `origin/personal@214eaedc86`, merged into `codex/output-tps-precision` as `d0849f1709` on top of checkpoint `3bfcf88b94`.
- Post-integration verification reference: `evidence/delivery/` (P1–P6; see release-deployment-report.md).
- Classification preserved: `task_size=Large`, `architectural_risk=High`, route Reviewed (architecture review, source review, API/E2E, test-code review).

## Why Docs Were Updated

- Summary: the implementation already updated the canonical web, server and architecture docs. Delivery fixed three things they missed:
  - the web README still described the removed estimate (C-004);
  - the AGY row in `token_meter.md` still called RSK-005 unverified, although live validation has since resolved it;
  - the AGY sign-in isolation recipe in `TESTING.md` does not work with agy 1.3.5.
- Why this belongs in long-lived docs: TPS is user-visible, and its method differs per runtime. Contributors and users need the current method and its limits, not the retired estimate. TESTING.md is the project's testing authority, and its AGY recipe misled this ticket's validation.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/token_meter.md` | Canonical TPS doc (rewritten by implementation) | Updated | AGY row: thinking is included in output, observed live (RSK-005 resolved) |
| `autobyteus-web/README.md` | Token Meter summary and link (C-004) | Updated | Rewritten for per-call TPS; new link title |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Server `output_throughput` contract | No change | The implementation's text matches IR-002: Codex ends at `rawResponse/completed`, readings pair by matching output count, and accounting never reads the field |
| `autobyteus-web/docs/agent_execution_architecture.md` | Meter ownership and data flow | No change | The implementation's text matches the final store, composable and card |
| `TESTING.md` | AGY isolation recipe (API/E2E discrepancy) | Updated | Added a dated note on the agy 1.3.5 gap. No replacement recipe was invented |
| `.github/release-notes/release-notes.md` | Mentions "Output TPS" | No change | These are the published v1.5.3 notes and stay as history. The next release's notes describe the new TPS (see `release-notes.md`) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/README.md` | Rewrite of the Token Meter paragraph | Per-call TPS for the exact agent, with the model; a single-call turn gets a reading; tool and approval time excluded; generation vs end-to-end label; short calls skipped; not kept after reload. Link titled "TPS: what it measures, reading the card and methods per runtime" | C-004. The old text described the removed estimate |
| `autobyteus-web/docs/token_meter.md` | Fact correction | AGY limits: reported output already includes thinking tokens (observed live), so thinking is not added again | RSK-005 resolved by API-L06 (output 3,284 with 3,138 thinking) |
| `TESTING.md` | Known-gap note | agy 1.3.5 has no `antigravity-oauth-token` file, and a throwaway HOME gives a signed-out agy. Until an isolated recipe exists, live AGY suites use the host login, and the report must say so | API/E2E coverage investigation discrepancy. Isolating AGY properly is a follow-up |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Per-call TPS contract | `output_throughput { method, output_tokens, duration_ms }` on the canonical usage event. `acceptModelCallThroughput` is the only check (at least 20 tokens and 250 ms). Accounting never reads it | design-spec.md D3.2, implementation-handoff.md | `autobyteus-server-ts/docs/modules/token_usage.md` (implementation) |
| Methods per runtime and their limits | Generation vs end to end per runtime. Codex is always end to end, from its request boundary to `rawResponse/completed`, and excludes tool and approval time | design-spec.md, api-e2e-execution-coverage-report.md | `autobyteus-web/docs/token_meter.md` |
| AGY thinking inside output | Not added again | API-L06 evidence | `autobyteus-web/docs/token_meter.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Frontend "Output TPS" estimate from two compatible same-turn usage reports (Estimated / Last reported; Collecting / Unavailable) | A per-call TPS measured on the server and carried on the call's usage event | `token_meter.md`, `token_usage.md`, `agent_execution_architecture.md`, `autobyteus-web/README.md` |
| IR-001 Codex tool-freeze rule | IR-002: `rawResponse/completed` call end with output-count pairing | `token_usage.md`, `token_meter.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from evidence, archive the ticket and finalize per RELEASE.md.
- Notes: The pre-existing locale mismatch (other cards use the system locale, TPS uses the app locale) is outside scope and goes to the Task manager as a follow-up.
