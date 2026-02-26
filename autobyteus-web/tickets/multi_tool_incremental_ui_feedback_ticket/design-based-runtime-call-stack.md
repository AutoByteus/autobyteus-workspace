# Design-Based Runtime Call Stacks - Frontend Slice (v2)

## Design Basis

- `/Users/normy/autobyteus_org/autobyteus-web/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)

## Use Case Index

- Use Case 1: Single-agent success updates one invocation immediately
- Use Case 2: Single-agent failure updates one invocation immediately
- Use Case 3: Denied approval reaches terminal denied state immediately
- Use Case 4: Approval-required flow follows `REQUESTED -> APPROVED -> STARTED`
- Use Case 5: Terminal state is not regressed by late `TOOL_LOG`
- Use Case 6: Out-of-order `STARTED` then delayed `APPROVED` does not regress
- Use Case 7: Malformed lifecycle payload is dropped safely
- Use Case 8: Team lifecycle event mutates only the targeted member context
- Use Case 9: Store approve/deny actions do not mutate segment status directly

## Use Case 1: Single-agent success updates one invocation immediately

```text
[ENTRY] AgentStreamingService.dispatchMessage(type=TOOL_EXECUTION_SUCCEEDED)
└── toolLifecycleHandler.route(...)
    └── parser validates payload
        └── state applier sets segment status=success for invocation A only
```

## Use Case 2: Single-agent failure updates one invocation immediately

```text
[ENTRY] type=TOOL_EXECUTION_FAILED for invocation B
└── state applier sets invocation B terminal error
```

## Use Case 3: Denied approval reaches terminal denied state immediately

```text
[ENTRY] type=TOOL_DENIED for invocation C
└── state applier sets invocation C terminal denied
```

## Use Case 4: Approval-required flow follows `REQUESTED -> APPROVED -> STARTED`

```text
[ENTRY] TOOL_APPROVAL_REQUESTED(D) -> awaiting-approval
[ENTRY] TOOL_APPROVED(D) -> approved
[ENTRY] TOOL_EXECUTION_STARTED(D) -> executing
```

## Use Case 5: Terminal state is not regressed by late `TOOL_LOG`

```text
[ENTRY] TOOL_EXECUTION_FAILED(E) -> terminal error
[ASYNC] TOOL_LOG(E) arrives later
└── log appended only; status remains error
```

## Use Case 6: Out-of-order `STARTED` then delayed `APPROVED` does not regress

```text
[ENTRY] TOOL_EXECUTION_STARTED(F) -> executing
[ASYNC] delayed TOOL_APPROVED(F)
└── monotonic guard ignores backward transition
```

## Use Case 7: Malformed lifecycle payload is dropped safely

```text
[ENTRY] TOOL_DENIED missing both reason/error
└── parser rejects payload
    └── warning + no state mutation
```

## Use Case 8: Team lifecycle event mutates only targeted member context

```text
[ENTRY] TeamStreamingService receives TOOL_EXECUTION_SUCCEEDED(agent_name=memberX)
└── resolve memberX context
    └── apply update only in memberX conversation state
```

## Use Case 9: Store approve/deny actions do not mutate segment status directly

```text
[ENTRY] agentRunStore.postToolExecutionApproval(...)
└── sends command via streaming service only
    └── no optimistic status write; waits for lifecycle event
```
