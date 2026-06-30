# UX Recommendation: Execution Identity Left, Task Detail Right

## Short Answer

The older/original Workspaces-tree placement was right in spirit: task-agent/task-team executions should appear inline under the team/member hierarchy where they belong.

The fix is not a big label or a new task group. The fix is visual semantics:

```text
● durable member/team              solid circle, normal background
◌ transient task-agent/team        dotted circle, light ghost background
```

## Product Split

### Left Workspaces tree

Owns execution identity and hierarchy:

```text
▾ Team run
  ● worker                         durable member
  ◌ worker · task_0001             transient task-agent, dotted + ghost
  ▾ StudentStudyGroup              durable team
  ◌ StudentStudyGroup · task_0002  transient task-team, dotted + ghost
    ◌ review_lead                  transient scoped child
```

### Right Team -> Tasks

Owns task detail/content, message-style:

```text
Task: Review the design package
Details / body
References
Technical details
```

It should not be the primary visual home for task-agent/task-team execution hierarchy after those rows move left.

## Why This Is Better

The original inline approach had the best mental model and simplest placement, but made temporary rows look durable. The later full-context approach put too much on the left.

The best version is:

- original inline placement;
- explicit transient row kind;
- dotted circle plus light ghost background;
- right side remains task content/detail only.
