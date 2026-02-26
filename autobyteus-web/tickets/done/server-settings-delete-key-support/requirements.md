# Requirements

## Status

Design-ready

## Goal / Problem Statement

Users need to delete obsolete or incorrect server settings from the Advanced Server Settings table. Today, settings can be added and updated but not removed.

## Scope Classification

Small

Rationale: Focused change in one UI flow plus a narrow backend mutation/service/config update. No schema redesign or cross-domain architectural changes.

## In-Scope Use Cases

- UC-001: Delete a custom server setting from Advanced table.
- UC-002: Attempt to delete a protected predefined setting and receive a clear error.
- UC-003: Refresh state after delete so removed key no longer appears.

## Acceptance Criteria

1. Advanced table displays a remove action for rows.
2. Removing a custom setting deletes it from runtime config and persisted `.env` content.
3. Removed setting disappears from list after successful delete.
4. Attempting to delete protected predefined settings returns a clear failure message.
5. Unit tests cover frontend delete action invocation and backend delete behavior.

## Constraints / Dependencies

- Dependency on `autobyteus-server-ts` GraphQL API (`deleteServerSetting`).
- Frontend must keep existing save/add flows intact.

## Assumptions

- Custom keys are deletable.
- Predefined keys are protected.

## Risks

- Accidental deletion of important keys if protection logic is wrong.
- UI race between update/delete state flags.
