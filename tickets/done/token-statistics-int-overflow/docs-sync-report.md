# Docs Sync Report

## Scope

- Ticket: `token-statistics-int-overflow`
- Original trigger: product API/E2E `Pass` at 96% confidence followed by proportional durable test-code review `Pass`.
- Recovery trigger: delivery revision `DR-004` exposed an obsolete Docker build-context source; implementation revision `IR-002`, source review `CRR-004`, API/E2E revision `API-REV-002` (`Pass`, 97%), and proportional test review `CRR-005` all passed.
- Latest recovery base: reviewed packaging checkpoint `cc79c46dc5fac8879f45e376b2c44129eaa09568` merged with `origin/personal` at `ca97fa2f537f5bf31c4adbddc3d094c5bd7c7e96`; integrated delivery source `e4b04314658414ff0f5d97fbf360f1e5e946ca36`.
- Post-integration evidence: `delivery-evidence/release-v1.4.27/recovery-integration-refresh.log` and `recovery-integrated-checks.log`.

## Why Docs Were Updated

- Summary: The canonical Token Usage module and Settings frontend documentation now record the widened `SafeInt` token transport, the retained TypeScript `number`/safe-integer boundary, the explicit codegen mapping, and exact full-digit formatting for primary Task-table input/output values.
- Why this should live in long-lived project docs: These are durable API and user-visible presentation contracts. Future GraphQL/schema, codegen, or Token Statistics changes must not reintroduce the signed 32-bit limit, silently widen beyond JavaScript's exact-number boundary, or restore compact-only primary values.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical server-owned Token Usage, GraphQL, and frontend contract. | `Updated` | Added the `SafeInt` transport/codegen boundary and exact primary Task-table display rule. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md` | Canonical frontend Settings Token Statistics behavior. | `Updated` | Added full-digit primary Input/Output formatting, compact secondary-sublines scope, and the generated `SafeInt` → `number` boundary. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/ARCHITECTURE.md` | High-level frontend architecture and testing strategy. | `No change` | The bounded scalar/codegen and Task-cell formatting contract is already owned by the focused Settings and Token Usage docs; no architecture layer or testing policy changed. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Workspace-level build/release/operator guidance. | `No change` | No build command, release workflow, deployment method, or operator procedure changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | API/runtime contract | Documented `SafeInt` for token-valued outputs, exact `number` support through `Number.MAX_SAFE_INTEGER`, retained `Int` for non-token counters, explicit web codegen mapping, and full-digit primary Task cells. | Prevent schema/codegen drift and boundary-corrupting workarounds. |
| `autobyteus-web/docs/settings.md` | User-facing/frontend contract | Documented full locale-aware primary Input/Output digits, compact-only secondary sublines, and the generated safe-integer numeric contract. | Preserve the exact-display acceptance behavior in the canonical Settings reference. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Token-count GraphQL boundary | Token values may exceed signed 32-bit `Int` but remain exact only through `Number.MAX_SAFE_INTEGER`; use `SafeInt`, keep `usageReportCount` as `Int`, and do not cap, round, stringify, or drop values. | `requirements-doc.md`, `design-spec.md`, `graphql-token-count-contract.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Client mapping and exact display | Map `SafeInt` explicitly to TypeScript `number`; render primary Task Input/Output totals as full locale-aware digits while allowing compact cache/thinking explanatory sublines. | `graphql-token-count-contract.md`, `implementation-handoff.md`, `api-e2e-test-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Built-in GraphQL signed 32-bit `Int` for Token Usage token-valued outputs | `GraphQLSafeInt` with an explicit frontend `SafeInt` → `number` mapping | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Compact-only primary Task-table Input/Output values | Full locale-aware integer digits; compact formatting remains only in secondary cache/thinking sublines | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/settings.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Original product docs impact: `Updated` — the SafeInt and exact-display contracts required durable documentation.
- DR-005 packaging-recovery docs impact: `No additional long-lived docs change`.
- Recovery rationale: The correction removes three stale `COPY patches ./patches` instructions after the root pnpm patch contract was retired. It changes no supported release command, operator procedure, image runtime behavior, public API, persisted-data behavior, or user interaction. Existing README release/recovery guidance remained accurate and was used without modification.
- Durable regression ownership: `scripts/tests/test_docker_build_context_sources.py` now enforces that direct non-stage Docker `COPY` sources resolve from repository-root context without freezing the retired patch path or current dependency version.
- Reviewed long-lived docs: root `README.md`, `autobyteus-server-ts/README.md`, and focused Token Usage/Settings docs. No recovery-specific prose update was necessary.

## Delivery Continuation

- Result: `Pass — original docs updated; DR-005 recovery has explicit no additional impact`.
- Release result: `v1.4.27` completed after the documented existing-tag Server Docker recovery path succeeded.
- Next owner: `N/A`
- Notes: Canonical product docs remain accurate, the packaging invariant is durable in test code, and no documentation blocker remains.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`; docs sync and the recovery no-impact decision are complete.
