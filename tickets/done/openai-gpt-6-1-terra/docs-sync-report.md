# Docs Sync Report — openai-gpt-6-1-terra (autobyteus-336)

## Scope

- Ticket `openai-gpt-6-1-terra` (Task `autobyteus-336`). `Small` / `Low`, direct route: architecture and code review `N/A — not applicable`; test-code review `Not Required — direct low-risk route`.
- Trigger: API/E2E Pass API-REV-001, 95.5%.
- Bootstrap base `8df659441f`. Integrated base: `origin/personal` `d31c92adfc` (one commit, the beta.5 version bump), merged as `c18fe0eedb`.
- Post-integration verification: `evidence/DEL-01-integrated-checks.log`.

## Long-Lived Docs Reviewed

| Doc Path | Why | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | the new catalog row | No change (updated by the implementation) | the terra row (1.05M / 922k / 128k, none..max reasoning, prices) and the official OpenAI model list |
| `TESTING.md` | the live Codex model rule (REQ-003) | No change (updated by the implementation, `a379763339`) | "Live Codex model" bullet |
| all `*.md` outside tickets | stale `gpt-6.1-sol` as the live Codex default | No change | `git grep gpt-6.1-sol -- '*.md'` finds nothing |

## Docs Updated

- None by delivery. The docs updated by the implementation are accurate on the integrated state.

## No-Impact Rationale

- The two long-lived docs this change affects were updated in the ticket and match the code (`supported-model-definitions.ts`) and the evidence (API-02).

## Follow-Ups

- FU-002 (added by delivery): other live Codex tests, including the release smoke's pin, still default to older models than TESTING.md's new rule says.

## Delivery Continuation

- Result: `Pass`. Next: finalization into `origin/personal`. No release.
