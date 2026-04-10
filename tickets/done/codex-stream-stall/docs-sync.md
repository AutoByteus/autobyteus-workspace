# Docs Sync

## Scope

- Ticket: `codex-stream-stall`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/codex-stream-stall/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - promoted the native-Codex-versus-backend cadence attribution guidance into the Codex integration module doc,
  - recorded that the long-turn Codex probe tests are durable but explicitly opt-in,
  - documented that team metadata refresh work is coalesced in the streaming path.
- Why this change matters to long-lived project understanding:
  - future engineers debugging Codex streaming stalls need to know that native `codex app-server` can already exhibit bursty/silent phases,
  - future engineers need to know where the durable long-turn probes live and how to run them safely,
  - the team stream handler now contains an intentional hot-path optimization that should not be removed casually.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | it is the canonical module doc for native Codex runtime behavior and operational notes | Updated | added attribution and probe guidance |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | it is the canonical module doc for stream transport behavior | Updated | added note about coalesced team metadata refresh |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Operational + validation note | documented native long-silent Codex behavior and the opt-in long-turn probe tests | future debugging should start with attribution, not guesswork |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Operational note | documented that team metadata refreshes are coalesced in `AgentTeamStreamHandler` | preserves hot-path optimization intent as long-lived knowledge |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Codex cadence attribution | native `codex app-server` can already be bursty/slow on large turns; compare raw and backend cadence before blaming the bridge | `investigation-notes.md`, `paired-cadence-measurements.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Long-turn Codex probes | durable probe tests exist and require explicit opt-in via `RUN_CODEX_E2E=1` | `api-e2e-testing.md`, `implementation.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Team-stream metadata coalescing | metadata refresh is intentionally not per-event in the team websocket hot path | `proposed-design.md`, `implementation.md` | `autobyteus-server-ts/docs/modules/agent_streaming.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| assumption that AutoByteus backend likely causes the progressive slowdown by itself | explicit attribution guidance plus probe-based comparison | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| implicit per-event metadata refresh behavior as undocumented stream detail | explicit coalesced-refresh note | `autobyteus-server-ts/docs/modules/agent_streaming.md` |

## Final Result

- Result: `Updated`
- Follow-up needed:
  - frontend receive/render instrumentation remains a separate ticket if UI-level attribution is needed later
