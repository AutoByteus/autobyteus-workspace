# Future-State Runtime Call Stacks

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/compaction-icon-spinner/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/done/compaction-icon-spinner/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory: Implementation -> Solution Sketch
  - Ownership: Implementation -> File Placement Plan

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `CompactionActivityItem.vue` | Requirement | R-001, R-003, R-004 | N/A | Activity feed active compaction icon spins | Primary |
| UC-002 | DS-002 | Primary End-to-End | `CompactionStatusRow.vue` | Requirement | R-001, R-003, R-004 | N/A | Center compaction row active icon spins | Primary |
| UC-003 | DS-001, DS-002 | Primary End-to-End | component renderers | Requirement | R-002, R-003 | N/A | Non-active compaction icons remain still | Primary |

## Transition Notes

- No migration or temporary compatibility behavior is required.
- The future state is a clean visual state mapping from existing `CompactionActivity.phase` to icon class list.

## Use Case: UC-001 Activity feed active compaction icon spins

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Primary End-to-End
- Governing Owner: `autobyteus-web/components/progress/CompactionActivityItem.vue`
- Why This Use Case Matters: This is the right-side Activity panel surface shown in the screenshot.

### Goal

Render the arrow-path icon with a motion-safe spin class when the activity is actively compacting.

### Preconditions

- `activity.kind === 'compaction'`
- `activity.phase === 'started'`
- `ActivityFeed.vue` selects `CompactionActivityItem` for the activity.

### Expected Outcome

The icon element includes `motion-safe:animate-spin` and keeps existing blue tone styling.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/progress/ActivityFeed.vue:template(activity.kind !== 'tool')
├── autobyteus-web/components/progress/CompactionActivityItem.vue:setup(props.activity)
│   ├── autobyteus-web/utils/compactionActivityPresentation.ts:getCompactionPhasePresentation('started')
│   ├── autobyteus-web/components/progress/CompactionActivityItem.vue:isCompacting [STATE/computed]
│   └── autobyteus-web/components/progress/CompactionActivityItem.vue:iconClasses [STATE/computed]
└── @iconify/vue:Icon(:class="iconClasses") # includes motion-safe:animate-spin
```

### Branching / Fallback Paths

```text
[FALLBACK] if activity.phase !== 'started'
CompactionActivityItem.vue:isCompacting
└── CompactionActivityItem.vue:iconClasses # returns tone class without motion-safe:animate-spin
```

### State And Data Transformations

- `CompactionActivity.phase` -> `presentation.icon`, `presentation.label`, `presentation.tone` (existing utility).
- `CompactionActivity.phase === 'started'` -> Boolean `isCompacting`.
- tone + `isCompacting` -> icon class array.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-002 Center compaction row active icon spins

### Spine Context

- Spine ID(s): DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: `autobyteus-web/components/workspace/agent/CompactionStatusRow.vue`
- Why This Use Case Matters: This is the centered compaction row surface shown in the screenshot.

### Goal

Render the arrow-path icon with a motion-safe spin class when the centered compaction status row is actively compacting.

### Preconditions

- Conversation feed item is a compaction status row.
- `activity.phase === 'started'`.

### Expected Outcome

The centered compaction icon includes `motion-safe:animate-spin`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/agent/AgentConversationFeed.vue:template(compaction item)
├── autobyteus-web/components/workspace/agent/CompactionStatusRow.vue:setup(props.activity)
│   ├── autobyteus-web/utils/compactionActivityPresentation.ts:getCompactionPhasePresentation('started')
│   ├── autobyteus-web/components/workspace/agent/CompactionStatusRow.vue:isCompacting [STATE/computed]
│   └── autobyteus-web/components/workspace/agent/CompactionStatusRow.vue:iconClasses [STATE/computed]
└── @iconify/vue:Icon(:class="iconClasses") # includes motion-safe:animate-spin
```

### Branching / Fallback Paths

```text
[FALLBACK] if activity.phase !== 'started'
CompactionStatusRow.vue:isCompacting
└── CompactionStatusRow.vue:iconClasses # returns tone class without motion-safe:animate-spin
```

### State And Data Transformations

- Same phase-to-presentation mapping as UC-001.
- Only component-local class composition changes.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-003 Non-active compaction icons remain still

### Spine Context

- Spine ID(s): DS-001, DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: component renderers
- Why This Use Case Matters: Completed/queued/failed states must not imply ongoing processing.

### Goal

Ensure non-active compaction states do not receive spin animation.

### Preconditions

- Component receives `phase: 'completed'` in durable tests.

### Expected Outcome

Icon classes do not include `motion-safe:animate-spin`.

### Primary Runtime Call Stack

```text
[ENTRY] Component mount with phase='completed'
├── getCompactionPhasePresentation('completed')
├── isCompacting computed false
└── Icon class list excludes motion-safe:animate-spin
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
