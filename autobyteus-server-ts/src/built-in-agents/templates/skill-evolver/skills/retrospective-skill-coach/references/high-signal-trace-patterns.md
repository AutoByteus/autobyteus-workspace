# High-Signal Trace Patterns

Use this reference to decide whether a work trace contains durable improvement evidence.

## Strong Signals

### User Correction Or Future-Facing Guidance

A user correction is high signal when it changes how future tasks should be handled, not just the current answer. Preserve the generalized lesson, not the user's exact private wording.

### Repeated Mistake Or Backtracking

Repeated failed attempts often indicate missing skill guidance. Look for several attempts around the same decision, command, tool, file location, or workflow.

### Tool Exploration To SOP Convergence

Sometimes the target agent starts without knowing an environment, website, UI, or tool surface. It tries several probes, then discovers a reliable action sequence. If that sequence is reusable, convert it into an SOP.

Example pattern:

1. Target agent opens browser page.
2. Target agent inspects DOM snapshot several ways.
3. Target agent identifies a stable action sequence.
4. Target agent completes the task reliably.
5. Future skill guidance should teach the stable inspect-then-act sequence.

### Environment Rediscovery

If the target agent had to rediscover the same repository layout, command, test target, or setup step that a skill should know how to find, add a generalized discovery or setup rule.

### Package Navigation Failure

If guidance existed but was missed because the entry file did not route clearly, improve package flow instead of adding duplicate guidance.

## Weak Or Non-Durable Signals

- One-off website downtime.
- Private task facts that will not recur.
- User preference limited to one output.
- Tool result values that are transient.
- Raw trace ids, backend fields, private paths, secrets, or credentials.

## Decision Rule

Only update durable skill guidance when the trace supports a reusable future behavior.
