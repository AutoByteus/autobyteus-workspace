# Architecture Diagrams — Clean Event Monitor History Browsing

## Visualization Context

- **Status:** Current derived view of the architecture round-12 textual package; architecture re-review and focused implementation rework remain pending.
- **Requested view/question:** How does the design preserve the accepted bounded/direct-input and cross-feature ownership architecture while using one state-invariant neutral bottom-centered return arrow for ordinary unseen, frozen browse, released-page, and cursor-expired recovery?
- **Design round or status:** `Refined for architecture round 12` (2026-07-21). Architecture round 11 accepted centered placement and independent Skill Improvement ownership but returned `AR-011` because stale guidance allowed an expired-only amber variant. The round-12 package removes that branch and requires one exact neutral treatment across every arrow state. The primary round-12 architecture review has been requested; no round-12 decision is recorded yet. API/E2E remains stopped before browser/live/page execution, and delivery remains on hold.
- **Requirements:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/requirements-doc.md`
- **Investigation notes:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/investigation-notes.md`
- **Design spec:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-spec.md`
- **Relevant supplemental artifacts:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/integrated-live-validation-plan.md`
- **Review and delivery-state evidence:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/implementation-handoff.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/code-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/api-e2e-coverage-investigation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/api-e2e-execution-coverage-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/api-e2e-test-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/docs-sync-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/delivery-live-validation-observation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/release-deployment-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/handoff-summary.md`
- **Visual evidence of the rejected treatment:** `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/solution_designer_cf42deda46f44bbbb6446758239df763/context_files/ctx_fc4e8615a19a__image.png`; `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/solution_designer_cf42deda46f44bbbb6446758239df763/context_files/ctx_945120610f86__image.png`; `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/solution_designer_cf42deda46f44bbbb6446758239df763/context_files/ctx_7268fea0d526__image.png`
- **Round-10 implementation and centered-coexistence evidence:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/evidence/implementation-zero-layout-event-monitor-20260721.json`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/evidence/implementation-zero-layout-loading-20260721.png`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/evidence/implementation-zero-layout-browse-20260721.png`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/evidence/api-e2e-round5-zero-layout/PRE-SUPERSESSION-NOTICE.md`; `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/implementation_engineer_167e2a5435a14f58a1d1f41b36078436/context_files/ctx_06983d851e91__image.png`; `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/implementation_engineer_167e2a5435a14f58a1d1f41b36078436/context_files/ctx_1f29624b2f2b__image.png`
- **Authority:** Derived visualization. The textual solution package governs if this artifact diverges from it.

## Diagram Inventory

| Diagram | Type | Question answered | Source behavior / spine IDs |
|---|---|---|---|
| `stable-bounds-and-feed-ownership` | Component / data flow | Which active-only, page, cursor, DTO, live, and browse boundaries remain unchanged, and what does the feed own in the clean refinement? | `BEH-001`–`BEH-003`, `BEH-006`–`BEH-010`; `DS-001`, `DS-004`, `DS-006`, `DS-007` |
| `direct-input-paging-lifecycle` | Focused state / decision | What creates one-page authority, when is it consumed, and why can mount, programmatic work, queued events, momentum, or layout anchoring never chain requests? | `REQ-005`, `REQ-010`–`REQ-012`; `AC-011`–`AC-015`; `BEH-003`, `BEH-006`; `DS-004`, `DS-006`, `DS-007` |
| `independent-arrow-and-skill-cta` | Focused component boundary | How does one neutral centered arrow cover every recovery state while coexisting with the lower-right Skill Improvement action without state, dependency, measurement, or positioning coupling? | `BEH-003`, `BEH-007`, `BEH-010`; `DS-004`, `DS-007`; `MP-CR-007`, `AR-011`; `PAGE-COEXIST-001` |

## `stable-bounds-and-feed-ownership` — Preserved Paging Architecture, Refined Feed Authority

**Purpose:** Show that storage, projection, page transport, cursor, DTO, and browse-state ownership stay intact while only the feed-local input and presentation boundary changes.

**Source anchors:** Design spec **Active-Trace Earlier-Paging Design**, **Frontend Browse State And Rendering**, **Zero-Layout Feed Control Design**, **Ownership Map**, and **Data Flow And Derived Data**; UI/UX spec **Visual Cleanliness Contract**, **Interaction States**, and **Accessibility And Keyboard Behavior**.

```mermaid
flowchart TB
    subgraph memory["Run memory — preserved data boundary"]
        active[("Current active trace")]
        archives[("Complete archive segments<br/>preserved and directly usable<br/>never queried by Event Monitor")]
    end

    subgraph server["Business and server paging architecture — unchanged"]
        latest["Normal run-history projection<br/>active only · newest 100 canonical events"]
        page["Explicit standalone or team-member page API<br/>active-generation-bound opaque cursor<br/>closed central-only typed DTO"]
        policy["Server-owned fixed page policy<br/>initial: latest 100 + up to 50 earlier<br/>continuation: up to 50 earlier"]
        private_count["50 is an internal transport invariant<br/>no page-size input and no UI copy"]
    end

    subgraph web_state["Frontend data ownership — unchanged"]
        live["Canonical live/latest state<br/>continues independently<br/>at most 100 visuals"]
        controller["Active-trace browse controller<br/>request + in-flight coalescing<br/>generation/cursor lifecycle<br/>stable event and visual ID merge<br/>page-block turnover at 300 visuals"]
        browse["Frozen isolated browse presentation<br/>never merged into live conversation or Activity"]
    end

    subgraph feed["AgentConversationFeed — refined local authority and presentation"]
        input["Bounded direct-input session<br/>trusted wheel · touch · keyboard · native scrollbar<br/>scroll events may advance but never create authority"]
        scrollwork["Scroll-work epoch and blocked settling<br/>invalidate before every feed-owned scroll write<br/>cover request · anchor · queued events · layout work · quiet"]
        viewport["Feed viewport and stable visual anchor<br/>24 px trigger · 96 px re-arm<br/>capture before request · restore after prepend"]
        feedback["Zero-layout feedback<br/>delayed three dots while loading<br/>icon-only retry overlay on error"]
        arrow["One state-invariant neutral bottom-centered arrow<br/>ordinary unseen · frozen browse · released page · cursor expired<br/>no amber/warning variant · sole explicit frozen-browse exit"]
        bottom_rule["Mode-specific manual bottom<br/>latest: may clear unseen<br/>frozen browse: keeps pages, cursor, unseen, and arrow"]
    end

    removed["Absent from the target UI<br/>persistent earlier-history/boundary row<br/>page count or status phrase<br/>visible explanatory tooltip<br/>wide Jump or Return pill"]

    active --> latest --> live --> viewport
    active --> policy --> page
    private_count -. "governs only" .-> policy
    controller <-->|typed page query and response| page
    input -- "consume one session before request" --> controller
    controller --> browse --> viewport
    scrollwork -- "blocks or invalidates input authority" --> input
    viewport --- feedback
    viewport --- arrow
    viewport --- bottom_rule
    arrow -- "reset/discard browse" --> controller
    arrow -. "reveal current live truth" .-> live
    removed -. "replaced by interaction and overlays" .-> input
    removed -. "replaced by interaction and overlays" .-> feedback
    removed -. "replaced by interaction and overlays" .-> arrow

    classDef unchanged fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a;
    classDef refined fill:#ecfdf5,stroke:#10b981,color:#065f46;
    classDef storageClass fill:#f8fafc,stroke:#64748b,color:#0f172a;
    classDef excluded fill:#f1f5f9,stroke:#94a3b8,color:#475569,stroke-dasharray: 5 5;
    classDef removedClass fill:#fff1f2,stroke:#e11d48,color:#881337,stroke-dasharray: 5 5;
    class latest,page,policy,private_count,live,controller,browse unchanged;
    class active storageClass;
    class archives excluded;
    class input,scrollwork,viewport,feedback,arrow,bottom_rule refined;
    class removed removedClass;
```

### Reading Notes

- The accepted source and transport boundaries do not change. Normal history reads only the active trace and selects the newest 100 canonical events. Earlier pages remain fixed internally at 50, generation-bound, active-only, and closed to result/log/Activity/generic payload data. Archives have no Event Monitor edge or fallback.
- The browse controller remains the network and data-lifecycle owner. It coalesces requests, validates cursor generation and structural IDs, performs ID-only merge, freezes browse separately from live state, releases farthest-newer page blocks at 300 resident visuals, and resets on explicit return.
- The feed remains the scroll owner: only a bounded trusted direct-input session can qualify a top crossing. Feed-owned scroll work invalidates that authority before changing position and keeps it blocked through asynchronous settling.
- Loading and error occupy one absolute top overlay slot; every return/recovery state shares the exact same neutral bottom-centered arrow treatment. There is no expired-only amber branch, persistent earlier/beginning/expiry row, count, status phrase, explanatory tooltip, reserved band, or wide text pill.
- Latest and frozen browse have different bottom semantics. Manual bottom in latest mode may clear unseen because current live truth is rendered. Manual bottom inside a frozen snapshot cannot discard it; the arrow is the sole explicit browse exit.

## `direct-input-paging-lifecycle` — Bounded Authority, Consume Before Request, Settle Before Re-arm

**Purpose:** Visualize the small feed-local lifecycle that admits one deliberate earlier-page request and denies authority to browser/programmatic position changes.

**Source anchors:** Design spec **Zero-Layout Feed Control Design**, `AR-009` / `MP-AR-009` resolution, `DS-006`, and the `AgentConversationFeed` bounded local spine; UI/UX journey `UXJ-007`; validation scenarios `PAGE-001` and `PAGE-GATE-001`.

```mermaid
flowchart TD
    idle["IDLE<br/>no paging authority exists"]

    direct{"Trusted direct upward input<br/>on or for this feed?"}
    sources["Eligible sources<br/>wheel up · touch toward earlier content<br/>ArrowUp/PageUp/Home/Shift+Space<br/>native scrollbar gutter press + upward drag"]
    intent["INTENT session<br/>bounded source, time, direction, and position<br/>effect window 200 ms · maximum 5 s<br/>captures current scroll-work epoch"]
    qualify{"Same current session and epoch?<br/>unconsumed · qualified upward samples<br/>away at 96 px · crosses top at 24 px<br/>earlier available · not loading?"}
    consume["CONSUME BEFORE DISPATCH<br/>mark session used · increment epoch<br/>capture stable visual anchor · enter BLOCKED"]
    request["One coalesced earlier-page request<br/>three dots only after about 150 ms"]
    restore["ID merge and optional 300-visual turnover<br/>prepend · nextTick · restore exact visual anchor"]
    settle{"Request and anchor work complete?<br/>queued scroll delivered · two stable frames<br/>no active touch/scrollbar pointer<br/>250 ms relevant-input quiet?"}
    fresh["Return to IDLE<br/>a fresh post-quiet direct interaction<br/>must start outside the re-arm distance"]

    noauthority["NO AUTHORITY<br/>scroll-position event alone · near-top residence<br/>queued API scroll callback · CSS scroll anchoring<br/>media/card reflow"]
    blocked_input["Input during BLOCKED<br/>continued wheel/touch momentum or queued events<br/>may extend quiet but cannot pre-arm or fire"]
    scrollwrite["Feed lifecycle or programmatic scroll work<br/>mount/selection · subject/reset · auto-bottom · jump<br/>prepend and anchor restoration"]
    invalidate["Block/invalidate before reset or writing<br/>increment epoch · invalidate intent<br/>remain BLOCKED beyond the synchronous call"]
    cancel["Intent expires or is invalidated<br/>interaction end/idle · blur/visibility loss<br/>cancel/lost capture · run/subject change<br/>retry, request start, jump, or cursor reset"]

    idle --> direct
    sources --> direct
    direct -- "Yes" --> intent
    direct -- "No" --> idle
    intent --> qualify
    qualify -- "Not yet; still causally valid" --> intent
    qualify -- "Yes" --> consume --> request --> restore --> settle
    qualify -- "Expired or invalid" --> idle
    intent --> cancel --> idle
    settle -- "No" --> settle
    settle -- "Yes" --> fresh --> idle

    noauthority -. "cannot create or reuse a session" .-> idle
    noauthority -. "during work" .-> settle
    blocked_input -. "no request; postpone quiet boundary" .-> settle
    scrollwrite --> invalidate --> settle

    classDef state fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a;
    classDef authority fill:#ecfdf5,stroke:#10b981,color:#065f46;
    classDef decision fill:#fff7ed,stroke:#f59e0b,color:#7c2d12;
    classDef blocked fill:#faf5ff,stroke:#a855f7,color:#581c87;
    classDef denied fill:#fff1f2,stroke:#e11d48,color:#881337,stroke-dasharray: 5 5;
    class idle,fresh state;
    class sources,intent,consume,request,restore authority;
    class direct,qualify,settle decision;
    class blocked_input,scrollwrite,invalidate blocked;
    class noauthority,cancel denied;
```

### Reading Notes

- A scroll event is geometry evidence, not user authority. Authority begins only with one trusted wheel, touch, supported keyboard, or native-scrollbar interaction observed for this feed; its later scroll samples must stay inside the session's causal/lifetime bounds and match the captured scroll-work epoch.
- The feed consumes the session and changes the epoch before it captures the anchor or emits the request. Consequently, duplicate scroll delivery cannot spend the same interaction twice; controller in-flight coalescing remains a second defense rather than the proof of origin.
- `BLOCKED` outlives the JavaScript scroll write. It spans the request, prepend, anchor restoration, queued scroll callbacks, two stable animation frames, active touch/scrollbar lifetime, and post-work input quiet. Continued momentum can delay quiet but cannot pre-authorize another page.
- A continuation page requires an entirely fresh post-quiet direct interaction that starts outside the 96 px re-arm distance and intentionally crosses the 24 px top trigger. Mount, selection, top residence, programmatic scrolling, CSS anchoring, and dynamic layout changes remain inert even if they change `scrollTop`.
- The lifecycle governs request authority only. The browse controller still owns request/result state and the feed's separate zero-layout presentation maps loading to delayed dots, recoverable error to the retry icon, and frozen-browse/expiry recovery to the single arrow.

## `independent-arrow-and-skill-cta` — Centered Feed Recovery Beside an Unchanged Composer Action

**Purpose:** Show the bounded `CR-007` / `MP-CR-007` ownership correction and `AR-011` treatment unification as two independent presentation paths under the existing parent composition, without turning styling into a subsystem.

**Source anchors:** `BEH-007`, `BEH-010`; design spec **Zero-Layout Feed Control Design**, **Ownership Map**, and `AR-011` resolution; UI/UX spec **Visual Cleanliness Rules** and **Responsive And Platform Behavior**; validation scenarios `PAGE-GATE-001` and `PAGE-COEXIST-001`.

```mermaid
flowchart LR
    subgraph composition["Existing Event Monitor parent composition — unchanged"]
        subgraph feed_surface["Feed sibling — AgentConversationFeed owns recovery presentation"]
            revision["Net presentation revision<br/>while latest is non-pinned"]
            browse_state["Frozen browse, released-page, or<br/>cursor-expired state requires explicit return"]
            one_arrow["Render exactly one absolute arrow<br/>centered against the feed itself<br/>same neutral base treatment in every state<br/>no right/center or expired-style branch"]
            revision --> one_arrow
            browse_state --> one_arrow
        end

        subgraph composer_surface["composerContext sibling — Skill Improvement owner unchanged"]
            eligibility["Eligible standalone run or<br/>eligible focused team member"]
            skill_cta["SkillImprovementComposerCta<br/>existing right-aligned action and behavior"]
            eligibility --> skill_cta
        end
    end

    separation["Hard ownership separation<br/>feed accepts/imports no skill eligibility<br/>no cross-sibling DOM measurement<br/>no offset, hiding, stacking, or position exchange"]
    coexist["PAGE-GATE-001 + PAGE-COEXIST-001<br/>ordinary unseen · frozen browse · cursor expired<br/>wide + 390 px combined states<br/>prove identical neutral style, clearance, and geometry"]

    separation -. "constrains" .-> one_arrow
    separation -. "constrains" .-> skill_cta
    coexist -. "observes both paths together" .-> one_arrow
    coexist -. "observes both paths together" .-> skill_cta

    classDef feedClass fill:#ecfdf5,stroke:#10b981,color:#065f46;
    classDef skillClass fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a;
    classDef boundary fill:#fff7ed,stroke:#f59e0b,color:#7c2d12;
    classDef evidence fill:#faf5ff,stroke:#a855f7,color:#581c87;
    class revision,browse_state,one_arrow feedClass;
    class eligibility,skill_cta skillClass;
    class separation boundary;
    class coexist evidence;
```

### Reading Notes

- The two controls do not share a state path. Presentation revision or browse/released-page/expiry lifecycle makes `AgentConversationFeed` render one centered return arrow; run/member eligibility independently makes `SkillImprovementComposerCta` render its existing right-aligned composer action.
- `AR-011` changes presentation, not recovery behavior: ordinary unseen, frozen browse, released-page, and cursor-expired states use the same quiet-white surface, neutral border/shadow, dark glyph, focus treatment, accessible name, geometry, and component path. The expired-only amber/warning branch is removed.
- Centering is relative to the feed box, not the application window and not the free space left by the CTA. The CTA remains a sibling below the feed in `composerContext`; neither component calculates the other's coordinates.
- No eligibility prop, import, DOM measurement, or responsive right/center branch enters the feed. The arrow therefore has identical placement whether Skill Improvement is absent, resolving, disabled, or visible, while the CTA's eligibility, action, and right alignment remain unchanged.
- `PAGE-GATE-001` and `PAGE-COEXIST-001` are evidence, not runtime coordinators: they compare normalized arrow style across ordinary unseen, frozen browse, and cursor-expired states, and prove wide/narrow CTA coexistence, non-overlap, no horizontal overflow, zero feed-layout impact, and stable arrow geometry/style with and without the CTA.

## Source Ambiguities or Limitations

- No material ambiguity remains in the round-12 textual package for the preserved source bounds, direct-input lifecycle, independent sibling ownership, centered-arrow rule, or state-invariant neutral treatment.
- Architecture round 11 is the latest recorded review and returned `Fail` only for bounded `AR-011`; it otherwise accepted centered placement and ownership separation. The round-12 package removes the stale expired-only warning variant and is awaiting its already-requested review. This diagram does not treat that correction as a passed gate.
- Source commit `aa9705a28` remains baseline evidence for the round-10 direct-input and zero-layout behavior but renders the arrow at lower-right and retains the expired-only amber class branch. API/E2E round 5 stopped before browser/live/page execution and changed no durable tests. Neither the source nor preserved partial evidence proves the round-12 centered, state-invariant neutral treatment is implemented or accepted.
