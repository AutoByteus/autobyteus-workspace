# Design Spec — composer-mention-discoverability

## Solution And Approval Basis
- Current solution revision SR-005; design status Ready.
- Approved requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/requirements-doc.md. User direct “goood. the requriement is clear now. lets go” after duplicate-top-chip confirmation; unchanged SR-003 intent accepted and captured SR-004. User subsequently selects existing approved screenshots as all needed and ends Product work; screenshot-only supplements are authoritative, no further Product dependency.
- Accepted UI evidence: /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-approval-record.md, PDR-005 behavior source 2802de1fb91cd82498ccfda1edcea43869dc2665; approved-ui-evidence composer-1512.png, composer-selected-1512.png, composer-1024.png. Complete Product ui-ux-spec/promotion N/A — user-closed, not falsely completed. No competing UI/UX specification authored here.
- Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/investigation-notes.md (A-001–010). Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability, branch codex/composer-mention-discoverability, base origin/personal e04cfef23550c3b78286a53befc6bd5d71fb1061, finalization origin/personal.

## Current-State Read
AgentUserInputForm binds one ComposerTarget, renders attachments, then separate mention chips and optional skill chips plus AgentUserInputTextArea. Textarea edits native draft text; useRunMentionMenu inserts @Name and records chosen definition identity. Plain text presence controls active metadata projection at send, not chip visibility. Existing chip+inline rendering was previously intentional; the user's new appearance replaces it. Current boundaries are healthy; no route or backend refactor needed. See A-001–005.

## Task Size And Architectural Risk (Mandatory)
- task_size: Medium.
- Scope: existing form/textarea, bounded removal from mention composable and chip-only utility, two locale catalog entries, colocated tests and renderer browser probe. No new runtime capability or subsystem. Several frontend files within current ownership, not a broad feature.
- architectural_risk: Low.
- Evidence: native editor, ComposerTarget and AgentContext unchanged; existing mention token/identity parser and sending DTO preserved; no external contract, persistence schema, security, concurrency admission, backend lifecycle, Electron, deployment or dependency changes. Decoration is derived local render state, listeners/observer scoped to existing component.
- Content vs structure: approval screenshots/documents are payload evidence; prototype captured-state inventory is excluded, not implementation architecture. Structural delta is one local presentation path and dead-row removal, not prototype reconstruction.
- Escalate: return Design Impact/Requirement Gap if implementation needs rich-text/contenteditable, new persisted spans or editor undo model, changes send/identity/root eligibility, touches backend/desktop shell, or cannot align native rendering within existing owner. Do not silently expand or retain both selected representations.

## Architecture Investigation Evidence
| Evidence | Observation | Decision | Remaining uncertainty |
| --- | --- | --- | --- |
| A-001/002 | Existing textarea and scope already own editor, menus and target | Extend same owner, prioritize mention-aware placeholder, preserve native editor | Rendering validated by implementation/browser |
| A-003/004 | Existing filter/splitter and retained chosen identities; chip helpers unused elsewhere | Reuse parser, no new draft type; delete chip-only path | Native browser undo/metric checks required |
| A-005/006 | Existing admission/held submit filters metadata and retains failures | No stores/streams/server behavior change | Downstream regressions prove preservation |
| A-007/008 | Registered locales; Product mirror API differs from production | Add local catalog keys, build derivative decorator against production APIs | Locale/font/scroll behavior requires checks |
| A-009/010 | Testing route and isolated clean base confirmed | Component + web renderer probes; keep worktree context | Integration drift checked by downstream owners |
Sources are exact paths/commands in investigation, no competing evidence authority.

## Intended Change
1. Remove the top mention-chip row completely (not just hide with CSS); retain inline @Name and metadata.
2. In mention-capable live editor, use localized native placeholder English “Ask anything · @ for an agent or team”; priority over existing skillTagging/custom run placeholders. No external helper. When mention capability absent, preserve original skill/custom/generic chain; New Chat remains unchanged.
3. Render selected inline mention background below the native transparent textarea. Keep native glyphs/caret/selection/undo and all existing input handling. No added span padding/font weight/width that would move caret or wrapping.
4. Pure derivative highlight uses selected identities still active in current text, not server catalog lookup or arbitrary typed @Name. Preserve native edit/send lifecycle.

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Kind | REQ/AC | Trigger/current | Target/preserved lifecycle | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001,004/AC-001 | Empty supported run; source generic/skill/custom placeholder | active context → ComposerTarget.mentionScope → existing available computed → localized native placeholder → visible empty editor; no draft mutation | DS-001 |
| BEH-002 | User | REQ-002,003/AC-002,003,005 | Type @ and choose; current duplicate chip and text | textarea/menu choice → chosen metadata+draft token → token-presence filter/splitter → decorative background projection; native edit/undo updates text and active projection; no top row | DS-002/DS-004 |
| BEH-003 | User/System | REQ-004/AC-004 | Send/dismiss/reject | unchanged ComposerTarget.send → owning run store → token-filtered DTO/stream → existing server admission/focused-agent delivery; accepted clears draft, rejection keeps it | DS-003/DS-005 |

## Relevant Supplemental Task Artifacts
| Absolute path | Purpose/status | Relationship |
| --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-approval-record.md | UI-APP-001 accepted appearance/user quote/source pin | REQ-001/002 appearance approval; not full Product lifecycle |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/product-design-proposal.md | Accepted PDR-005/current native-edit contract plus historical rounds | REQ-001–004; no copy of Product's menu/fixture APIs |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-1512.png | Approved empty crop, hash verified in SR-003 | Normative cue/layout |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-selected-1512.png | Approved selected crop | Normative single inline highlight/no row |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-1024.png | Approved constrained crop | Responsive appearance |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/inside-empty-1512.png, inside-selected-1024.png | Approved context, synthetic fixture shell/content illustrative | Scope context, not shell redesign |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/sha256-manifest.txt, results.json, validation.log | Integrity and focused 18/18 evidence | Not production check pass |
| /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/prototype-ticket.md, validation-record.md, baseline-gap.md | Source provenance; unresolved DATA-001/BASE-002, original 53/54 | Prototype-only limitations, user closed repairs/spec/promotion scope |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/product-design-request.md, product-proposal-receipt.md, product-ui-approval-receipt.md, product-completion-request.md | Original screenshots/requests, cumulative historical receipts | History: completion request superseded by explicit user closure; no more Product forwarding |
Final Product ui-ux-spec N/A — not produced, screenshot-only authority expressly selected by user. Independent architecture/code review N/A pending configured classification route, never fabricate Pass.

## Task Design Health Assessment (Mandatory)
- Change posture: Behavior Change (focused UI improvement), not a bug in collaborator lifecycle.
- Current design issue: No structural issue found for scope; missing discovery cue and duplicate selected presentation are user-directed product delta.
- Root cause: No Design Issue Found (current chip+text matched prior approved UX).
- Refactor needed now: No architecture refactor. Remove obsolete selected-chip surface and chip-only functions as clean-cut local cleanup.
- Evidence A-001–005: draft/context, menu and submission ownership already appropriate. Renderer can consume existing filter/splitter; no generic editor service or duplicated business policy needed.
- Response: keep file boundaries; derived background decoration inside textarea, metadata remains with AgentContext and picker. Scoped UI listener/observer lifecycle only.
- Deferral: unrelated prototype captured fixtures/mock upload remain outside production change; residual production attachment risk addressed by existing submission regressions/browser checks, not waived.

## Terminology
Active mention = previously chosen kind+definitionId/name whose whole @Name token remains in draft; inactive retained selection is not sent or highlighted. Decoration = aria-hidden noneditable text-layout mirror with transparent glyphs and visible selected-token backgrounds; never a draft state authority. Top duplicate = separate MentionChipRow, not inline token.

## Design Reading Order
Approved behavior/evidence → clean-cut deletion/data decision → spines/owners → decorator details/file map → sequence/checks. Template applied proportionately; no invented migration or subsystem.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove replaced top-row code, chip-only types/functions and outdated chip-removal tests. No toggle that renders both old row and new highlight. The no-mention-scope placeholder branch is supported distinct capability behavior, not legacy compatibility.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
Not Affected. Existing AgentContext.requirement/requestedMentions (kind, definitionId, name) and attachment structures remain unchanged; A-003/005 show identical readers/writers and token-filtered DTO serialization. No persisted record/body/history transformation, no version branching or new spans. Declaration of retained identities simply preserves existing session behavior. New state is DOM sizing/scroll and derived parts only, cleared on unmount/context switch. Volume/physical-store investigation and migration conventions N/A: no stored subject/contract changes or transformation design proposed. AC-003/004 protect unchanged meaning and data. No prototype-state disposal translated into production cleanup.

### Migration Plan (Only When Decision Is `Migration Required`)
N/A — no migration.

## Data-Flow Spine Inventory
| ID | Scope | BEH | Start → end | Owner | Meaning |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | focused target → user-visible native cue | ComposerTarget + textarea | Discovery before typing; complete path is small UI projection |
| DS-002 | Primary End-to-End | BEH-002 | @ input → eligible picker choice → current draft + identity → inline selected visual | textarea/menu/AgentContext | One selected presentation with known identity |
| DS-003 | Primary End-to-End | BEH-003 | send action → focused agent receives accepted content | owning run store/stream/server | Full unchanged business consequence exposed |
| DS-004 | Bounded Local | BEH-002 | native input/undo/scroll/resize → aligned current decoration | textarea | Local render projection without editing authority |
| DS-005 | Return-Event | BEH-003 | admission ack/rejection → cleared/retained draft and rendered feedback | existing submission owner | Preserve rejection recovery |

## Primary Execution Spine(s)
- DS-001: focused run context → useComposerTarget/resolveRunMentionScope → useRunMentionMenu.available → textarea localized placeholder → empty editor displayed. No service action.
- DS-002: user @query → textarea detectMenus → useRunMentionMenu/current candidates service → choose → setRequirement + requestedMentions in exact AgentContext → filter/split → native text with background decoration.
- DS-003: native send → ComposerTarget.send/active-context boundary → owning Agent/Team/Org run store → local submission + token-filtered DTO → existing stream and server admission → focused agent receives request (collaborator semantics unchanged).

## Spine Narratives (Mandatory)
DS-001 uses existing capability rather than global @ advertising; only live supported editors get the exact cue. DS-002 inserts the same text and selected metadata as today; only duplicate row disappears and active tokens acquire a background. DS-003 keeps delivery through current target/store boundaries, exposing why deleting a visual duplicate must not remove metadata. DS-004 follows local DOM rendering under textarea ownership; DS-005 uses existing admission result to retain/clear the original draft. Each line is governed by its existing owner; off-spine styling never participates in sending.

## Spine Actors / Main-Line Nodes
User; active-context/ComposerTarget boundary; native textarea; run mention menu; AgentContext; owning run store/local submission; stream/server admission; focused agent. No new runtime node.

## Ownership Map
ComposerTarget selects exact context/capability/send authority. Textarea owns editor binding/sizing/decorative metrics. Menu owns candidate opening/keyboard/selection insertion. AgentContext owns unsent text/selected definitions/attachments. Run stores and localUserSubmission own hold/ack/recovery; streams/server own DTO/admission and delivery. Style projection owns no identity, history or routing.

## Thin Entry Facades / Public Wrappers (If Applicable)
Existing AgentUserInputForm remains presentation wrapper; ComposerTarget is authoritative facade for active-target send, not a new sender. Do not make form or decoration invoke stream/store internals independently.

## Removal / Decommission Plan (Mandatory)
| Remove | Reason/replacement | Scope |
| --- | --- | --- |
| MentionChipRow.vue and form import/template/mentionChips/removeMention | Replaced by single native inline decoration | This change |
| RunMentionChip, runMentionChipsOf, removeRunMentionChip and imports in useRunMentionMenu.ts | No separate chip owner/caller remains | This change; confirm zero references |
| removeMentionFromText export and chip-only utility test | Only removed chip removal used it (A-004); native edits perform text deletion | This change; retain if implementation finds a legitimate other caller and report evidence |
| Tests asserting top row/× removal | Assert row absent and native text identity transitions instead | This change |
No deletion of metadata/token functions, menus, skill chips, attachments or sent message presentation.

## Return Or Event Spine(s) (If Applicable)
DS-005: existing admission response → acceptLocalSubmission or failLocalSubmission → clear current draft/selected identities on acceptance or retain draft + failure notice on rejection → current textarea projection updates. No new handler or promise ownership.

## Bounded Local / Internal Spines (If Applicable)
DS-004 under textarea: native input/undo/context synchronization → computed active chosen mentions → splitMentionText → decorative span layout; native scroll/resize/sizing → DOM client metrics → background translation/clipping. Reset scroll metric from new context's actual textarea after nextTick; never mutate chosen metadata to manage highlight.

## Off-Spine Concerns Around The Spine
Localization (DS-001) supplies registered catalog copy, not capability policy. Existing parser (DS-002/003/004) supplies exact-token projections, not definition lookup. CSS/DOM metrics (DS-004) align decorative backgrounds, never editor history. Existing candidate service (DS-002) supplies server eligibility. Existing upload service (DS-003/005) handles attachment preparation/recovery unchanged. Screenshots support UI conformance, not authorization to patch prototype fixtures.

## Ownership Boundaries
No boundary changes. Components act through ComposerTarget; selected definitions come only from picker. Parser interprets token presence only among those definitions. Native textarea remains the single editing and accessibility authority. Server remains collaborator admission/routing authority.

## Boundary Encapsulation Map
| Boundary | Internals | Upstream usage | Forbidden bypass |
| --- | --- | --- | --- |
| ComposerTarget | owning run store/active context | textarea uses target.send/interrupt | decorator/form sends through raw streaming client |
| useRunMentionMenu | current candidate service, keyboard choice | textarea detect/choose/onKeydown | decorator derives identity from candidates/names or fetches itself |
| Native textarea | caret/IME/paste/selection/undo | mirror reads text/metrics only | mirror DOM edits draft, creates atomic undo stack or contenteditable |

## Dependency Rules
Form → target/components; textarea → existing menu + parser/localization; decorator uses local computed projections, no store/network writes; menu → candidate service/context; run store → submission/stream remains unchanged. No prototype runtime fixtures imported into production. No new shared/common service or hidden boundary bypass.

## Interface Boundary Mapping
| Interface | Subject/responsibility | Identity | Change |
| --- | --- | --- | --- |
| ComposerTarget | focused context/send/access | key + exact AgentContext + typed RunMentionScope | None |
| RequestedCollaboratorMention | chosen definition | kind + definitionId + name | None |
| mentionsPresentInText/splitMentionText | active token filter / escaped display parts | known chosen definitions/names | Reuse unchanged |
| AgentUserInputTextArea props | editor target/capability/custom placeholder | existing props | None; mention-aware computed has precedence for supported scope |
| locale keys chat.mentions.placeholderMention/messageLabel | UI copy/accessibility | catalog key, not target identity | Add both locales |
No external API or transport schema addition.

## Interface Boundary Check
All interfaces retain singular subject and explicit identity. Low ambiguity; name used for display/token matching only within selected definition records, never resolve arbitrary name to ID. Actual same-name disambiguation semantics are unchanged/outside scope.

## Main Domain Subject Naming Check
Existing ComposerTarget, AgentContext, useRunMentionMenu and collaboratorMentionText are natural owners. Local variables composerPlaceholder, activeMentionNames, mentionParts, mirrorMetrics (or similarly specific names) describe derivation. No new vague coordinator/helper subject needed.

## Existing Capability / Subsystem Reuse Check
Reuse agentInput components/menu for UI; collaboratorMentionText for exact token projection and DTOs; localization chat catalogs; runSubmission/stores/stream contracts for sending. No new parser, editor library, metadata service or history subsystem.

## Subsystem / Capability-Area Allocation
Only existing frontend agentInput capability is extended. Localization provides payload copy; current collaborators utilities are reused and chip-only cleanup confined there. Colocated tests and renderer probe stay testing layer; backend/server unchanged.

## Draft File Responsibility Mapping
Initial candidates: form remove row; textarea derive placeholder/render background; menu remove dead chip code; shared utility remove dead removal function; locale catalogs new keys; component tests/browser probe verify. Reuse existing structures means no new highlight/parser module extracted; this local native decoration is not yet repeated elsewhere.

## Reusable Owned Structures Check
Reuse RequestedCollaboratorMention and MentionTextPart; do not introduce persisted mention spans. Shared splitter value excludes @, so reconstruct exactly once for mirror mention spans, keeping concatenated mirror text equal to textarea draft. Local DOM metrics are temporary presentation state, not shared model.

## Shared Structure / Data Model Tightness Check
kind/definitionId/name remain separate necessary meanings, no new attributes. Former chip projection type/row becomes obsolete and removed. Decorative mirror is read-only projection of same text, not overlapping authoritative representation. Shared splitter contract unchanged to protect sent-message UI.

## Final File Responsibility Mapping
| File (relative to /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability) | Delta/responsibility |
| --- | --- |
| autobyteus-web/components/agentInput/AgentUserInputForm.vue | Remove top mention row/import/computed/removal only; preserve Context Files and / skill chips |
| autobyteus-web/components/agentInput/AgentUserInputTextArea.vue | Capability-prioritized localized placeholder; safe background decoration and scoped DOM synchronization; preserve input/menu/send/drop/voice paths |
| autobyteus-web/components/agentInput/MentionChipRow.vue | Delete obsolete component |
| autobyteus-web/composables/agentInput/useRunMentionMenu.ts | Delete chip-only exports/imports; keep available/selection/keyboard and metadata behavior |
| autobyteus-web/utils/collaborators/collaboratorMentionText.ts | Remove orphan chip-removal function if confirmed; retain token/filter/split/DTO/presentation interfaces |
| autobyteus-web/localization/messages/en/chat.ts and zh-CN/chat.ts | Add existing namespace mention placeholder/accessibility label; no new locale registration, no New Chat copy changes |
| Existing component runMentions/skillTagging/textarea tests and utility tests | Update removed-row assertions; preserve no-scope/skills/draft binding and add active-inline/edit/gating checks |
| autobyteus-web/tests/e2e/composer-mention-discoverability-probe.mjs (API/E2E-owned if added) | Real renderer interaction, metrics/scroll and screenshot evidence with test-owned state; no production mock dependency |
Store/stream/service/backend files are evidence only, not planned edits.

## Applied Patterns (If Any)
Native text editor plus decorative read-only mirror (a local view projection, not a new editor). Computed projections for capabilities and active tokens. Existing event/sizing lifecycle for local DOM synchronization. No framework/library addition.

## Target Subsystem / Folder / File Mapping
Modify/remove paths in final map. Existing agentInput, composables/agentInput, utils/collaborators and localization/messages folders already expose owners. New renderer test belongs tests/e2e; no production mixed transport/persistence folder introduced. No intermediate module hierarchy needed for one editor decoration.

## Folder Boundary Check
agentInput UI/presentation, collaborators utilities pure text/DTO shaping, locale catalogs content, tests/e2e executable probes; current ownership clear/low mixed-layer risk. Compact existing layout is clearer than extracting one-off mirror manager/module.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
- Chosen {kind: 'agent_team', definitionId: 'product-team', name: 'Product Team'}, text “Please ask @Product Team to review.” → split parts render transparent “Please ask ” + transparent @Product Team span with sky background + transparent prose under visible native textarea. Identity untouched.
- Change @Product Team to Product Team → no active mention/DTO/highlight, prior chosen identity can remain in session; restoring exact token reactivates only that chosen definition. Unknown manually typed @OtherName with no choice never gets selected highlight/metadata.
- Avoid converting draft to HTML, clearing requestedMentions on each native edit, wrapping native text in atomic pills, or using mirror.innerHTML with user prose.

## Backward-Compatibility Rejection Log (Mandatory)
Old-row toggle/dual selected representation: Rejected, delete row/helpers. Old draft version decoder/new span migration: N/A, unchanged model. Generic fallback to chip if metric sync fails: Rejected, fix native decoration alignment or return Design Impact. No-scope generic/custom placeholder remains legitimate current capability behavior, not a legacy fallback.

## Derived Layering (If Useful)
N/A — no new architecture layers. Existing UI → context/menu → submission/stream is sufficient.

## Change / Refactor Sequence
1. Bind new registered English/zh-CN copy to mention capability ahead of old run placeholder chain; add message accessible label without changing existing menu ARIA.
2. Remove form top-row references and obsolete component/functions/tests cleanly.
3. Compute active chosen names from current context+internalRequirement and render background mirror inside textarea root. Reuse splitMentionText; never change native input/change/send/selection logic for highlighting.
4. Match font family/size/line height/letter spacing/tab size/padding/wrapping/text alignment/direction; synchronize mirror viewport to textarea clientWidth/clientHeight (excluding scrollbar width), not root scroll area. Keep glyphs transparent, textarea native text visible above background; no added inline padding/border width.
5. Synchronize scrollTop and scrollLeft, height/layout changes and context switch through nextTick after existing adjustTextareaHeight; use one scoped ResizeObserver on textarea where parent panel resize alters width without window resize. Read current DOM metrics rather than hardcode width; cleanup observer/listeners in onUnmounted. Clip mirror only; root popovers must still overflow above box.
6. Update regression tests, implementation self-check/render comparison and API/E2E renderer probe. No source/prototype lifecycle finalization performed by Solution Designer.
7. Independently validate, then Delivery owns docs/integration/user verification/finalization and applicable cleanup/release gates.

## Key Tradeoffs
Decorative background preserves ordinary native editing and existing identity semantics with bounded metric synchronization, whereas contenteditable/atomic tokens would introduce new cursor/IME/paste/undo ownership and exceed scope. Inline inside existing textarea component is appropriate for one bounded decoration; extract only on real reuse/overload, not speculative generalization. Prototype blocker records are retained as limitations, not mistaken for production bugs.

## Risks
- Glyph/background drift on wrapped/scrolled long drafts, locale/font changes, resize or trailing newlines/tabs; test actual DOM/native browser and ensure exact metrics/client width.
- Missing @ when reconstructing splitter part produces offset; test concatenation equal to native value.
- Mirror accidentally intercepts selection/focus, appears twice to accessibility, or forced-colors makes transparent duplicate glyphs visible; aria-hidden, pointer-events:none, nonfocusable, keep native text visible. Use appropriate forced-color styling preserving transparent decorative glyphs and readable native text; validate high-contrast behavior, do not replace native text with transparent overlay.
- Stale context selection/draft during send/navigation; no new authority, computed uses exact target; reset DOM metrics from current textarea without wiping draft or metadata.
- Failed uploads/admission and existing screenshot fixture gaps do not prove production preservation; use real renderer/store tests with completed synthetic attachment at correct boundary, report limits honestly.
- Base may drift before integration; downstream compares/rebases in task worktree and reports impact rather than altering user intent.
These are bounded validation risks, not unresolved material architecture changes. Escalate if existing boundaries cannot satisfy them.

## Guidance For Implementation
Implement only approved local delta; do not fetch/copy captured prototype fixtures or treat its altered menu API as production truth. Add localization keys to already registered chat.ts, use useLocalization/$t; English exact, Chinese accepted “随便问 · @ 选择智能体或团队”. Preserve current placeholder chain only when mention support absent. Mirror present only for active chosen tokens; render Vue escaped text spans, no v-html. Prefer one padding/typography rule shared locally by textarea and decoration to avoid divergent numeric policies; decoration dimensions exclude scrollbar, cloned box decoration handles wraps. Existing textarea value/selection/caret and per-context draft remain authority.

Verification intent (not executed by designer):
- Focused components: `pnpm -C autobyteus-web test:nuxt components/agentInput/__tests__/AgentUserInputTextArea.runMentions.spec.ts components/agentInput/__tests__/AgentUserInputForm.skillTagging.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts utils/collaborators/__tests__/collaboratorMentionText.spec.ts --run` and relevant local submission/store regressions.
- Assert mentionScope gating across Agent/Team/Org/task and absent draft/read-only scope, English exact and localized counterpart, no top row, selected-only active highlight, keyboard picker/caret/dismissal, unknown typed names not selected, native deletion/edit/undo, send acceptance/rejection, current context switching and attachments preserved. Check existing skill tags still work despite removed slash cue.
- Renderer browser probe using existing test-owned Nuxt fixture patterns: 1512x952/1024x640, constrained width, long wrapping/scroll and scrollbar, resize, newline/tabs, both locales, voice controls, selection/IME/paste/undo smoke, accessibility duplication/forced colors and completed attachment rejected-send preservation. Verify DOM/metadata first; compare scoped approved screenshot crops, fixture labels illustrative.
- `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, appropriate build checks. No server/core/Electron changes claimed.
- Per TESTING.md renderer units + browser dev-path probe suffice for this web-equivalent scope. If validating a full real desktop/product journey, use a worktree-built isolated instance or existing owned live cross-scope probe with prerequisites, never user's running app/~/.autobyteus. Test owner reports which layers executed and cleanup; live-provider checks N/A unless intentionally selected/available.

Review route field: pending configured rule evaluation after complete design; classification above determines applicability, not inferred recipients. Independent architecture/code review artifacts N/A — not applicable on selected direct route if rules confirm. Implementation/self-checks and executable validation remain mandatory.


## Latest Supplement Disposition
UI-CLOSE-001 at /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-review-finalization-record.md read before final handoff: accepted UI review/screenshot delivery complete, prototype technical baseline/spec/promotion not complete and explicitly deferred by user. Add this closure evidence to cumulative supplements; no change to approved behavior or production design. Full prototype certification is not claimed; production checks cannot be waived by prototype deferral.


## Selected Route
Configured Medium/Low rule selects /implementation_engineer directly after design. Independent architecture/code review N/A — not applicable. Self-checks and executable validation required. Full route/communication confirmation recorded in solution-handoff.md.
