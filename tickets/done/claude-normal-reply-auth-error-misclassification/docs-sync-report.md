# Docs Sync Report

## Scope

- Ticket: `claude-normal-reply-auth-error-misclassification`
- Trigger: API/E2E validation `Pass` on the direct route (API-REV-001), received from `api_e2e_engineer`. Task size `Small`, architectural risk `Low`, route `Direct API/E2E`. These are unchanged.
- Bootstrap base reference: `origin/personal` @ `3514fe48e`
- Integrated base reference used for docs sync: `origin/personal` @ `3514fe48eabedc5b0a33522110aa30665e3af17c`. It was fetched at delivery start, and the ticket branch already contained it.
- Post-integration verification reference: no rerun was needed because no new base commits arrived. The validated candidate `fea048260` is the integrated state. See `release-deployment-report.md`.

## Why Docs Were Updated

- Summary: `autobyteus-server-ts/docs/modules/agent_execution.md` describes how Claude terminal results are presented ("Runtime Error Message Presentation"). It said "existing authentication recognition … remain" but did not say what makes a result an error. That gap is what let a reply-text marker scan be added as an error trigger (`f5866908a`). The doc now states the corrected rule.
- Why this should live in long-lived project docs: anyone changing the Claude classifier needs the invariant "only SDK error fields decide failure; the result text is the agent's reply". Without it, the same false positive could come back.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Owns the rules for Claude terminal results and error presentation | `Updated` | One bullet added under "Runtime Error Message Presentation" |
| `autobyteus-server-ts/docs/modules/secret_management.md` ("Claude Agent SDK Authentication") | Claude auth modes | `No change` | Covers auth mode selection only, not turn-result classification |
| `autobyteus-server-ts/docs/modules/llm_management.md` ("Claude Agent SDK Authentication") | Claude auth modes | `No change` | Same as above |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Claude terminal `result` accounting | `No change` | Accounting does not depend on error classification |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior rule | A Claude `result` is a turn error only when it has `is_error: true` or a non-empty string `error`/`code`. A successful `result` is the agent's reply and is never scanned for failure. The auth markers only choose `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` over `CLAUDE_RUNTIME_RESULT_ERROR` for a result that is already an error. | Records the corrected classifier invariant (REQ-001 and REQ-002) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude result error authority | SDK error fields decide failure. Reply text never does. The markers only pick the auth code for real errors. | `design-spec.md`, `requirements-doc.md`, `probe-evidence/*.frames.jsonl` | `autobyteus-server-ts/docs/modules/agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| A marker found in reply text alone made a result an auth error (`f5866908a`) | Only SDK error fields make a result an error; the markers only choose the auth code | `autobyteus-server-ts/docs/modules/agent_execution.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary, then hold for user verification (AC-004) and the user's release decision.
- Notes: none.
