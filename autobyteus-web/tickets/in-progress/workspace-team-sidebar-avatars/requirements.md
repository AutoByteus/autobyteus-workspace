# Requirements

## Status
- Current Status: `Design-ready`
- Updated On: `2026-02-22`

## Goal / Problem Statement
Improve workspace left-tree scanability by showing avatars for team rows and team member rows, consistent with existing agent avatar treatment.

## Scope Classification
- Classification: `Small`
- Rationale:
  - Single UI component (`WorkspaceAgentRunsTreePanel.vue`) and its component test file.
  - No backend schema/API changes.
  - Behavior change is visual + fallback handling only.

## In-Scope Use Cases
- UC-001: Team row in workspace history tree shows team avatar (or initials fallback).
- UC-002: Team member row in workspace history tree shows member avatar (or initials fallback).
- UC-003: Broken avatar URL falls back safely without breaking row layout.
- UC-004: Existing selection/expand/terminate/delete row actions remain unchanged.
- UC-005: Focused team member conversation (middle event monitor) uses focused member avatar/name in AI message bubbles.
- UC-006: Workspace header (middle panel) shows focused member avatar for team view and definition-fallback avatar for agent view.

## Acceptance Criteria
1. Team row avatar:
- Team rows render a circular avatar before team name.
- If `avatarUrl` is missing or image fails, initials fallback is shown.

2. Team member row avatar:
- Team member rows render a circular avatar before member name.
- If member avatar URL is missing or image fails, initials fallback is shown.

3. Interaction safety:
- Team and member row click targets and existing status dots remain functional.
- No regression in existing tree selection and run/team actions.

4. Test coverage:
- Workspace tree component tests verify team avatar render path and member avatar render path.
- Team event monitor test verifies focused member avatar/name are passed to `AgentEventMonitor`.
- Header tests verify team header avatar and agent header avatar fallback behavior.

## Constraints / Dependencies
- Team avatars resolved from `agentTeamDefinitionStore` by `teamDefinitionId`.
- Member avatars resolved from `agentDefinitionStore` by member name match.

## Assumptions
- Member display name typically matches agent definition name in current team UX.

## Risks
- Name-based member avatar lookup can miss in rare renamed/alias cases; fallback initials will still render correctly.
