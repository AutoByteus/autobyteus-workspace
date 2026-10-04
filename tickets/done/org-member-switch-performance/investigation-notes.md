# Investigation Notes

## Investigation Meta

- Package identifier: `org-member-switch-performance`
- Request / ticket: Slow member switching in a long-running Agent Org (user report with screenshots, 2026-10-04)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance` / `codex/org-member-switch-performance`
- Resolved base remote / branch / revision: `origin` / `personal` / `26b555126ebcda7d9fa80d728e24475baba7acb8` (fetched 2026-10-04)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/org-member-switch-performance/` created.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Investigation status: Requirements and architecture investigation complete (requirements approved 2026-10-04).

## Initial Request And Clarifications

- Original request (paraphrased from user): In one Agent Org that has run very large, long tasks (lots of raw traces), switching the focused member in the sidebar is very slow, e.g. focused on *api e2e engineer* and clicking *code reviewer* takes a noticeable wait. Investigate, try to reproduce, find the cause (possibly over-engineering or unknown places).
- Clarifications received: None yet.
- User-supplied facts: Two screenshots — org run "currently our project have provided the project…" with the right-side **Org** tab open showing *Messages* (code reviewer: "42 Messages") and a long inline list of reference files (`dirty-work.tar.gz`, `git-status.txt`, `index.js.map`, …) under each message.
- Initial ambiguity: Whether the slowness comes from raw-trace (center feed) hydration, as the user suspected, or elsewhere. Resolved by reproduction below: raw traces are **not** the cause.

## Product And Domain Understanding

- Product area: Workspace → Agent Org run → member focus; right-side **Org** tab (`teamMembers` tab key) → *Messages* (`CollaborationOverviewPanel` → `CollaborationMessagesSection` → `CollaborationMessagesPanel`).
- Affected actors: Desktop user inspecting or operating a long-running Agent Org (also Agent Team and standalone agent with task children, which share the same panel).
- Existing purpose: The Messages panel lists every inter-agent message sent/received by the focused member, newest first, each followed inline by **all** of its reference files; selecting a message shows Markdown content, selecting a reference opens the file viewer.
- Terminology: *reference files* = absolute paths attached by agents via `send_message_to.reference_files`; *perspective* = messages filtered to the focused member.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-04 | Data | `~/.autobyteus/server-data/memory/agent_org_run_history_index.json` | Identify run in screenshot | Run `autobyteus_org_be52ac58c92a412e9f30b2260237c7cf`, created 2026-10-03 | — |
| 2026-10-04 | Data | `du`, `ls` on `memory/agent_orgs/autobyteus_org_be52ac…/` | Size raw traces | 89 MB total; archives up to 2.7 MB each; **active** traces only 8 KB–1.6 MB | Raw traces bounded by earlier `agent-run-history-performance` work |
| 2026-10-04 | Data | python over `agent_org_communication_messages.json` | Shape of Org messages | **9.96 MB**, 59 messages; `referenceFiles` = 9.33 MB of it. Ref count per message grows monotonically 2 → **3,136**. 3,147 distinct paths (2,724 under `tickets/…`, 133 in `dist/`) | Producer behavior is a separate concern |
| 2026-10-04 | Data | same, aggregated per member | Rows the panel must render | code_reviewer 42 msgs / **41,965** reference rows; api_e2e 18 / 22,476; implementation 24 / 11,896; solution_designer 19 / 8,265; architecture_reviewer 15 / 604 | — |
| 2026-10-04 | Code | `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue` | Rendering | Left list `v-for` all messages and, inside each, `v-for` **all** `referenceFiles` → `<button>` + `<Icon>` per reference. No windowing/collapse | — |
| 2026-10-04 | Code | `.../CollaborationMessagesSection.vue:34` | Count header | Calls `props.messages.listMessages()` independently → **second full projection** | — |
| 2026-10-04 | Code | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:336-347`, `:113-135` | Where the view comes from | `selectedTarget()` builds a **new** `messagesView` each call; `listMessages()` re-projects from `this.view.communication_messages.messages` with no memoization | — |
| 2026-10-04 | Code | `.../agentOrgCommunicationPerspective.ts`, `.../agentOrgReferenceProjection.ts` | Projection cost | For every reference of every focused message: `crypto-js` `sha256(messageId\0path)` to derive `referenceId` | — |
| 2026-10-04 | Code | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-reference-content-service.ts` | ID contract | Server resolves `.../references/:referenceId/content` by recomputing `sha256(messageId\0path)` hex for the message's refs | ID contract must be preserved |
| 2026-10-04 | Code | `autobyteus-web/stores/agentOrgContextsStore.ts:31,244`, `stores/activeContextStore.ts:89-93` | Invalidation | `contexts` is a deep `ref`; `activeWorkspaceTarget` → `activeTargetFor` → `selectedTarget()` recomputes on `select()`; Org view replaced on each new communication message (`agentOrgExecutionContext.ts:236-241`) | — |
| 2026-10-04 | Code | `autobyteus-web/components/layout/RightSideTabs.vue:41-46` | Mount condition | Org panel mounted only while `effectiveActiveTab === 'teamMembers'` (v-if) | Explains control result |
| 2026-10-04 | Code | `autobyteus-web/utils/teamCommunication/teamCommunicationPerspective.ts`, `services/agentCollaboration/agentRunCollaborationContext.ts` | Other roots | Agent Team / standalone perspectives use server-provided `reference_id` (no hashing) but feed the **same** unbounded panel | Same DOM-scale risk |
| 2026-10-04 | Code | `autobyteus-web/components/mobile/MobileTeamMessages.vue:11,28` | Mobile | Shows 8 newest messages but all their references | Adjacent; see DEC-003 |
| 2026-10-04 | Doc | `tickets/done/agent-run-history-performance/requirements-doc.md` | Prior work | Center feed already bounded to active trace / latest 100 visual events | Confirms raw traces are not this issue |
| 2026-10-04 | Command | `probes/reference-projection-bench.mjs` (Node, crypto-js) | Isolated projection cost | One projection: code_reviewer **355 ms**, api_e2e 188 ms, architecture_reviewer 5 ms | `evidence/node-projection-bench.txt` |
| 2026-10-04 | Runtime | `probes/measure.mjs` (Playwright, headless Chrome, 2000×1250, production `nuxt build` of base `26b555126`, isolated backend = installed v1.4.94-beta.2 on snapshot data) | End-to-end reproduction | See Runtime findings | `evidence/switch-*-results.json` |
| 2026-10-04 | Runtime | Chrome CPU profile of one api_e2e → code_reviewer switch; `probes/analyze-profile.py` | Attribution | ~1.5 s in two `listMessages` calls (≈750 ms each, dominated by crypto-js `_append/_doProcessBlock/_doFinalize`); remaining ≈1.3–1.8 s Vue mount/patch + Iconify + style/layout | `evidence/switch-Org.cpuprofile.gz`, `evidence/switch-Org-profile-summary.txt` |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Click a member row in the sidebar tree of an Agent Org run while the right-side **Org** tab is open | Focus changes → center feed shows member → Org *Messages* recomputes and re-renders the member's message list with every reference inline | Correct content, but UI frozen **3.2–4.2 s** for code reviewer (41,965 refs), ~1.1–2.5 s for api e2e (22,476), ~0.3 s for architecture reviewer (604) | `evidence/switch-Org-results.json` | High |
| BEH-002 | User | Same click with another right tab (Files) active | Focus changes; Org panel not mounted | **5–51 ms** for every member | `evidence/switch-Files-results.json` | High |
| BEH-003 | User | Open **Org** tab / view messages | Messages listed newest first; each message row followed by all reference rows (icon + file name); count header "N Messages"; first message auto-selected | DOM up to **188,589 nodes** for code reviewer | Screenshot `evidence/repro-org-tab-api-e2e.png`; user screenshots | High |
| BEH-004 | User | Click a reference row | Detail pane opens `CollaborationMessageReferenceViewer` using `referenceId` route; server matches `sha256(messageId\0path)` | Works; identity contract shared with server | Code paths above | High |
| BEH-005 | System | New communication message arrives in a live org | `applyEvent` replaces `view` → focused perspective re-projected (all refs re-hashed) and list re-rendered | Same per-reference cost incurred on every new message while Org tab open | Code `agentOrgExecutionContext.ts:236-241` | Medium (not separately timed) |
| BEH-006 | User | Agent Team / standalone agent with collaboration messages | Same panel; no hashing; unbounded reference rows | DOM-scale cost proportional to references | Code | Medium (no large team dataset measured) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `CollaborationMessagesPanel.vue` | Renders all messages + all references inline | Rendered work must not scale with total reference count | Collapse/window references; possibly virtualize message list |
| `CollaborationMessagesSection.vue` | Separate `listMessages()` for count | Avoid duplicate projection | Share one projection or expose count cheaply |
| `agentOrgExecutionContext.messagesView` / `selectedTarget` | New view per target computation; no caching | Switch cost should not repeat work already done | Memoize per (view, focused member) or precompute index |
| `agentOrgReferenceProjection.ts` | Eager crypto-js SHA-256 per reference | Reference identity needed only on open | Lazy ID derivation (on selection) or server-provided IDs; must stay equal to server hash |
| `agent-org-reference-content-service.ts` (server) | Recomputes hash over the message's refs to resolve | Preserve contract | Unchanged unless design chooses index-based IDs |
| `agent_org_communication_messages.json` | 10 MB sidecar, sent whole in org execution view | Org open cost (not this report) | Out of scope unless approved (DEC-002) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `agent_org_communication_messages.json` (per org run) — readers: server `AgentOrgRunManager` snapshot, GraphQL/stream org execution view, reference content REST.
- Evidence: data probes above.

### Structural Surfaces

- Frontend: `CollaborationMessagesPanel/Section/OverviewPanel`, `RightSideTabs`, `agentOrgExecutionContext`, `agentOrgCommunicationPerspective`, `agentOrgReferenceProjection`, `teamCommunicationPerspective`, `agentRunCollaborationContext`.
- Server: reference content service (ID contract only).

### Potential Structural Impacts To Investigate

- API or external-contract change: Not required by the minimum fix; possible if design opts for server-supplied reference IDs.
- Persistence schema or invariant change: None expected.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: None expected.
- Deployment / migration / ownership: None.
- Confirmed absent/present/unknown: Absent for persistence/security; API change optional.

## Runtime, Probe, Or Reproduction Findings

Setup: isolated snapshot (`/tmp/org-switch-repro/data`, only this org run + one-row index, minimal `.env`, no secrets) served by the installed AutoByteus v1.4.94-beta.2 server on port 29811; production `nuxt build` of base `26b555126` (same version) served statically on 29812; Playwright-driven headless Google Chrome at 2000×1250. Org run opened read-only (stopped/historical), *software engineering team* expanded. Timing = click → first painted frame, and → end of last long task (settled).

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `node probes/measure.mjs <out> Org` | Org tab open; sequence of member clicks | code reviewer: **3,155 / 3,212 / 4,232 / 3,255 ms** settled, 188,589 DOM nodes, 41,965 ref rows; api e2e: 1,078 / 2,507 ms (101,664 nodes); solution designer 1,048 ms; implementation engineer 730 ms; architecture reviewer 312 ms | Cost scales with reference count, not with traces | `evidence/switch-Org-results.json` |
| `node probes/measure.mjs <out> Files` | Files tab open; same sequence | **5–51 ms** for all members | Center feed / raw traces are not the bottleneck | `evidence/switch-Files-results.json` |
| CPU profile (CDP Profiler, 200 µs) | api e2e → code reviewer, Org tab | 4.29 s sampled; `listMessages` ×2 ≈ 752 + 746 ms; crypto-js internals ≈1.2 s self; Vue render/patch ≈1.3 s; Iconify/DOM/layout remainder | Both projection and DOM scale must be fixed; either alone leaves ≥1.3 s | `evidence/switch-Org.cpuprofile.gz`, `evidence/switch-Org-profile-summary.txt` |
| `node probes/reference-projection-bench.mjs` | Projection only, Node | code reviewer 355 ms per projection | Hashing alone exceeds a responsive budget | `evidence/node-projection-bench.txt` |
| Feasibility spike 1 (throwaway, reverted; `probes/minimal-spike.patch` minus cap): reference ID derived lazily on read; reference rows rendered only under the selected message, other messages show a count | Same harness, Org tab | code reviewer 182 / 197 / 429 / 190 ms; api e2e 151 / 387 ms; others 26–95 ms. Remaining cost = auto-selected newest message with 3,136 references fully rendered | Two removals eliminate ~90% of the cost without caching or reactivity changes | `evidence/spike1-lazy-id-selected-only-results.json` |
| Feasibility spike 2 (throwaway, reverted; `probes/minimal-spike.patch`): spike 1 + selected message shows first 20 references + plain "Show all N files" button (no virtualization) | Same harness, Org tab; `probes/measure-spike.mjs` | **Every switch 26–82 ms** (baseline up to 4,232 ms); DOM ≈1.1k nodes (baseline 188,589); "Show all 3,136" = **254 ms** | Meets proposed QR-001/QR-002/QR-003 with no memoization, `markRaw`, incremental-update or virtualization machinery | `evidence/spike2-plus-first20-cap-results.json`, `evidence/spike2-show-all-result.json` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Member switching in long-running org is "really, really slow" | Strong (reproduced) | Switch must feel immediate regardless of org age | Acceptable target (proposed ≤ 200 ms) |
| User screenshots | Org tab visible with inline reference lists | Strong | Reference presentation change is user-visible → needs approval | DEC-001 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Org reference content REST route | server `agent-org-references.ts` + content service | `referenceId == sha256hex(messageId + "\0" + path)` | Code | None |
| `crypto-js` | web dependency | Pure-JS SHA-256 (slow, synchronous) | Profile | — |

## Persisted Data And State Facts

- Affected stored subject: none changed. `agent_org_communication_messages.json` is read-only for this fix.
- Location and representative shape: `{schemaVersion, subjectKind, orgRunId, messages:[{messageId, senderAgentRunId, receiverAgentRunId, content, messageType, referenceFiles: string[], createdAt}]}`.
- Approximate volume: 59 messages / 9.96 MB; largest message 3,136 references / 733 KB.
- Required preservation: all messages and references remain viewable; no data loss.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.
- Note: the fix changes visible reference-list presentation; the decision is captured as DEC-001 for the user rather than a Product handoff.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/measure.mjs` | Solution Designer | Reproducible end-to-end switch timing harness | Org tab vs control | AC-001, AC-002, AC-006 | Current | Evidence only; N/A |
| `probes/reference-projection-bench.mjs` | Solution Designer | Isolated projection benchmark | Projection cost | AC-003 | Current | Evidence only; N/A |
| `probes/analyze-profile.py` | Solution Designer | CPU profile attribution | Attribution | — | Current | Evidence only; N/A |
| `evidence/*` | Solution Designer | Baseline measurements, profile, screenshots | Baseline | AC-001–AC-006 | Current | Evidence only; N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Exact cost of BEH-005 (new message arrival) in a live org | Same root cause; secondary symptom | Verify in architecture/validation | Open |
| UNK-002 | Unknown | Headless Chrome vs Electron renderer timing ratio | User machine shows similar magnitude subjectively | Validation in Electron downstream | Open |
| RISK-001 | Risk | Producer side: agents attach ever-growing cumulative reference lists (up to 3,136 files incl. `dist/` and evidence files) | Data volume will keep growing; also 10 MB org view payload on open | Separate ticket candidate (DEC-002) | Open |
| ASM-001 | Assumption | Users do not need to scan thousands of file names inline in the message list to find a message | Basis for collapsing references | User decision DEC-001 | Pending |

## Architecture Investigation Findings

Performed 2026-10-04 after requirements approval (SR-003).

| Area | Exact Source | Observation | Design Implication |
| --- | --- | --- | --- |
| Panel consumers | `grep CollaborationMessagesPanel` | Panel is used only by `CollaborationMessagesSection.vue`, which is used only by `CollaborationOverviewPanel.vue`, which `RightSideTabs.vue` mounts for the `teamMembers` (Org/Team) tab | Section can own the single list computation and pass rows to Panel; no other caller is affected |
| `listMessages()` consumers | `grep listMessages` | Production callers: `CollaborationMessagesSection.vue:34` (count) and `CollaborationMessagesPanel.vue:182` (list). Providers: `agentOrgExecutionContext.ts:342` (org), `activeContextStore.ts:79` (team), `agentRunCollaborationContext.ts:276` (standalone agent) | One consumer-side change covers all three roots (REQ-005, REQ-007) |
| Eager hashing call sites | `grep projectAgentOrgReference` | `agentOrgCommunicationPerspective.ts:45` (org) and `agentRunCollaborationContext.ts:299` (standalone agent with task children) | Making `projectAgentOrgReference` derive its ID on demand fixes both roots at the single owner |
| Team root reference IDs | `utils/teamCommunication/teamCommunicationPerspective.ts:35-41` | Server-supplied `reference_id`; no hashing | Only the panel's rendering bound applies |
| Reference ID consumers in panel | `CollaborationMessagesPanel.vue:59,61,89,186-187,234-238` | `referenceId` is read for the v-for key, the selected highlight, `selectedReference` lookup and `referenceContentPath` | IDs are read only for rendered rows and the opened reference. Rendering ≤ 20 rows bounds hashing to ≤ 20 per switch |
| Frozen rows and Vue reactivity | `agentOrgCommunicationPerspective.ts:37` (`Object.freeze`) | Vue does not proxy non-extensible objects, so a memoized getter on a frozen reference record is not tracked or proxied | On-demand ID via a memoized getter is safe in reactive computeds |
| Existing tests | `components/workspace/collaboration/__tests__/CollaborationMessagesPanel.spec.ts:70-97`; `services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts` | Panel tests click a reference row of a **non-selected** message (`message-sent`) directly. The projection test asserts the server hash via `toEqual` | Panel tests must select the message first (approved behavior change). The projection test stays valid because `toEqual` reads the getter; add an on-demand assertion |
| Localization | `localization/messages/{en,zh-CN}/workspace.ts:256-290`; `scripts/audit-localization-literals.mjs`; interpolation `{{count}}` with `t(key, { count })` | All visible copy must be localized in en + zh-CN | New keys for "Show all {{count}} files" and the file-count accessible label |
| Mobile | `components/mobile/MobileTeamMessages.vue` | Separate component | Out of scope (DEC-003) |
| Spike | `probes/minimal-spike.patch` | Validated the core mechanics | The design adopts them, plus the single computation in Section and the count on every row |

## Requirement Implications

- The reported slowness is not raw-trace related; it is caused by the Org Messages panel doing work proportional to the **total reference count** of the focused member on every switch: (1) eager SHA-256 per reference, executed twice, and (2) mounting one button + icon component per reference.
- A fix must bound both computation and rendered rows independently of how many references agents attach, while preserving the reference-open contract and existing message semantics.
- Because the reference list presentation is visible and was previously designed (`tickets/done/team-communication-messages-ui`), changing it needs explicit user approval.

### Message-Count Survey (user question, 2026-10-04: "do we need a Load more for messages?")

- Survey of all 877 local org/team runs with messages in `~/.autobyteus/server-data/memory`: the highest per-member message count is **241** (archived team `software_engineering_team_e4b7ee1b…`; that member also has 9,798 references). Typical maxima are 30–170.
- On the reported org, the fixed spike renders all 42 code-reviewer message rows within 63–82 ms. Message rows are cheap; references were the cost.
- Decision (user, 2026-10-04): "the number of messages is not … a problem … the file is … I think that's fine." No message paging in scope. A dedicated 241-message timing was started and stopped at the user's direction; it is not part of acceptance.

### Simplicity Assessment (user prompt, 2026-10-04: "performance issues often come from over-engineering or poor UX understanding")

- Existing over-complication contributing to the issue: (1) an opaque SHA-256 identity derived eagerly for every reference, on both client and server, where only the opened reference needs an ID; (2) the `listMessages()` function-on-a-fresh-view interface, which defeats Vue's computed caching and lets two consumers each recompute; (3) a UX decision to inline every reference under every message, which assumed a few files per message. Agents attaching thousands of files invalidated that assumption.
- The earlier SR-001 recommendation (memoization per member, `markRaw`, incremental live updates, virtualized "Show all") was itself more machinery than needed. Spike 2 shows the two removals plus a plain cap meet every proposed target. Those mechanisms are not proposed unless later measurement requires them.

## Notes For Architecture Design

- Map SCN-001/SCN-002/SCN-003 to: `RightSideTabs` → `CollaborationOverviewPanel` → `CollaborationMessagesSection/Panel` ← `messagesView` (org/team/standalone).
- Verify: single projection per (view revision, focused member); lazy or cached reference identity equal to server hash; rendered reference rows bounded per message; whether deep reactivity on the org `view` should be `markRaw`/`shallowRef` for this path.
- Reuse `probes/measure.mjs` as the regression harness.
