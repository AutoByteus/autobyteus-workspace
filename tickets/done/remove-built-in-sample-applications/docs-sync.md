# Docs Sync Report

## Scope

- Ticket: `remove-built-in-sample-applications`
- Trigger: Review round `4` and API/E2E validation round `3` are the latest authoritative `Pass` state on `2026-04-21`, and the user explicitly verified the built result before finalization.
- Bootstrap base reference: `origin/personal`
- Integrated base reference used for docs sync: `origin/personal @ b2a217fa3550964db568776f1441b8142039b313`
- Post-integration verification reference: no delivery-stage rerun was required because the ticket branch already matched the latest tracked `origin/personal` base before docs sync started, and the current authoritative review round `4` plus API/E2E round `3` package already revalidated that branch state.

## Why Docs Were Updated

- Summary: The final integrated cleanup removes the server-owned built-in Brief Studio and Socratic Math Teacher payload trees, tightens bundled built-in source resolution to the server-owned `autobyteus-server-ts/application-packages/platform/applications/` root only, and documents that the current built-in application set may legitimately be empty.
- Why this should live in long-lived project docs: This is a durable packaging/discovery rule, not just a temporary cleanup detail. Future readers need one canonical explanation for where built-in payloads are sourced from, why repo-root `applications/` remains authoring-only, and how the platform should present an empty built-in package steady state.
- Additional refresh note for the round-3 stale-removal revalidation: no further long-lived doc edits were required in that refresh because the linked-local stale-package removal fix strengthened registry/settings reconciliation behavior without changing the already documented built-in sourcing or Settings presentation contract.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | The core server Applications module doc owns package discovery, bundled source-root behavior, and built-in package presentation semantics. | `Updated` | Documents the server-owned built-in payload root, repo-root authoring-only samples, and the valid empty built-in steady state. |
| `autobyteus-web/docs/settings.md` | The Settings doc owns how application package sources appear to operators. | `Updated` | Documents that `Platform Applications` may legitimately disappear when the current built-in application set is empty. |
| `applications/brief-studio/README.md` | The sample README previously read like a built-in/distribution statement. | `Updated` | Clarifies Brief Studio is an in-repo authoring/teaching sample only until a future explicit promotion decision. |
| `applications/socratic-math-teacher/README.md` | Same authoring-vs-built-in clarification was needed for the Socratic sample. | `Updated` | Clarifies Socratic Math Teacher is an in-repo authoring/teaching sample only until explicit promotion. |
| `autobyteus-web/docs/applications.md` | The frontend Applications host doc was rechecked because the live catalog went empty and the stale-removal fix was revalidated through Settings/GraphQL. | `No change` | Existing host-launch guidance remained accurate; this ticket changed package sourcing/presentation and stale-package cleanup rather than the frontend launch contract. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | Built-in discovery / source-root clarification | Reframed repo-root samples as authoring-only, documented the server-owned built-in payload root, and clarified that the built-in steady state may be empty. | Future readers need one canonical source of truth for built-in materialization/discovery after the sample payload removal. |
| `autobyteus-web/docs/settings.md` | Settings presentation clarification | Clarified that the `Platform Applications` row appears only when the built-in package contains at least one built-in application. | Operators need to understand that an empty built-in row is valid rather than a bug. |
| `applications/brief-studio/README.md` | Sample positioning correction | Removed built-in/distribution framing and documented Brief Studio as an in-repo sample awaiting future explicit promotion. | Prevents the README from contradicting the new built-in cleanup. |
| `applications/socratic-math-teacher/README.md` | Sample positioning correction | Removed built-in/distribution framing and documented Socratic Math Teacher as an in-repo sample awaiting future explicit promotion. | Prevents the README from contradicting the new built-in cleanup. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Server-owned built-in payload root is authoritative | Built-in materialization must resolve from `autobyteus-server-ts/application-packages/platform/applications/`, not from repo-root `applications/`. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/applications.md` |
| Repo-root `applications/` is authoring-only | Brief Studio and Socratic Math Teacher continue to exist as authoring/sample roots only and are not implicitly shipped built-ins. | `requirements.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` |
| Empty built-in steady state is valid | `applicationPackages` and `listApplications` may both be empty while `applicationPackageDetails("built-in:applications")` still resolves package metadata with `applicationCount: 0`. | `requirements.md`, `design-spec.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-web/docs/settings.md` |
| Settings should not show an empty built-in row | Operators should only see the `Platform Applications` package row when at least one built-in application currently exists. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-web/docs/settings.md` |

## Obsolete / Removed Understanding Explicitly Replaced

| Obsolete Understanding | Replacement |
| --- | --- |
| Repo-root `applications/` implicitly doubles as the current shipped built-in payload source. | Built-in payload resolution is server-owned and must come from `autobyteus-server-ts/application-packages/platform/applications/`. |
| Brief Studio and Socratic Math Teacher are currently distributed built-ins by default. | They remain in-repo authoring/teaching samples only unless explicitly promoted later. |
| The built-in application package row should always appear in Settings. | The built-in package row is hidden when the current built-in application set is empty. |

## Validation / Evidence Cross-Check Used For Docs Sync

- Review report (`round 4`, `Pass`) confirmed the stale linked-local settings-presence reconciliation fix is bounded to the correct owners and introduced no new blocking findings.
- API/E2E report (`round 3`, `Pass`) confirmed:
  - focused maintained vitest batch passed (`5` files, `29` tests),
  - server `tsc --noEmit` passed,
  - server build passed,
  - live stale linked-local removal proof now passes for both supported drift cases, with evidence at `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round3-live/live-stale-remove-proof.json`.
- Round-1 empty-built-in live proof remains valid at `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/empty-builtin-round1-live/live-empty-builtin-proof.json`.

## Result

- Docs sync status: `Updated`
- Delivery blocked by docs ambiguity: `No`
- Notes: The cumulative docs state is aligned with the latest authoritative cleanup package, and repository finalization was completed afterward without requiring further long-lived doc changes.
