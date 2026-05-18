# Status Management Architecture Follow-up Report

## Context

This follow-up is based on code review of ticket `offline-agent-initializing-status` after the implementation passed round-2 review.

The current implementation is acceptable for the ticket scope and should proceed through API/E2E validation. This report is **not** a blocker for the current ticket. It records a concrete future architecture improvement opportunity discovered during code review.

## Summary Judgment

The next architectural improvement with real value is:

> Make **status identity** and **pending command-start overlay lifecycle** explicit reusable concepts, without creating a global status authority.

This would reduce duplicated lifecycle logic across backend managers, protect the canonical member status identity invariant, and prevent future status features from growing already-large manager files.

## Current Design Strengths

- Backend remains the source of truth for status.
- No frontend-only optimistic `initializing` behavior was added.
- `AgentRun` owns standalone command-start status.
- Team command owners own member/root command-start status.
- Runtime/native events remain authoritative for later `running`, `idle`, and terminal states.
- Native AutoByteus now canonicalizes member status to configured/runtime member run identity after CR-001.
- Durable tests now cover standalone, Codex, Claude, mixed leaf, mixed subteam, native targeted/inter-agent/no-target, clearing, and failure replacement.

## Architectural Pressure Observed

### 1. Status policy is distributed across several command owners

This is currently acceptable because each owner controls its own lifecycle boundary:

- `CodexTeamManager`
- `ClaudeTeamManager`
- `MixedAgentMemberHandle`
- `MixedSubTeamMemberHandle`
- `AutoByteusTeamRunBackend`

However, each owner now has some variation of:

1. publish command-start `initializing`,
2. store pending overlay,
3. expose overlay in snapshots/aggregate status,
4. clear or replace on runtime/native event,
5. replace with error on failure.

If more status lifecycle behavior is added later, this repeated coordination policy can drift.

### 2. Native AutoByteus status identity remains intrinsically tricky

Native AutoByteus has multiple identity forms:

- native agent id,
- configured/runtime member run id,
- member name,
- member route key,
- member path.

The round-2 fix correctly canonicalized status snapshots to configured/runtime member run id. But the design would be stronger if this invariant were owned by a dedicated native identity projection concern instead of being spread between backend snapshot code and native event processing code.

### 3. Codex/Claude/native manager files are near complexity guardrails

Current effective non-empty line counts from review:

- `codex-team-manager.ts`: 493
- `claude-team-manager.ts`: 488
- `autobyteus-team-run-backend.ts`: 481
- `autobyteus-team-run-event-processor.ts`: 373

This is not a current failure, but additional lifecycle/status behavior should not keep growing these files inline.

### 4. Duplicate same-status `initializing` events may remain possible

Duplicate `initializing` events are currently idempotent and not a blocker. The important invariant is no duplicate contradictory snapshots. Still, if concurrency/retries become more common, a command-start lease/token could prevent stale command-start or failure events from overwriting a newer command's lifecycle.

## Recommended Target Design

### A. Add a reusable team command-status overlay owner

Candidate name:

```ts
TeamCommandStatusOverlayStore
```

Suggested responsibility:

- store pending member/root command-start overlays,
- expose overlaid member snapshots,
- derive aggregate team status from real statuses plus overlays,
- clear pending overlay on matching runtime/native status event,
- replace pending overlay with `error` on command failure,
- clear all overlays on terminate/dispose.

Suggested API shape:

```ts
class TeamCommandStatusOverlayStore {
  beginMemberCommand(input: MemberCommandIdentity): CommandStatusLease;
  beginRootCommand(input: RootCommandIdentity): CommandStatusLease;

  replaceMemberStatus(input: MemberStatusReplacement): void;
  replaceRootStatus(input: RootStatusReplacement): void;

  getMemberSnapshot(
    member: MemberCommandIdentity,
    fallback: AgentStatusPayload,
  ): AgentStatusPayload;

  getMemberSnapshots(
    members: MemberCommandIdentity[],
    fallbackFor: (member: MemberCommandIdentity) => AgentStatusPayload,
  ): AgentStatusPayload[];

  getRootStatus(input: {
    memberStatuses: AgentStatusPayload[];
    nativeTeamStatus?: unknown;
  }): AgentApiStatus;

  clearMember(memberRunId: string): void;
  clearRoot(): void;
  clearAll(): void;
}
```

Important boundary rule:

This store must **not** resolve targets, start runtimes, call provider/native `postMessage`, or decide which member receives a command. Those responsibilities stay with the existing command owners.

Good shape:

```ts
resolved = resolveTarget(target);
lease = commandStatus.beginMemberCommand(resolved.identity);
try {
  memberRun = await ensureMemberReady(resolved);
  result = await memberRun.postUserMessage(message);
  if (!result.accepted) lease.replaceWithError(result.message);
} catch (error) {
  lease.replaceWithError(String(error));
  throw error;
}
```

Bad shape:

```ts
commandStatus.resolveTargetAndStartRuntime(message, target);
```

The bad shape would violate ownership by turning the overlay helper into a hidden command authority.

### B. Add a native AutoByteus member status identity projector

Candidate names:

```ts
AutoByteusMemberStatusIdentityResolver
AutoByteusMemberStatusProjector
```

Suggested responsibility:

- map native agent id/name to runtime member context,
- choose canonical configured/runtime `memberRunId` for status payload `agent_id`,
- preserve route/path metadata,
- canonicalize native member events before overlay replacement or aggregation,
- avoid parallel native-id and configured-id status snapshots.

Suggested API shape:

```ts
class AutoByteusMemberStatusProjector {
  resolveMemberIdentity(input: {
    nativeAgentId?: string | null;
    memberName?: string | null;
    fallbackMemberRunId?: string | null;
  }): AutoByteusCanonicalMemberIdentity | null;

  projectSnapshot(input: {
    nativeMemberStatus: unknown;
    nativeAgentId?: string | null;
    memberName?: string | null;
    context?: unknown;
    isActive: boolean;
  }): AgentStatusPayload;

  canonicalizeAgentEvent(input: {
    nativeAgentId?: string | null;
    memberName?: string | null;
    event: AgentRunEvent;
  }): {
    memberRunId: string;
    memberName: string;
    memberRouteKey: string;
    memberPath: string[];
    event: AgentRunEvent;
  };
}
```

Core invariant:

> For one logical team member route, status projection must expose one canonical member status payload, and `agent_id` must be the configured/runtime member run id when runtime context exists.

### C. Consider command-start leases/tokens if duplicate/stale events become meaningful

Candidate concept:

```ts
CommandStatusLease
```

Suggested responsibility:

- represent one accepted command-start overlay,
- make command-start publication idempotent,
- prevent stale async failure from replacing a newer command's status,
- release/transfer authority when a runtime/native status event arrives.

Suggested API shape:

```ts
interface CommandStatusLease {
  readonly leaseId: string;
  replaceWithError(message?: string | null): void;
  clearIfCurrent(): void;
  isCurrent(): boolean;
}
```

This should be introduced only if duplicate/stale command-start behavior becomes more than an idempotent event concern.

## Recommended Refactor Order

1. **Extract native AutoByteus member status projector first.**
   - Highest value because the native path has the most identity complexity.
   - Makes the CR-001 invariant explicit and reusable.

2. **Promote overlay helper into a small stateful overlay store.**
   - Consolidates repeated pending overlay lifecycle behavior.
   - Reduces duplication in Codex/Claude/Mixed/Native owners.

3. **Add command-start lease/token only if needed.**
   - Useful for duplicate/stale command-start events, retries, or concurrent sends.
   - Not required for the current ticket because duplicates are idempotent.

4. **Decompose Codex/Claude managers only when more lifecycle behavior lands.**
   - Avoid refactoring purely for aesthetics.
   - If future status lifecycle work appears, extract a `ManagedTeamMemberCommandRunner` rather than adding more inline manager logic.

## Suggested Durable Test Additions For A Future Refactor

A future refactor should preserve or add invariant-level tests such as:

- one member route produces exactly one status snapshot,
- native agent id mismatch still projects canonical configured member run id,
- `offline -> initializing -> running` ordering for cold startup,
- failure replaces pending `initializing` with `error`,
- runtime/native status event clears pending overlay,
- true native no-target post emits root `TEAM_STATUS` only,
- duplicate same-status initializing events do not produce duplicate snapshots,
- stale command failure cannot overwrite a newer command's status if leases are introduced.

## Non-goals

- Do not create a global status manager above all runtimes.
- Do not move target resolution into shared overlay/status helpers.
- Do not add frontend optimistic lifecycle status.
- Do not preserve old delayed post-accept `initializing` as a compatibility path.
- Do not refactor Codex/Claude/native manager files solely for aesthetics while the current ticket is already passing.

## Design Classification

- Change type for a future ticket: Refactor / Architecture hardening.
- Likely root-cause class addressed: Duplicated Policy Or Coordination + Shared Structure Tightness.
- Recommended priority: Medium.
- Blocking current ticket: No.
- Architectural value: High enough to justify a focused follow-up if more status lifecycle features are planned.

## Bottom Line

The current implementation is good enough to proceed through validation. The next meaningful design improvement is to make status identity and pending overlay lifecycle explicit owned concepts, while preserving existing command-owner authority. This would reduce future drift, make native identity invariants easier to reason about, and keep large backend manager files from absorbing more lifecycle policy.
