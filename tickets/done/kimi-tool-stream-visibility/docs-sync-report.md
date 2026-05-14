# Docs Sync Report

## Scope

- Ticket: `kimi-tool-stream-visibility`
- Trigger: API/E2E validation pass for revision `canonical-invocation-identity-refactor`; no repository-resident durable validation was added or updated after the latest code review.
- Bootstrap base reference: `origin/personal` at `b056b5f809dacb27524e492f3acef16630969e1b`
- Integrated base reference used for docs sync: `origin/personal` at `b056b5f809dacb27524e492f3acef16630969e1b` after `git fetch origin --prune` on `2026-05-14`; `HEAD`, `origin/personal`, and merge base all matched, so no merge/rebase was needed.
- Post-integration verification reference: `git diff --check` passed after delivery artifact updates on `2026-05-14`.

## Why Docs Were Updated

- Summary: The canonical invocation identity refactor changes the durable stream/projection invariant from suffix alias repair to exact public invocation identity. Long-lived docs now state that producers must emit the same canonical id for all events belonging to one logical tool call, while frontend Activity/timeline projection and server file-change correlation compare ids exactly.
- Why this should live in long-lived project docs: The original Kimi bug was caused by shared identity policy looseness. Future provider/runtime work must fix id mismatches at producer boundaries rather than reintroducing frontend/server alias helpers, suffix stripping, or compatibility fallbacks.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical frontend streaming/Activity projection architecture doc; directly describes `toolLifecycleHandler.ts` and `toolActivityProjection.ts`. | `Updated` | Now says lifecycle and Activity projection correlate by exact invocation id only; colon suffixes are never stripped or aliased. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Canonical server Artifacts / run-file-change projection doc; file-change context correlation is part of this refactor. | `Updated` | Now states `FILE_CHANGE` source context is keyed by exact source invocation id only and producers must not rely on server-side alias repair. |
| `autobyteus-ts/docs/streaming_parser_design.md` | Documents segment/tool invocation id continuity for parser-owned tool calls. | `No change` | Existing statement that tool invocations reuse segment ids remains accurate and already supports canonical exact identity. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Documents provider-native tool-call ids, native continuation, and Kimi/OpenAI-compatible paths. | `No change` | Existing native tool-call identity and continuation documentation remains accurate; the canonical exact-id rule is now documented at consuming frontend/server projection docs. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Documents normalized segment/lifecycle lanes consumed by frontend Activity/conversation surfaces. | `No change` | Existing lane ownership remains accurate; the exact consumer/correlation invariant is documented in the more focused frontend and Artifacts docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture invariant | Replaced generic `invocation id/aliases` language with exact-id-only language; documented that `run_bash:0`, `run_bash:1`, `call_1:write_file`, and `call_1:approval-1` are distinct ids unless the backend emits the same canonical id on every related event. | Prevent future frontend Activity/timeline changes from collapsing distinct provider-native calls or repairing producer id mismatches. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Runtime projection invariant | Added that file-change context storage/correlation is keyed by exact source invocation id only and does not treat numeric, semantic-looking, or approval suffixes as aliases. | Keep server run-file-change context matching aligned with canonical identity and protect Kimi/provider-native ordinal invocations. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Canonical public invocation id | All public segment, lifecycle, approval, log, and source-file-change ids for one logical tool invocation must be the same id. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| No suffix alias repair | `run_bash:1` vs `run_bash:4`, `call_1` vs `call_1:write_file`, and `itemId` vs `itemId:approvalId` are different ids. Consumers must expose mismatches instead of hiding them. | `design-spec.md`, `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Producer ownership of metadata | Approval ids, request ids, response mode, and tool metadata belong in metadata/records, not encoded into public `invocation_id`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-web/docs/agent_execution_architecture.md` |
| Exact file-change context correlation | `FILE_CHANGE` source context attaches only when the producer provides the same exact canonical `sourceInvocationId`. | `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_artifacts.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-web/utils/invocationAliases.ts` and positive alias tests | Exact equality in frontend projection handlers plus negative regression coverage for old suffix shapes | `autobyteus-web/docs/agent_execution_architecture.md` |
| Server file-change invocation alias helpers/reexports and multi-alias context storage | Exact-key `FileChangeInvocationContextStore` correlation | `autobyteus-server-ts/docs/modules/agent_artifacts.md` |
| Codex approval id concatenation/fallback (`itemId:approvalId`, colon split lookup, dual-key storage) | Canonical public `invocation_id` as item/call id with approval metadata stored separately | `autobyteus-web/docs/agent_execution_architecture.md` and ticket design/implementation artifacts |
| Prior narrowed alias allowlist concept (`:write_file`, `:edit_file`, `:approval-N`) | No alias allowlist; all suffix-shaped ids are exact ids | `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-server-ts/docs/modules/agent_artifacts.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs updated`
- Rationale: `N/A`

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest tracked `origin/personal` state. No base commits were integrated, so the latest API/E2E validation remains on the same base. Delivery ran `git diff --check` after artifact updates.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
