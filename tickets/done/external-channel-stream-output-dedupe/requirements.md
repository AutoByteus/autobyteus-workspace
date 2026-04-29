# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Fix the external-channel run-output bug where a Telegram-delivered coordinator response can contain duplicated streamed words, e.g. `Sent the the student student a a hard hard cyclic cyclic inequality inequality problem problem to to solve solve..`.

The gateway transport and open-session route are already able to deliver the response after the runtime queue cleanup; this scoped fix must correct the server-side text assembly before callback publication.

## Investigation Findings

Runtime and source investigation shows:

- Telegram inbound update `update:109349219` reached the server and was accepted.
- The corresponding external channel output delivery was published and the gateway callback was sent.
- The `replyTextFinal` saved by server external-channel runtime already contained duplicated text before gateway delivery.
- Later accepted/published open-output records for the same team show the same pattern (`Yes,, I I’m’m here here..`, `Glad you you liked liked it it!!`), confirming a repeated server-side stream assembly defect rather than one transport send failure.
- Current `mergeAssistantText` handles exact duplicates and cumulative snapshots but not suffix/prefix-overlapping stream fragments, so fragments such as `Sent the` + ` the student` produce `Sent the the student`.

## Recommendations

Make external-channel output assembly deterministic and overlap-safe: parse text event source semantics, accumulate stream fragments with suffix/prefix overlap handling, and let final text snapshots supersede streamed fragments when present. Keep the fix inside server external-channel run-output text parsing/collection; do not change messaging gateway behavior.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A Telegram user sends a message bound to an agent/team, and the external-channel runtime publishes the coordinator/target agent's response without duplicated streamed words.
- UC-002: A response generated from internal team-member-to-coordinator activity is delivered through the existing open external channel without duplicating streamed text.

## Out of Scope

- Messaging gateway inbox reset/quarantine for stale `COMPLETED_ROUTED` runtime state.
- Backward compatibility for old gateway inbox schemas or old receipt statuses.
- Binding recreation, manual runtime-data cleanup, or transport-level Telegram changes.
- Broader changes to open-session routing semantics already shipped for v1.2.84.

## Functional Requirements

- FR-001: External-channel run-output delivery must publish a final reply string that does not duplicate streamed words because of replayed, overlapping, or mixed stream/final segment events.
- FR-002: The fix must preserve successful delivery for the current open external channel path; the callback outbox should still receive exactly one callback for one eligible final reply.
- FR-003: The fix must be owned inside the server external-channel run-output text parsing/collection path, not in the messaging gateway.
- FR-004: The fix must not introduce backward-compatibility branches for stale gateway inbox statuses or legacy receipt delivery behavior.

## Acceptance Criteria

- AC-001: Given the observed streamed phrase sequence that previously produced `Sent the the student student ...`, server run-output assembly produces the clean response text once.
- AC-002: Unit coverage verifies delta-style stream fragments, cumulative snapshot-style fragments, and final-segment precedence without duplicated text.
- AC-003: The external-channel runtime still records a published delivery and sends a gateway callback for a valid eligible run-output response.
- AC-004: No messaging gateway code or stale inbox compatibility parser is changed for this scoped bug.

## Constraints / Dependencies

- Branch/worktree: `codex/external-channel-stream-output-dedupe` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Base: `origin/personal` at release bump `1.2.84`.
- Server source is under `autobyteus-server-ts/src/external-channel/runtime`.

## Assumptions

- The duplicated text is introduced before gateway delivery because persisted `replyTextFinal` already contains the duplicated output.
- The response should be corrected at the text assembly owner rather than by Telegram/gateway post-processing.

## Risks / Open Questions

- Some backends may not provide final text on `SEGMENT_END`; overlap-safe stream assembly must work without relying on final snapshots.
- Exact duplicate fragments and intentional repeated text cannot be perfectly distinguished without event ids; implementation should be conservative and covered by targeted tests.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 |
| --- | --- | --- |
| FR-001 | Yes | Yes |
| FR-002 | Yes | Yes |
| FR-003 | Yes | Yes |
| FR-004 | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Reproduces and prevents the exact user-visible duplicated streamed reply symptom. |
| AC-002 | Guards the event-shape cases that can cause text assembly duplication. |
| AC-003 | Confirms the fix does not regress the already-working open-channel delivery path. |
| AC-004 | Enforces the user's requested scope: solve only the second bug, not the gateway inbox cleanup/reset concern. |

## Approval Status

The user explicitly narrowed and approved scope on 2026-04-26: work only on the second bug, duplicated streamed reply text; do not work on gateway inbox cleanup/reset now.
