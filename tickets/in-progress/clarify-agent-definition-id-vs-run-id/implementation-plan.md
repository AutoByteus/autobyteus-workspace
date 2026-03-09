# Implementation Plan

## Objective

Rename the messaging / external-channel binding control-plane contract from `targetId` to `targetRunId` across server and web while preserving explicit internal runtime fields `agentRunId` / `teamRunId`.

## Workstreams

### 1. Server contract rename

- Update external-channel domain option model:
  - `ChannelBindingTargetOption.targetId -> targetRunId`
- Update target-options service parameter/local naming:
  - `targetId -> targetRunId`
- Update GraphQL external-channel setup types:
  - binding output
  - target-option output
  - upsert input
- Update mapper/resolver logic and validation error field strings

### 2. Web contract rename

- Update messaging types:
  - binding model
  - binding draft
  - target option
  - blocker action
- Update GraphQL documents to request/send `targetRunId`
- Update messaging stores/composables/components for:
  - field names
  - selected dropdown state
  - stale selection checks
  - validation errors
  - verification messages
  - UI placeholder/copy

### 3. Tests and validation

- Update focused server tests for external-channel GraphQL / target options
- Update focused web tests for messaging binding setup and verification flow
- Run scan evidence proving `targetId` is gone from active messaging/external-channel server/web code

## Expected Touched Areas

- `autobyteus-server-ts/src/external-channel/**`
- `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/**`
- `autobyteus-web/types/messaging.ts`
- `autobyteus-web/graphql/*externalChannelSetup*`
- `autobyteus-web/stores/messaging*`
- `autobyteus-web/composables/*messaging*`
- `autobyteus-web/components/settings/messaging/*`
- related focused tests

## Validation Plan

1. Focused server tests
2. Focused web tests
3. `rg -n "targetId"` scan over active messaging/external-channel server/web paths
