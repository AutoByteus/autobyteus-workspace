# Design Use-Case Validation

## Status

`Complete for initial design baseline (SR-001)`

## Purpose

Statically self-validate that the target design spans every approved user journey, repairs the confirmed AgentTeam-only invariant, and preserves the healthy standalone and attachment protocol paths. This artifact is derived design evidence; it does not introduce requirements.

Covered requirements: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006`. Covered acceptance criteria: `AC-001`, `AC-002`, `AC-003`, `AC-004`, `AC-005`, `AC-006`, `AC-007`.

## Governing Invariant

For every AgentRun registered by `TeamExecutionViewState`, initial or dynamic:

1. exact `agentRunId`, member address, and context state identity validate before mutation;
2. nested `state` is reactive before any retained raw planned-context status write;
3. the complete `AgentContext` is converted once and the proxy becomes the canonical registry value;
4. all view getters/list entries return that proxy;
5. shared consumers mutate/observe that proxy without Team-specific mirrors or invalidation signals.

## Use-Case Data-Flow Proof

| Use Case / Journey | Full Data-Flow Span | Invariant Application | Observable End State | Durable Proof Target | Result |
| --- | --- | --- | --- | --- | --- |
| `UXJ-001` Team text submit | Textarea -> active facade -> Team send -> local admission -> associated context + conversation -> textarea/event monitor | Local admission receives the proxy from view lookup; top-level clear/pending and nested conversation mutations share reactive observation | One local event; empty draft; current pending value | Real-view association test + Team send test with primed computed values | Covered |
| `UXJ-002` Team voice | Speak/Stop -> Electron result -> voice store captured context -> active facade update -> associated context -> textarea | Captured target is a proxy originally returned by the view; focus change does not change its identity | Transcript merged into original member; no auto-send | Existing voice target test + active-facade real-Team proxy/focus test | Covered |
| `UXJ-003` remove/Clear all | Context tray -> attachment composer -> exact target -> associated `contextFilePaths` -> displayed-items computed | Replacement occurs on the proxy; computed display invalidates. Existing failed-delete path performs no replacement/removal | Visible array equals authoritative array; other member unchanged | View/active-facade reactive collection test + existing component delete-success/failure tests | Covered |
| `UXJ-004` retained attachment send | Visible authoritative item -> active facade -> Team send -> finalizer/planner -> stream -> server ContextFile -> member-input projection -> UserMessage | Proxy makes visible staging truthful; downstream contract remains unchanged | Retained item present in wire/event; removed item absent | Team send retained/removed assertion + existing 24 focused web/server contract tests | Covered |
| `UXJ-005` focus isolation | Member A/B contexts -> view registry by exact AgentRun ID -> focus ref -> active facade -> shared composer | Each registry key owns one proxy; captured A reference remains A while focus selects B | No cross-member draft/transcript/attachment/pending leakage | Active-context real-Team focus test + initial/dynamic association identity test | Covered |
| `UXJ-006` standalone preservation | Standalone composer -> active facade -> Agent/voice store -> Pinia context -> composer | Target change does not touch standalone owner | Existing clear and transcript visibility unchanged | Existing standalone/shared suites plus focused no-regression assertion | Covered |

## State-Transition Proof Matrix

| State Mutation | Current Mutation Owner | Target Observable Dependency | Before-Fix Probe | Target Proof |
| --- | --- | --- | --- | --- |
| `requirement = ''` on local admission | `beginLocalUserSubmission` | textarea/currentRequirement computed | Raw value changed; computed stale | Prime computed, submit, assert empty |
| `submissionPending = true/false` | local submission / completion/error | primary-action computed | Raw value changed; computed stale | Prime computed, transition, assert current value |
| `requirement = merged transcript` | voice result through active facade | textarea/currentRequirement computed | Raw value changed; computed stale | Captured real Team proxy, merge, assert original member visible |
| `contextFilePaths = next[]` | attachment composer | displayed-items/current paths computed | Raw value changed; computed stale | Prime computed, remove/clear, assert equality |
| `state.conversation.messages.push` | local/event handlers | event monitor | Already reactive and visible | Preserve one-event assertion |
| `state.currentStatus = ...` | snapshot/stream status paths | primary action/navigation | Already reactive | Initial/dynamic nested-state assertion |

## Failure And Preservation Proof

| Scenario | Design Outcome | Why No New Mechanism Is Needed |
| --- | --- | --- |
| Send rejects before local admission | Proxy draft is unchanged | Existing sequencing already delays local reset until after required Team context/restore/launch prerequisites |
| Send fails after local admission | Existing local message stays; error event appended; cleared draft remains cleared; pending becomes false visibly | Existing `failLocalSubmission` already owns this behavior; proxy restores observation |
| Voice no-speech/empty/error | Captured draft unchanged; existing feedback remains | Voice store already branches before draft mutation |
| Draft attachment deletion fails | Item remains both visible and authoritative | Existing attachment composer commits removal only after successful deletion |
| Attachment removed before send | It is absent from authoritative array, planner input, wire request, and event | Truthful reactivity closes the visual disagreement; downstream contract already filters from authoritative input |

## Forbidden-Shortcut Audit

| Shortcut | Would It Satisfy All Cases? | Decision |
| --- | --- | --- |
| Clear textarea locally after Send | No voice, attachment, pending, dynamic-member, or identity coverage | Rejected |
| Watch raw Team fields and force component refresh | Duplicates dependency policy per consumer and risks member leakage | Rejected |
| Copy Team drafts into Pinia | Creates a second authority and reconciliation problem | Rejected |
| Patch voice/attachment modules separately | Shared modules already work for standalone Agent | Rejected |
| Change backend attachment protocol | Does not repair stale Team composer and contradicts passing contract evidence | Rejected |

## Self-Validation Conclusion

The single association correction covers all AgentTeam composer field formats because they are fields on the same `AgentContext` object, and every supported initial/dynamic member origin reaches the same `associate()` owner. Each approved journey has a full data-flow span to its meaningful UI or wire/event outcome. No new owner, protocol, migration, recovery mechanism, or compatibility path is required.

The exact target association was also applied only to a disposable copy of the module and executed with the three existing view tests plus one positive initial/dynamic reactive-state proof. All four tests passed. The disposable files and dependency symlink were removed; production source remains unchanged pending architecture review.
