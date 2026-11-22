# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at `SR-001`. Approved by the Solution Designer within the direction, user informed. The user narrowed the scope (DEC-001).
- Behavior-defining supplements: None
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue/tickets/in-progress/restart-notice-continue/investigation-notes.md`
- Authorities read (2026-11-22): `references/architecture-design.md`, `references/design-principles.md`; project `DESIGN.md` (Mandatory Design Rules 1, 5, 6, 11). `autobyteus-web/docs/agent_execution_architecture.md` (notice presentation), `autobyteus-web/docs/localization.md` (manual catalogs).
- Project design-principle conflicts or discrepancies: `agent_execution_architecture.md` L2008 says the notice "should read like ordinary chat content rather than a prominent alert card". This design keeps the light look and moves the notice to its own row. The doc line is updated in this change (docs sync).

## Current-State Read

Live and replayed notices are `system_task_notification` segments of an AI message:
- live: `systemTaskNotificationHandler.ts` → `findOrCreateAIMessage`;
- history: `runProjectionConversation.ts` L275-283.

The feed (`AgentConversationFeed.vue`, desktop and phone) renders items from `buildRecentEventMonitorPresentation` (`recentEventMonitorWindow.ts` L156-202). That function already cuts an AI message into several `message` items, so that compaction rows can stand between them. Each `message` item renders through `AIMessage.vue`, which renders a notice segment through `SystemTaskNotificationSegment.vue` inside the agent's row (avatar, phone speaker line). The segment labels only three kinds.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: web presentation only. Six source files change:
  - `recentEventMonitorWindow.ts`;
  - `recentEventMonitorUsagePresentation.ts`;
  - `recentEventMonitorPresentationWitness.ts`;
  - `AgentConversationFeed.vue`;
  - `SystemTaskNotificationSegment.vue`;
  - `AIMessage.vue` (one dead branch removed).

  Plus two catalog files, one phone CSS rule set, one doc section, and specs plus a phone e2e case.
- Architectural risk: `Low`
- Risk rationale:
  - no server, transport, stored data or conversation model change;
  - no new owner: the existing row builder gets one more item kind, as it has for compaction;
  - readers of the model (dedupe, window enforcement, hydration, usage) are unchanged.
- Escalation trigger: a reader outside the feed needs notices out of AI messages, a Team view renders conversations without this feed, or the phone needs its own presentation path. Any of these is a `Design Impact`.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `services/eventMonitor/recentEventMonitorWindow.ts` L156-202 | Row builder; runs of segments of one message become one `message` item; compaction items between | Split at notice segments here | None |
| Code | `components/workspace/agent/AgentConversationFeed.vue` L27-45 | Latest feed: `message` → User/AIMessage, else `CompactionStatusRow`, `data-speaker` per item | Add a notice branch | None |
| Code | `components/conversation/AIMessage.vue` L53-58; `rg -l AIMessage --glob '*.vue'` → only the feed | Notice branch inside the agent row | Remove it (dead after the split) | None |
| Code | `services/eventMonitor/recentEventMonitorPresentationWitness.ts` L93-140 | Tokens per item | Add a `notice` token (same values as the segment's today) | None |
| Code | `components/conversation/segments/SystemTaskNotificationSegment.vue` | Label for 3 kinds; tools body; restart local time | Label for every kind; drop bracketed header line | None |
| CSS | `assets/css/phone-conversation.css` L26-36 | Speaker rules by `data-speaker` | Notice row uses `data-speaker="system"` and the `.conv-turn` grid | None |
| Code | server `event-monitor-active-trace-page-projection.ts` L138-139 | Browse pages have no notice visual | Browse untouched | None |

## Intended Change

The feed's row builder gives each notice segment a row of its own. The feed draws that row with an icon, a label and the notice text, and the agent's content around it stays in agent rows.

## Change Scope (Mandatory)

- In scope: UC-001. Areas:
  - the feed's row builder and its witness;
  - the feed template;
  - the notice segment component;
  - `AIMessage.vue` (dead branch removed);
  - en and zh-CN workspace catalogs;
  - phone conversation CSS;
  - `autobyteus-web/docs/agent_execution_architecture.md` (notice presentation lines).
- Derived consumers of the presentation items:
  - `AgentConversationFeed.vue` renders the new kind;
  - the witness tokenizes it;
  - `recentEventMonitorMutationCoordinator.ts` only compares witnesses, so it needs no change;
  - **usage text, a regression the split would introduce.** Splitting one AI message into two `message` items copies the message's `completionTokens`/`completionCost` into both (`buildRetainedAIMessage` spreads the message). Two things would then go wrong:
    - the feed's per-row usage line (`AgentConversationFeed.vue` L40-43) would show twice;
    - `getRecentEventMonitorTotalUsageText` (`recentEventMonitorUsagePresentation.ts` L21-37) would count the message twice. Compaction splits already do this, but rarely; a notice wake makes it common.

    Decision: a message's usage is shown and counted on **its last item only**. The builder marks it, e.g. `showsUsage: boolean` on `message` items (true when no later retained item belongs to the same `messageIndex`). The feed's usage line and the total read that flag. The witness passes usage text only where the flag is set.
  - the e2e fixture `tests/e2e/fixtures/background-agent-renderer-contention.page.vue` L358 counts visuals as `compaction ? 1 : item.message.segments.length`. A `notice` item has no `message`, so it counts 1 there too; the implementer updates the fixture.
- Deliberately left alone:
  - the conversation model and both producers of notice segments (live handler, hydration);
  - dedupe (`showsNotice`);
  - window enforcement;
  - browse mode (BEH-006);
  - server and notice wording (DEC-001);
  - inter-agent segments.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..004 / AC-001, AC-005 | Wake notice | Inside previous AI message | Own row between agent rows | DS-001 |
| BEH-002 | System | REQ-001 / AC-002 | Notice starting a turn | First part of the AI message | Own row before the agent row | DS-001 |
| BEH-003 | User | REQ-001, REQ-005 / AC-003 | Reload | Same as live | Same as live | DS-001 (hydrated conversation) |
| BEH-004 | User | REQ-002, REQ-003 / AC-004 | Any notice | 3 labels | Label for every notice | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/*.jpg` | Founder's screenshots | AC-001, AC-005 | The before state to compare against | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers:
  - **Several kinds or forms** (Principle 1): notices come live and from history, and in a single conversation and a Team member's. All of them reach the feed as segments of AI messages, and the one row builder serves them all.
  - **Derived data** (Principle 11): the presentation items feed the template, the witness and the usage text. Each is listed in Change Scope with its decision.
  - **Behavior by absence**: ruled out. The label is an explicit mapping by sender, then by header, then "Platform notice".
  - **Empty indirection**: ruled out. No new layer.
- Deliberate deviations: none. Keeping notices in the AI message's segments is the existing model, not a deviation. Moving them out of it would touch every reader of the model for no visible gain (DESIGN.md rule 5).
- Root cause classification: `Missing Invariant`. The row builder owns which rows the reader sees, but it had no rule that something the agent did not write never appears in the agent's row.
- Refactor needed now: `No`
- Evidence: the builder already splits messages for compaction rows (L180-200). The notice rule is the same kind of split.
- Design response: a `notice` item kind in the builder; a notice row in the feed; a label for every notice; the dead branch removed.
- Intentional deferrals: None.

## Terminology

- **Platform notice**: any `system_task_notification` segment. **Notice row**: its row in the feed. No project glossary entry needed. The notices already use "Platform notice" in their headers.

## Legacy Removal Policy (Mandatory)

- Obsolete: the `system_task_notification` branch in `AIMessage.vue` and its import. Dead because the builder never passes a notice segment to an AI message item; the feed is its only user.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`: presentation only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..003 | Notice segment in the conversation (live handler or hydration) | Notice row in the feed, desktop and phone | `buildRecentEventMonitorPresentation` | Where the row is decided |
| DS-002 | Bounded Local | BEH-004 | Notice segment | Label + body | `SystemTaskNotificationSegment.vue` | What the row says |

## Primary Execution Spine(s)

- DS-001: `SYSTEM_TASK_NOTIFICATION frame / history entry → conversation (AI message segment) → buildRecentEventMonitorPresentation (notice item) → AgentConversationFeed (notice row, data-speaker="system") → SystemTaskNotificationSegment (icon, label, body)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The conversation keeps notices where they arrive. When the builder walks the retained descriptors, a notice segment becomes a `notice` item and ends the current run of agent segments; the next agent segment starts a new `message` item. The feed draws each item as a row. | conversation, row builder, feed, notice component | row builder | witness |
| DS-002 | The component picks the label by sender, then by header, else "Platform notice". It drops a leading bracketed `[Platform notice — …]` line, then applies the existing body rules (tools changes only, restart time local). | label, body | component | catalogs |

## Spine Actors / Main-Line Nodes

Row builder, feed, notice component.

## Ownership Map

- `recentEventMonitorWindow.ts` `buildRecentEventMonitorPresentation`: owns which rows exist and their order (new: notice rows).
- `AgentConversationFeed.vue`: owns drawing each row kind.
- `SystemTaskNotificationSegment.vue`: owns a notice's icon, label, body and accessibility. It is the notice row's content.
- `recentEventMonitorPresentationWitness.ts`: owns change detection over items.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| `AIMessage.vue` `system_task_notification` branch and the import | Dead: the builder no longer gives AI message items notice segments; `AIMessage.vue`'s only user is the feed | The feed's notice row | Its spec cases move to the feed/segment specs |
| The label-less default for the restart reminder and other notices | Replaced by the full label mapping | `SystemTaskNotificationSegment.vue` | — |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

DS-002: `segment → label (sender → header → "Platform notice") → body (drop bracketed header line → tools: changes only → restart: local time)`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Owner | Responsibility | Why |
| --- | --- | --- | --- | --- |
| Witness tokens | DS-001 | row builder's consumers | One `notice` token per notice item with the segment's current values and identity | The feed's mutation coordinator must see a notice change |

## Ownership Boundaries

Presentation decides rows; the conversation model is untouched. Nothing outside the feed reads presentation items except the witness and the usage text.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix By |
| --- | --- | --- | --- | --- |
| `buildRecentEventMonitorPresentation` | Row order and kinds | Feed, mutation coordinator, e2e fixture | The template filtering segments itself | Extend the builder |

## Dependency Rules

- The feed and witness depend on the item union; the component depends on the segment type and catalogs.
- No process-wide bindings: `None`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `RecentEventMonitorPresentationItem` `{ kind: 'notice'; key: string; segment: SystemTaskNotificationSegment; messageIndex: number }` | One notice | A notice row | `key = notice-${messageIndex}-${segmentIndex}` | Added to the existing union |
| `message` item `showsUsage: boolean` | One message's usage | Show/count usage on the message's last item | `messageIndex` | New field on the existing kind |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `notice` item | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Item kind | `notice` | Yes | Yes ("Platform notice") | Low | — |
| Label keys | `…SystemTaskNotificationSegment.applicationRestarted`, `.backgroundTasksFinished`, `.platformNotice` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Row split | Row builder (compaction precedent) | Extend | Same owner, same mechanism |
| Notice look | `SystemTaskNotificationSegment.vue` | Extend | Already the notice's component |
| Labels | Manual workspace catalogs (en, zh-CN) | Extend | `docs/localization.md` |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| `services/eventMonitor` | Rows, witness | DS-001 | Extend |
| `components/workspace/agent`, `components/conversation` | Drawing | DS-001, DS-002 | Extend |

## Draft File Responsibility Mapping

As the final mapping.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field | Redundant removed | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| `notice` item | Yes | Yes (no copied message) | Low | — |

## Final File Responsibility Mapping

| File | Concern | Change |
| --- | --- | --- |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Rows | In `buildRecentEventMonitorPresentation`, a retained descriptor whose segment is `system_task_notification` → `notice` item. The run-collecting `while` stops before a notice segment. `buildRetainedAIMessage` is used for the remaining runs as today. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorUsagePresentation.ts` | Usage | The total counts a message once (only items with `showsUsage`) |
| `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts` | Change detection | `notice` item → one token `kind: 'system_task_notification'`, same identity and values as the segment token today (no usage text) |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Drawing | Latest branch: `item.kind === 'notice'` → row `data-speaker="system"` containing `<SystemTaskNotificationSegment :segment="item.segment" …>` with file-path actions passed through. `:data-speaker` expression covers `notice`. |
| `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | Notice content | Lay out as a turn: `conv-turn` with a small icon in the `conv-avatar` slot (e.g. `heroicons:information-circle`, slate). The label is shown as the speaker line on both desktop and phone, small and muted, and is also the aria-label. The body is the markdown renderer in a muted tone (slate-600 / dark slate-300). Label mapping: restart (`system.restart_resume` or header) → Application restarted; skill; tools; runtime change; background tasks (`system.background_task_notifier` or `[Platform notice — background tasks finished]`) → Background tasks finished; else Platform notice. Body: drop a first line matching `^\[Platform notice — [^\]]+\]$` (and the blank line after it), then the existing tools/restart rules. |
| `autobyteus-web/components/conversation/AIMessage.vue` | Agent row | Remove the notice branch and import |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Labels | Add `applicationRestarted` ("Application restarted" / "应用已重启"), `backgroundTasksFinished` ("Background tasks finished" / "后台任务已完成"), `platformNotice` ("Platform notice" / "平台通知") |
| `autobyteus-web/assets/css/phone-conversation.css` | Phone | The notice's speaker line uses the phone's speaker layout. The existing `.system-task-notification` margin rule is adjusted if the row's padding already spaces it. No other phone rule is needed: the `system` row breaks the `agent + agent` rule, so the agent after it shows its name. |
| `autobyteus-web/docs/agent_execution_architecture.md` L1943, L2007-2010 | Docs | Notices are drawn as their own labelled row by the feed's row builder; light, not an alert card |
| Specs | Tests | Builder spec (AC-001..003), segment spec (AC-004, QR-001), feed spec, witness spec, updated AIMessage spec; phone e2e case in `tests/e2e/mobile-*` run by `test:e2e:mobile-shell` (AC-005) |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As the final mapping; no new files except specs.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| existing folders | Mixed Justified | Yes | Low | No new folders |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Rows for the founder's case | `[agent: …text, Bash card]` `[notice: Application restarted / The application restarted at 21 Nov 2026, 08:32 CET …]` `[agent: I've stopped and am waiting…]` | One agent row containing all three | The reader sees who said what |
| Where to split | In the row builder | `v-if` filtering inside `AIMessage.vue`, or moving notices out of the model | One owner of rows; no model readers touched |

```ts
// recentEventMonitorWindow.ts, inside the loop over retained descriptors
if (descriptor.segment?.type === 'system_task_notification') {
  items.push({ kind: 'notice', key: `notice-${descriptor.messageIndex}-${descriptor.segmentIndex}`,
    segment: descriptor.segment, messageIndex: descriptor.messageIndex });
  continue;
}
// …and the run-collecting while loop also breaks when next.segment.type === 'system_task_notification'
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the notice branch in `AIMessage.vue` "just in case" | Smaller diff | Rejected | Removed (dead) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Builder (notice items, `showsUsage`), usage total and witness, with specs (AC-001..AC-003, and usage shown/counted once for a split message).
2. Segment component, labels and catalogs (AC-004).
3. Feed row and `AIMessage.vue` removal; update affected specs (AC-006).
4. Phone CSS check; phone e2e case; desktop browser probe with screenshots (AC-005).
5. Docs line update.

## Key Tradeoffs

- Presentation split rather than a model change: smallest coherent change, the model readers untouched (DESIGN.md rule 5).

## Risks

- The window enforcement counts visuals per segment, as today. A notice row counts as one visual, so the count doesn't change.

## Guidance For Implementation

- Reproduction to start from: a builder spec with AC-001's conversation (agent text + tool card, restart notice segment, reply text), which today yields one message item.
- Follow TESTING.md: web specs with the real router/Pinia where needed; phone proof on `test:e2e:mobile-shell`; remove `dist-mobile-demo/` before typecheck if a demo build ran.
- Release: none without the founder's word.
