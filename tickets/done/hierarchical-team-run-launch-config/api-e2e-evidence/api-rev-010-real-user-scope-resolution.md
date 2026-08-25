# API-REV-010 Real-User Scope Resolution

## Decision

The user explicitly requires all blocking API/E2E cases to represent real, normally reachable product workflows. API/E2E must not invent configuration fields and then use their behavior to fail current product sign-off.

## Applied Classification

- `ordinary_prompt` and `multiline_prompt` were invented by API/E2E.
- The current Codex Luna catalog publishes neither field and publishes no free-text configuration property.
- The normal current UI cannot author either field.
- The isolated-CR observation required arbitrary GraphQLJSON keys plus a temporary page-local catalog injection.
- Result: `API-E2E-F-003` is `Out Of Scope / Non-Blocking Robustness Observation` for current sign-off. No product fix is requested.

## Current Real-User Evidence

- Current emitted provider fields and stored Settings behavior remain green and read-only/non-mutating.
- Retained actual-system evidence proves the private nested classroom package, distinct root and nested Team workspaces, root Codex `gpt-5.6-luna`, nested AutoByteus `deepseek-v4-flash`, exact V2 disk projection, a real ordinary Team message, and a real delegated task through submission, review, and acceptance.
- Actual browser evidence used AutoByteus `open_tab`; no invented field is included in the current blocking result.

## Execution And Result

- Product source delta: none.
- Durable test delta: none.
- Rerun: not required for a classification-only correction with unchanged code, runtime, environment, and evidence.
- Current authoritative API/E2E result: **Pass / 98%** for real current-user paths.
- Blocking failure IDs: none.
- Route: `/code_reviewer`; proportional durable-test review `Not Applicable`.
