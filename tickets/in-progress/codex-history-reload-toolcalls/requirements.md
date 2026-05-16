# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Fix history reload so the frontend displays the application-owned local replay history consistently after restart/history selection. The immediate symptom is a reloaded Codex/team-member transcript that shows `Thinking` and prose without adjacent tool-call cards, even though tool calls occurred live.

The refined design decision is: **normal UI history display must use the local application-owned replay trace as its sole source for every runtime, including Codex.** Codex native thread history must not be used as a fallback, recovery source, or merge partner for normal UI history. If local history is missing for an older run, empty/incomplete display is acceptable.

This avoids the current mixed-source bug where local replay rows and Codex-native provider rows are merged into a duplicate/incorrect transcript tail.

## Investigation Findings

- Backend history entrypoints:
  - Standalone history: GraphQL `getRunProjection(runId)` -> `AgentRunViewProjectionService`.
  - Team-member history: GraphQL `getTeamMemberRunProjection(teamRunId, memberRouteKey)` -> `TeamMemberRunViewProjectionService`.
- Current/recent Codex path can combine local raw/replay trace projection with `CodexRunViewProjectionProvider` output.
- Post-delivery reproduction against the Electron backend showed backend projection with many tool rows followed by duplicate text/reasoning-only rows. The frontend then appeared to show the duplicate tail rather than a coherent tool-bearing turn.
- Frontend projection hydration already renders canonical `tool_call` rows when the backend returns them in the canonical projection.
- The user clarified that fallback/recovery from Codex native thread history is unnecessary; using local display history consistently is preferred.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Source-Authority Refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Duplicated Policy Or Coordination.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: Current/recent projection loading can involve both local replay traces and Codex-native provider projection for the same UI history. Reproduction showed duplicate text/reasoning-only tail rows after tool-bearing rows. The clarified requirement rejects fallback/recovery and accepts missing local history as empty/incomplete.
- Requirement or scope impact: The fix must remove runtime-native provider fallback/merge from normal UI history and make local replay trace the single display source.

## Recommendations

1. Use the local application-owned replay trace as the sole normal UI history source for all runtimes.
2. Remove `CodexRunViewProjectionProvider` from `getRunProjection` / `getTeamMemberRunProjection` normal display paths.
3. Remove local/native projection merge from normal UI history.
4. Ensure team-member histories use the same local replay projection path with member memory layout/metadata.
5. Keep frontend runtime-agnostic; it should continue to render canonical projection rows only.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Reload a standalone Codex run from local replay traces after restart/history selection.
- UC-002: Reload a Codex team-member run from member local replay traces after restart/history selection.
- UC-003: Reload non-Codex standalone/team-member histories through the same local replay projection path.
- UC-004: Return empty/incomplete projection when local replay history is missing, without runtime-native fallback.
- UC-005: Preserve canonical frontend hydration of reasoning, tool-call, activity, and assistant-text rows.
- UC-006: Diagnose future history display loss as a local trace write/read/projection issue, not a Codex native recovery issue.

## Out of Scope

- Cosmetic redesign of history UI, conversation cards, or Activity cards.
- Reconstructing missing local histories from Codex native thread history.
- Runtime-native fallback/recovery for normal UI display.
- Persistent migration/backfill that rewrites old local trace files.
- Broad redesign of run-history indexing, archive, or delete semantics.

## Functional Requirements

- FR-001: Normal UI history projection must read from the local application-owned replay trace only, regardless of runtime kind.
- FR-002: `getRunProjection(runId)` must not call runtime-native providers such as `CodexRunViewProjectionProvider` for normal UI display.
- FR-003: `getTeamMemberRunProjection(teamRunId, memberRouteKey)` must load the member local replay history and must not merge with runtime-native provider output.
- FR-004: If local replay history is missing or empty, the normal UI projection must return an empty/incomplete local result rather than fallback to Codex native history.
- FR-005: Local replay projection must preserve canonical reasoning, tool-call, tool-result/activity, user-message, and assistant-message rows in recorded order.
- FR-006: Frontend history hydration must continue to consume the unchanged canonical projection contract (`conversation` + `activities`) without runtime-specific rendering branches.
- FR-007: Tests and docs must make the source-authority rule explicit: local replay trace is display authority; runtime-native providers are not normal display sources.

## Acceptance Criteria

- AC-001: Given a Codex standalone run with local replay trace rows for reasoning, a tool call, and assistant text, `getRunProjection` returns canonical conversation/activity rows containing the tool call in order.
- AC-002: Given a Codex team-member run with local replay trace rows for reasoning, a tool call, and assistant text, `getTeamMemberRunProjection` returns canonical conversation/activity rows containing the tool call in order.
- AC-003: Given a Codex run where local replay history is empty but a mocked Codex native provider could return rows, the normal UI projection remains empty/incomplete and does not call/use the Codex provider.
- AC-004: Given local replay rows and runtime-native rows for the same run, normal UI history does not merge them.
- AC-005: Given a non-Codex run/member with local replay rows, history projection uses the same local replay path and still returns canonical rows.
- AC-006: Existing frontend projection hydration tests remain passing without Codex-specific UI branches.
- AC-007: Implementation/docs record any remaining history-display loss as local trace write/read/projection loss unless the frontend fails to render canonical rows.

## Constraints / Dependencies

- Must use the same backend history APIs used by the UI: `getRunProjection` and `getTeamMemberRunProjection`.
- Must not use Codex native thread history for normal UI fallback/recovery.
- Must not merge local replay and runtime-native projections for normal UI display.
- Must not persistently mutate or backfill old history files as part of read-time projection.
- Missing local histories are acceptable as empty/incomplete display.

## Assumptions

- The local replay trace is intended to represent what the application observed and displayed live.
- Current frontend can render canonical `tool_call` projection entries.
- Future display-history completeness issues should be fixed at local trace writing or local projection transformation boundaries.

## Risks / Open Questions

- Older runs without local replay traces will show empty/incomplete history by design.
- If local trace writing missed live events, reload will miss them too; that becomes the correct defect boundary.
- Existing Codex provider code/tests/docs may need decommissioning or re-scoping to avoid implying it remains in the normal UI path.
- The existing `LocalMemoryRunViewProjectionProvider` name may be misleading for the display replay authority; rename or documentation may be needed.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-002, FR-005; AC-001, AC-003, AC-004.
- UC-002: FR-001, FR-003, FR-005; AC-002, AC-003, AC-004.
- UC-003: FR-001, FR-005; AC-005.
- UC-004: FR-004; AC-003.
- UC-005: FR-006; AC-006.
- UC-006: FR-007; AC-007.

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-002 validate local replay as the Codex display source.
- AC-003 validates no fallback/recovery.
- AC-004 validates no local/native merge.
- AC-005 protects runtime consistency.
- AC-006 protects frontend runtime-agnostic rendering.
- AC-007 keeps future diagnosis at the correct boundary.

## Approval Status

Refined after user clarification that local display history should be used consistently and missing local histories do not need fallback/recovery. Downstream review should treat this as the latest requirement basis and supersede prior Codex-provider-authoritative design direction.
