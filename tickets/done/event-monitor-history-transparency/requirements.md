# Requirements Doc

## Status

`Design-ready — approved prompt-first trajectory foundation; SR-015 confirms
conformance with production data-migration conventions without changing product scope`

The user has identified system-prompt visibility as the necessary first slice
and clarified that Activity should become an extensible agent-trajectory surface,
not gain a one-off prompt panel. This document narrows the visible feature scope
to system instructions while requiring a typed trajectory foundation that can
accept future activity kinds. The broader kinds and archive-history ideas remain
useful investigation context but are not implementation requirements for this
slice.

## Goal / Problem Statement

Make the right-side Activity area an extensible, structured agent-trajectory
surface, with the application-supplied system instructions used by an agent run
as the first new activity kind.

Today Activity shows only tool and compaction records. The application constructs
or supplies important agent/team instructions for every supported runtime, but
the UI, live event contract, run-history projection, and raw traces do not expose
an instruction record. A user therefore cannot verify from the run what system
prompt AutoByteus supplied.

The first delivery slice is intentionally narrow:

- establish a shared typed trajectory-entry contract rather than a prompt-only
  side channel;
- add a durable, truthful system-instruction entry as the first new kind;
- show the full application-supplied text on explicit expansion;
- derive a truthful runtime-specific source label from existing run metadata;
- restore the entry after reload only while its record remains in the active
  raw trace and current Activity projection window;
- leave Event Monitor and existing Activity behavior unchanged; and
- defer all other proposed trajectory kinds until separately approved.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-SP-001 | Activity supports only `tool` and `compaction` entries. | Activity includes a system-instruction entry captured from the actual application-to-runtime invocation boundary. | Existing tool and compaction cards and their lifecycle behavior remain unchanged. | REQ-SP-001, REQ-SP-006; AC-SP-001, AC-SP-007 |
| BEH-SP-002 | Native AutoByteus constructs `currentSystemPrompt`, including the configured native skill catalog, and passes that exact value to `llmInstance.configureSystemPrompt`, but no transparency event records it. Native provider adapters do not all serialize working-context system messages identically. | Capture the exact final processed prompt supplied to the native LLM configuration boundary. Label it as the AutoByteus-supplied configured prompt, not as a claim about every provider's complete/effective request context. | Native request, memory, compaction, provider serialization, and continuation behavior remain unchanged. | REQ-SP-001, REQ-SP-002; AC-SP-001, AC-SP-004 |
| BEH-SP-003 | Claude receives AutoByteus-composed agent/team instructions through the SDK `systemPrompt` argument, but Activity does not expose them. | Capture and show the exact AutoByteus-supplied `systemPrompt` argument with a truthful Claude source label. | Do not claim that the text is Claude's complete provider-owned system context. | REQ-SP-001, REQ-SP-002; AC-SP-002 |
| BEH-SP-004 | Codex receives AutoByteus-composed agent/team instructions through `baseInstructions` on `thread/start` or `thread/resume`, but Activity does not expose them. | Capture and show the exact AutoByteus-supplied `baseInstructions` with a truthful Codex source label. | Do not claim that the text is Codex's complete provider-managed system context. | REQ-SP-001, REQ-SP-002; AC-SP-003 |
| BEH-SP-005 | The Activity store and run projection keep bounded recent windows. | The instruction entry follows the same bounded Activity policy; no pinning or long-run reachability guarantee is added. | Existing trimming policy remains authoritative. | REQ-SP-003; AC-SP-005 |
| BEH-SP-006 | Existing or compacted runs may have no active system-instruction trace. Reconstructing from the current agent definition could produce different text. | When no dedicated record is present in the active projected trace window, no instruction entry is shown and no text is inferred. | No historical rewrite, archive scan, or unavailable placeholder is required. | REQ-SP-004; AC-SP-006 |
| BEH-SP-007 | Event Monitor renders the readable user/assistant/reasoning/tool/compaction sequence. | No Event Monitor behavior change is required in this slice. | Current bounded latest view, active-trace browsing, inline tool cards, Thinking, and compaction presentation remain unchanged. | REQ-SP-006; AC-SP-007 |
| BEH-SP-008 | Activity is implemented as a closed `tool`/`compaction` store union and desktop/mobile component branches. Adding each new kind directly would expand those fixed branches and encourage one-off data paths. | Tool, compaction, and system-instruction entries participate in one discriminated, extensible trajectory contract with stable common metadata and kind-specific payloads/rendering. | Do not add hypothetical future input, request, reasoning, or status kinds in this slice, and do not weaken the contract into a generic JSON event bag. | REQ-SP-007; AC-SP-009 |
| BEH-SP-009 | Live Activity is fed by common tool/compaction lifecycle messages after native, Claude, and Codex adapters normalize provider events. Historical Activity is rebuilt through provider-neutral replay/projection types. No normalized system-instruction event exists. | Each runtime invocation point emits the same typed semantic `SYSTEM_INSTRUCTIONS_SUPPLIED` event/record into a common persistence and Activity projection path. Provider-native names and identifiers remain below that semantic boundary rather than becoming UI contracts. | Activity remains event-fed but is not a raw provider-event dump: multiple lifecycle events may still project into one stable activity entry. | REQ-SP-008; AC-SP-010 |
| BEH-SP-010 | After restart, normal Activity hydration reads only the active raw-trace file (`includeArchive: false`), converts it to replay events, then keeps the most recent 100. Raw traces currently have no instruction kind. | Add the typed system-instruction trace to that existing active-only replay/projection path. It is restored after restart only while the record remains active and selected; after trimming or rotation it may disappear. | Do not scan archives, pin the record, or add a retained lookup in this slice. | REQ-SP-003, REQ-SP-009; AC-SP-005, AC-SP-011 |

## Investigation Findings

- `AgentActivityStore` is a strict `tool | compaction` union; both desktop and
  mobile Activity presentations consume that same store.
- `ActivityFeed.vue` and `MobileRunActivityList.vue` branch directly on those
  existing kinds. A prompt-specific header or parallel store would meet the
  immediate screenshot need but would preserve the architectural barrier to the
  future trajectory surface the user described.
- Current live Activity is event-fed and already broadly provider-neutral:
  provider adapters convert native/Claude/Codex events into common
  `AgentRunEventType` lifecycle events, and frontend projectors update stable
  tool/compaction Activity entries. Historical reload uses a separate normalized
  replay-to-activity projection. Activity therefore represents a projection of
  semantic events, not a one-card-per-provider-event stream.
- Historical replay already contains user/reasoning/tool/compaction semantics,
  but `historical-replay-events-to-activities.ts` intentionally projects only
  tool and compaction entries.
- Normal restart hydration is raw-trace based but deliberately active-only: the
  local projection provider uses `includeArchive: false` and then applies the
  current 100-event recent selection. The user explicitly accepts that the
  instruction entry may disappear after ordinary trimming or compaction/
  rotation, so this slice adds no pinning, archive scan, or retained lookup.
- `AgentRunEventType` and `RawTraceItem` contain no system-instruction or
  model-request event/field.
- A representative current Codex-backed run contains user, reasoning,
  assistant, tool-call, tool-result, and provider-compaction traces, with no
  system/prompt/request field.
- Native AutoByteus has one exact app-owned construction/configuration boundary:
  `SystemPromptProcessingStep` builds `currentSystemPrompt` and passes it to
  `llmInstance.configureSystemPrompt`. The later provider request is not one
  provider-neutral truth boundary: Anthropic joins every system-role working-
  context message, Gemini ignores those messages and uses
  `llmInstance.systemMessage`, and other native adapters serialize messages
  through their own renderers. This slice therefore records the constructed,
  configured AutoByteus prompt the user asked to inspect, not a purported full
  provider-effective request prompt.
- Claude passes AutoByteus-composed instructions as `systemPrompt` to the SDK
  query. Claude may add provider-owned instructions/context that AutoByteus
  cannot observe.
- Codex passes AutoByteus-composed instructions as `baseInstructions` on
  `thread/start`/`thread/resume`. Codex may retain or add provider-managed
  context that AutoByteus cannot reconstruct.
- Claude/Codex configured skills are materialized into `.claude/skills` and
  `.codex/skills`; they are capabilities, not text appended to these instruction
  arguments. Native AutoByteus does append its configured skill catalog to its
  processed prompt.
- CRR-001 proposed a prepared-run retry premise, but the user's convention
  challenge and SR-014 reachability audit found no independent supported trigger
  for the required state. Under normal repository operating assumptions,
  `recordRunStarted` reads and atomically writes current metadata; ordinary
  composer Send reaches that operation but does not make it fail while leaving
  the exact original prepared metadata present. Existing fallback code and a
  mocked unit test cannot establish their own product reachability. The premise
  therefore does not amend this approved requirements basis.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-prompt-activity-ux-spec.md` | Governing UI/UX behavior for the prompt-first Activity slice and trajectory container | REQ-SP-001–REQ-SP-009 | AC-SP-001–AC-SP-011 | Approved design input; SR-014 restores the approved presentation-only authority | Defines trajectory participation, card content, expansion, active-only restart, trimming, responsive, and accessibility states |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-instruction-raw-trace-schema.md` | Governing minimal persisted-field audit for the new trace kind | REQ-SP-002, REQ-SP-003, REQ-SP-008, REQ-SP-009 | AC-SP-001–AC-SP-004, AC-SP-010–AC-SP-011 | Approved design input; exact fields unchanged in SR-014 | Identifies required, derived, and rejected fields, run-scoped trace impact, and active-only persistence/publication semantics |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/data-migration-conventions-audit.md` | Evidence audit against canonical production data-migration conventions and README | REQ-SP-003, REQ-SP-004, REQ-SP-009 | AC-SP-004–AC-SP-006, AC-SP-011 | SR-015 evidence supplement; no product behavior authority | Confirms `Directly Usable — No Migration`, one forward-only current model, normal operating assumptions, no speculative recovery, existing-migration caller scope, and isolated-fixture validation |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/activity-transparency-ux-spec.md` | Deferred broader Activity/Event Monitor trajectory concept | Deferred context only | N/A | Context only; not governing this slice | Retained for future trajectory work; must not expand the prompt-first implementation scope |

## Design Health Assessment

- **Change posture:** Focused visible feature slice with an Activity-subsystem
  foundation refactor.
- **Root cause classification:** Boundary Or Ownership Issue plus Shared
  Structure Looseness.
- **Refactor posture:** Refactor the closed Activity contract into an extensible
  typed trajectory owner, then add the prompt kind through that path. A
  frontend-only or prompt-only card is not sufficient.
- **Evidence basis:** The exact instruction text exists at three different
  runtime invocation boundaries but has no shared event, persistence, projection,
  or Activity representation. Reconstructing it in the frontend would be
  historically inaccurate and would blur provider truth boundaries. SR-014
  confirms that the fallback-only CR-F-001 state supplies no independent reason
  to expand this design beyond the original listener-safe first-capture path.
- **Scope impact:** Establish the reusable typed trajectory seam and one narrow
  instruction-transparency subject without implementing speculative future
  kinds or the broader trajectory feature set.

## Recommendations

- Extend Activity through one provider-neutral, typed event/projection path;
  do not add a prompt-only panel, store, query, or provider-specific frontend
  branch.
- Persist the exact application-supplied instruction as the approved five-field
  run-scoped raw-trace record, and reuse its raw-trace ID for live and reloaded
  Activity identity.
- Derive runtime/source copy from authoritative run metadata, leaving redundant
  boundary, fidelity, snapshot, provider, turn, and display fields out of the
  persisted record.
- Preserve the existing active-only bounded lifecycle and Event Monitor
  semantics. Treat archive Activity browsing and all additional trajectory
  kinds as separate product work.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large` — the visible slice is narrow, but the truthful implementation crosses
three runtimes, raw-trace persistence and replay, standalone/team transports,
run projection, Activity state, desktop/mobile rendering, and raw-trace
inspection.

## Scope Guardrail (Mandatory)

This ticket authorizes the system-instruction slice and the minimum typed
trajectory foundation it exercises. It does not authorize a broader execution
viewer, archive browser, provider-payload inspector, or new prompt-security
policy.

### In-Scope Use Cases

| Use Case ID | Authorized Use Case |
| --- | --- |
| UC-SP-001 | Inspect the exact AutoByteus-configured native system prompt for a new supported run while its trace entry remains active/recent. |
| UC-SP-002 | Inspect the exact AutoByteus-supplied Claude SDK `systemPrompt` under a truthful source label. |
| UC-SP-003 | Inspect the exact AutoByteus-supplied Codex `baseInstructions` for thread start/resume under a truthful source label. |
| UC-SP-004 | Restore a valid instruction Activity entry after browser/server restart from the selected run's active raw trace, and omit it honestly when it is no longer selected. |
| UC-SP-005 | Carry live and reloaded instruction facts through the same provider-neutral typed Activity trajectory contract for standalone and team-member runs. |
| UC-SP-006 | Preserve existing tool/compaction Activity and Event Monitor behavior while adding the new kind. |

### Out of Scope

- User-message/input entries in Activity.
- Implementations of any future trajectory kind beyond system instructions.
- Full request/context manifests and provider payload viewers.
- Response-status/usage entries beyond existing surfaces.
- Any additional chain-of-thought/reasoning exposure.
- Event Monitor redesign or renaming.
- Archive-history navigation and storage paging.
- Pinning, retained landmarks/indexes, or archive lookup for system instructions.
- Prompt editing, copy/export, telemetry, or cross-run comparison.
- Rewriting historical data to manufacture missing prompts.
- A new prompt-specific authorization, redaction, or permission model; such a
  policy is a separate requirement because it would change the approved exact-
  content behavior.
- Recovery behavior for arbitrary process, operating-system, filesystem,
  storage-device, syscall, corruption, tampering, or unsupported concurrent-
  writer failures. No independent product/security/operations contract makes
  those premises part of this feature.

### Preserved Behavior Boundary

- BEH-SP-001/REQ-SP-006/AC-SP-007 preserve existing tool and compaction
  Activity behavior across standalone, team, desktop, and mobile paths.
- BEH-SP-007/REQ-SP-006/AC-SP-007 preserve Event Monitor content, selection,
  paging, ordering, cursor, and rendering behavior.
- BEH-SP-002–BEH-SP-004/REQ-SP-002 preserve truthful runtime scope: no card may
  claim provider-complete or provider-effective context.
- BEH-SP-005–BEH-SP-006/REQ-SP-003–REQ-SP-004 preserve current bounded active-
  trace behavior and honest absence without archive fallback.
- The system record must remain excluded from working-context reconstruction,
  tool/turn logic, and compaction prompt content.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite
  an approved requirement, acceptance criterion, or preserved-behavior ID that
  it protects.
- A finding that would introduce new product behavior, policy, threat model,
  migration obligation, or operational contract is a `Requirement Gap`; it
  must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-
  blocking risk, recommendation, or separate-ticket candidate. It must not be
  treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The
  solution designer must update the canonical requirements and obtain renewed
  user approval before a scope-changing proposal can govern design or
  implementation.

## Functional Requirements

- **REQ-SP-001 — Exact application-supplied instruction:** For each new supported
  run, Activity MUST expose the exact instruction text observed at the actual
  AutoByteus-owned runtime handoff: the native final processed prompt passed to
  `llmInstance.configureSystemPrompt`, the Claude SDK `systemPrompt`, or the
  Codex app-server `baseInstructions`.
- **REQ-SP-002 — Truthful runtime source:** The entry MUST identify the runtime,
  capture time, and runtime-specific source label. Runtime is obtained from the
  existing run metadata, not duplicated in the instruction trace. For the three
  supported runtimes there is exactly one captured instruction source, so no
  persisted `instruction_boundary` field is required. Claude/Codex entries MUST
  say that they are AutoByteus-supplied instructions. No runtime entry may
  claim that the recorded content is the provider's complete effective prompt
  or request context.
- **REQ-SP-003 — Active-window lifecycle:** The captured instruction MUST use
  the existing active raw-trace and bounded Activity lifecycle. Live capture
  displays it immediately. Reopen/restart hydration displays it only while its
  dedicated record remains in `raw_traces_active.jsonl` and is admitted by the
  normal recent projection. Ordinary trimming or compaction/rotation MAY make
  it disappear. This slice MUST NOT add pinning, archive lookup, or a separate
  retained landmark/index. If the instruction changes at a later runtime
  handoff, each version still present in the active window remains identified by
  its raw-trace ID and timestamp; no second snapshot ID is added.
- **REQ-SP-004 — Honest absence:** When the active projected trace window has no
  dedicated system-instruction record, Activity MUST show no instruction entry.
  It MUST NOT reconstruct text from the current agent/team definition, archived
  traces, or provider-owned context. Existing runs remain readable without a
  migration or an unavailable placeholder.
- **REQ-SP-005 — Inspectability and safety:** The Activity surface MUST provide a
  compact summary and an explicit disclosure for the complete captured text.
  The detail MUST preserve whitespace, support selection, wrap/scroll safely,
  and remain keyboard and screen-reader operable. This slice displays the exact
  recorded content under the selected run's existing authorization boundary;
  it does not introduce a redacted-content variant.
- **REQ-SP-006 — Preserve current surfaces:** Existing Activity tool/compaction
  behavior and Event Monitor behavior MUST remain unchanged. User-input cards,
  request/context cards, response-status cards, new reasoning exposure, archive
  browsing, copy/export, and telemetry are not part of this slice.
- **REQ-SP-007 — Extensible typed trajectory foundation:** System instructions
  MUST enter Activity through the same discriminated trajectory-entry contract
  as tool and compaction activity. The contract MUST define stable common
  metadata (entry identity, kind, owning run/member context, timestamp/order,
  and summary/detail availability) while keeping each kind's payload and
  renderer specialized. Those values MAY be represented by the entry, its
  owning run-keyed feed context, or a derived presentation contract; they MUST
  NOT be redundantly copied onto every entry when the containing context or
  content already owns them. The contract MUST NOT use a generic JSON catch-all
  or a prompt-specific parallel feed. This slice MUST NOT manufacture
  unapproved future activity kinds merely to demonstrate extensibility.
- **REQ-SP-008 — Provider-neutral event and projection path:** Runtime-specific
  capture adapters MUST convert the native configured final prompt, Claude SDK
  `systemPrompt`, and Codex `baseInstructions` handoff points into the same
  typed semantic `SYSTEM_INSTRUCTIONS_SUPPLIED` event/record. `Supplied` means
  AutoByteus passed/configured the text at its owned runtime boundary; it does
  not claim that an external provider accepted, preserved, merged, or
  internally applied it. Live streaming,
  persistence, reload, and Activity projection MUST consume that common
  contract. Provider-specific event shapes MUST NOT cross into the Activity
  store or renderer. The capture owner MUST commit the raw-trace record before
  publishing the live semantic event and MUST reuse the committed raw-trace ID
  in that event; the live envelope is not a separate durable event store.
- **REQ-SP-009 — Active raw-trace authority:** The exact
  instruction text MUST be durably recorded in the selected run's raw traces as
  `trace_type: "system_instruction"` with the existing raw-trace `id`, the exact
  supply timestamp in `ts`, and
  `source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED"`. `run_id` and `runtime_kind`
  MUST be derived from the owning run/path metadata rather than duplicated.
  `instruction_boundary`, `snapshot_id`, `fidelity`, `content_hash`, provider
  IDs, tool fields, and generic metadata MUST NOT be added for this slice.
  The record is a run-scoped instruction-version landmark: it MUST NOT contain
  `turn_id` or per-turn `seq`, and the Codex thread start/resume capture MUST NOT
  receive a fabricated turn. Only the first supply of a consecutive
  instruction value equal under direct string comparison in the active raw
  trace MUST be
  recorded. The latest active system-instruction record is the comparison
  point; rotation that removes it resets this folding boundary. A changed value
  and a later reversion after a change MUST each create a new record. Direct
  string equality defines sameness; no content hash is stored. Live and reload
  Activity projection MUST consume active records through the existing bounded
  policy. Archived records remain raw-trace evidence but are not read or shown
  by Activity in this slice.

## Acceptance Criteria

- **AC-SP-001:** On a new native AutoByteus run, expanding the Activity
  instruction entry yields text exactly equal under direct string comparison to
  `currentSystemPrompt`
  passed to `llmInstance.configureSystemPrompt` after native configured-skill
  catalog assembly.
- **AC-SP-002:** On a new Claude run, the entry yields text equal to the
  `systemPrompt` passed by AutoByteus to `startQueryTurn` and is labeled
  `AutoByteus-supplied · Claude SDK systemPrompt` (or equivalent truthful copy).
- **AC-SP-003:** On a new Codex run or resume, the entry yields text equal to the
  `baseInstructions` sent by AutoByteus to `thread/start` or `thread/resume` and
  is labeled `AutoByteus-supplied · Codex baseInstructions` (or equivalent).
- **AC-SP-004:** Changing an agent/team definition after capture does not alter
  the persisted entry shown for the already-recorded boundary.
- **AC-SP-005:** If normal recent-window trimming or compaction/rotation removes
  the instruction record from the active projected window, Activity may omit
  the entry and performs no archive lookup.
- **AC-SP-006:** Opening an older or compacted run with no active prompt record
  preserves its existing conversation and activities, shows no system-
  instruction entry, and does not reconstruct text.
- **AC-SP-007:** Existing tool/compaction Activity cards and the center Event
  Monitor render and behave as before for standalone and team-member runs.
- **AC-SP-008:** The prompt disclosure works by pointer and keyboard, exposes an
  accessible label/status, and contains long text without horizontal page/panel
  overflow or center-pane resizing.
- **AC-SP-009:** Tool, compaction, and system-instruction entries are represented,
  ordered, transported, stored, and rendered through one narrow-base,
  kind-specialized trajectory contract across standalone and team-member paths.
  Prompt data is neither hidden in generic JSON nor obtained through a separate
  prompt-only UI/store side channel, and malformed prompt detail does not stop
  unrelated activity kinds from rendering.
- **AC-SP-010:** Equivalent native, Claude, and Codex instruction captures enter
  the common pipeline as the same semantic event/entry kind and render through
  the same Activity component path. Changing a provider adapter or native event
  shape does not require the Activity store or card to parse that provider's raw
  protocol. Live projection and persisted reload yield equivalent instruction
  identity, ordering, summary, truthful source label, and detail availability.
  The live semantic event carries the persisted raw-trace ID rather than
  introducing a second snapshot/activity identity.
- **AC-SP-011:** A new run writes a dedicated typed system-instruction record to
  raw traces with exactly the required/conditional fields defined in
  `system-instruction-raw-trace-schema.md`; its content and timestamp match the
  observed supply. A displayed live entry has the same identity as its already-
  committed raw-trace record. Restarting and reopening the run restores that
  entry while the record remains in the active selected window. After the
  record is trimmed or rotated out, reopening does not restore it and performs
  no archive scan or reconstruction.

## Constraints / Dependencies

- The capture source must be the exact string already present at each approved
  AutoByteus-owned runtime handoff; provider-owned hidden context is unavailable
  and must not be inferred.
- Existing selected-run authorization governs access to the exact prompt. This
  slice must not create telemetry, export, or an independent disclosure route.
- Existing run metadata remains authoritative for run/member identity and
  runtime kind; those values are not duplicated in the trace.
- Raw-trace rotation, active-only reads, the Activity resident bound of 100,
  desktop auto-follow, and the mobile ten-row presentation remain governing
  lifecycle constraints.
- Native/Codex instruction capture occurs before normal live listeners exist;
  implementation must stage each newly committed instruction event until
  listener binding and publish it before first input, without introducing a
  second durable event log.
- Repository dependencies are not installed in the dedicated worktree. The
  implementation and coverage stages must complete setup before executable
  validation.
- Normal execution assumes a stable process, writable storage, and normal
  filesystem behavior. A defensive fallback, generic infrastructure capability,
  or synthetic test does not independently authorize failure-recovery behavior.

## Persisted Data Outcome

- **Decision:** `Directly Usable — No Migration` for existing runs.
- New instruction records are additive and captured only from rollout forward.
- The active raw trace is the only source read by Activity for new system-
  instruction records. Archived records are not projected in this slice.
- Existing raw traces, working-context snapshots, conversation projections, and
  Activity rows remain unchanged.
- Missing active prompt data produces no Activity entry and is not inferred.
- Exact prompt content can contain internal paths/instructions; it must remain
  under the same authorization boundary as the selected run and must not be
  added to telemetry by this slice.

## Assumptions

- No unresolved product assumption changes the approved scope.
- Existing run configuration/metadata truthfully identifies
  `autobyteus`, `claude_agent_sdk`, or `codex_app_server` for source-label
  derivation; an unexpected value receives neutral AutoByteus-supplied copy
  rather than a fabricated provider claim.
- New trace capture begins only after deployment. Existing runs are expected to
  lack this record and remain valid without migration.

## Risks / Open Questions

- **Sensitive exact content:** prompts may contain internal instructions and
  paths. The approved mitigation is the existing selected-run boundary,
  collapsed disclosure, and removal/redaction of parallel content logging.
- **Bounded visibility:** active-file rotation or the current recent window can
  remove the entry from Activity. The user explicitly accepted this behavior.
- **Storage/read cost:** large prompt rows add trace bytes and existing JSONL
  reads are whole-file. Consecutive direct string comparison limits duplicate
  rows; offset-indexed storage paging is separate work.
- **Provider opacity:** the feature cannot prove the provider's complete
  effective system context. Truthful source labels are mandatory.
- **Open product questions:** None for this approved slice.

## Requirement-To-Use-Case Coverage

| Use Case ID | Requirement IDs |
| --- | --- |
| UC-SP-001 | REQ-SP-001, REQ-SP-002, REQ-SP-003, REQ-SP-005, REQ-SP-009 |
| UC-SP-002 | REQ-SP-001, REQ-SP-002, REQ-SP-003, REQ-SP-005, REQ-SP-008, REQ-SP-009 |
| UC-SP-003 | REQ-SP-001, REQ-SP-002, REQ-SP-003, REQ-SP-005, REQ-SP-008, REQ-SP-009 |
| UC-SP-004 | REQ-SP-003, REQ-SP-004, REQ-SP-009 |
| UC-SP-005 | REQ-SP-007, REQ-SP-008, REQ-SP-009 |
| UC-SP-006 | REQ-SP-006, REQ-SP-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-SP-001 | Native live capture expands to content exactly equal under direct string comparison to the configured processed prompt. |
| AC-SP-002 | Claude live capture equals the SDK argument and uses truthful Claude source copy. |
| AC-SP-003 | Codex start/resume capture equals `baseInstructions` and uses truthful Codex source copy. |
| AC-SP-004 | Changing the current agent/team definition does not mutate an already-recorded entry. |
| AC-SP-005 | Recent-window eviction and raw-trace rotation cause honest omission with no archive lookup. |
| AC-SP-006 | An older/compacted run with no valid active record preserves all existing views and shows no fabricated instruction. |
| AC-SP-007 | Standalone/team and desktop/mobile regression scenarios preserve tool, compaction, and Event Monitor output. |
| AC-SP-008 | Keyboard, pointer, screen-reader, whitespace, selection, long-line, and contained-scroll scenarios pass. |
| AC-SP-009 | Strict kind admission, malformed-system-row isolation, bounded ordering, and specialized render dispatch are verified. |
| AC-SP-010 | Native/Claude/Codex plus standalone/team live paths produce the same semantic entry shape and identity as reload. |
| AC-SP-011 | Exact five-key JSONL persistence, commit-before-live, active restart hydration, and post-rotation absence are verified. |

## Approval Status

`Approved by the user through the prompt-first, exact-field, active-only
retention clarification sequence and the explicit instruction to continue into
design. The collapsed chronological Activity row is the approved presentation
baseline. SR-014 rejects CR-F-001's unsupported storage-failure premise, and
SR-015 confirms the resulting additive, forward-only, no-migration design against
the canonical convention and README. Neither revision adds product scope.`

Recommended default: show a compact `System instructions` row that is collapsed
by default, with the complete exact captured text available through one explicit
expansion. This keeps Activity scannable while satisfying the requirement to see
what the system prompt actually looks like.
