# Solution Revision Record

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This record indexes the initial baseline and later completed solution rounds without duplicating those artifacts.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| `SR-001` | User clarification in current conversation, 2026-08-12 | `N/A` | `Initial Baseline` | Agent-centric external-information-source requirements basis proposed; approval pending. |
| `SR-002` | User integration/MCP brainstorm in current conversation, 2026-08-13 | `N/A` | `Requirement Gap` | Refined to a hybrid target-free integration plus normal-launch run attachment; policy-selected pushed messages may start turns on active runs. |
| `SR-003` | New user request, 2026-09-24 (Requirements phase) | `N/A` | `Requirement Gap` (user change to intended behavior) | Replaced with "integration = connection + tools + usage skill". Platform traffic never affects runs. No push, attachments, or delivery modes. Explicit send/list/read tools only. Ready for Approval. |
| `SR-004` | User reply 2026-09-24: "exactly … no code in the platform about external channel … belongs to its own project and MCP" | `N/A` | `Requirement Gap` (scope change) | Platform-side work becomes pure removal of all external-channel/messaging-gateway code, release steps, and docs. Messaging integrations move to separate MCP/skill projects used through generic MCP/Skills. Ready for Approval with DEC-108 to DEC-110. |
| `SR-005` | User brainstorm 2026-09-24: gateway project could provide skills and/or remote HTTP MCP | `N/A` | `Evidence-only clarification` | Recommended remote Streamable-HTTP MCP on the gateway plus companion skills for the separate project. DEC-109 recommendation changed to (b): move the gateway code with history to its own repo, then delete it here. No intended-behavior change to SR-004 requirements. |
| `SR-006` | User confirmation 2026-09-24: integrations (Discord, future Google, …) are provided by their own projects as skills + integration code; the main product has none; agents read and send through the configured integration via MCP | `N/A` | `Evidence-only clarification` | Recorded the integration-agnostic guiding principle. SR-004 scope unchanged (messaging only). |
| `SR-007` | User 2026-09-24: no changes to the messaging gateway project now; turning it into a Discord/WhatsApp MCP is large future work | `N/A` | `Refinement` (decision options) | DEC-108 confirmed in substance (the gateway rework is separate and later). DEC-109 options revised: the move-to-standalone-repo step is dropped. Now (a) remove the folder unchanged and record the last commit, or (b) keep the folder + `autobyteus-ts` contracts. Recommend (a). |
| `SR-008` | User question 2026-09-24: what does "gateway sits inside the workspace repo" mean? User believes it is a separate project | `N/A` | `Evidence-only clarification` | Verified: flattened into the workspace repo 2026-02-26. The separate GitHub repo is stale since Feb 2026. DEC-109 options restated: (a) move back unchanged with history, (b) remove only, (c) keep. Recommend (a). |
| `SR-009` | User 2026-09-24: keep the gateway folder in this repo untouched as its own project; future gateway work continues there; the main product must get rid of messaging code | `N/A` | `Requirement Gap` (user decision on scope) | DEC-109 decided: keep. REQ-101/REQ-117/REQ-120 revised with the gateway exception. New DEC-111 (shared types location) and DEC-112 (gateway release trigger). Ready for Approval. |
| `SR-010` | User 2026-09-24: internalize external-channel types into the gateway so it does not break (it will be unusable, which is fine); clean up the main product; the gateway will need huge future refactoring (MCP + skill) | `N/A` | `Refinement` (user decisions) | DEC-108 (a) and DEC-111 (a) decided. REQ-121 added (gateway self-contained, builds and tests, not functional). Remaining: DEC-110, DEC-112. |
| `SR-011` | User 2026-09-24: just move the types into the gateway and leave it alone; no need to test it; the key point is cleaning the main application | `N/A` | `Refinement` (user decision) | REQ-121/AC-121 revised: no gateway build/test/usability requirement; must not break the main product. REQ-120 limited to main-product packages. Remaining: DEC-110, DEC-112. |
| `SR-012` | User 2026-09-24: just remove them; one data migration removes the messaging folders and DB tables; the functionality is removed so the data is not needed | `N/A` | `Refinement` (user decision) | DEC-110 decided (a). REQ-114 revised to concrete deletion scope, no backup, non-blocking. Remaining: DEC-112 and final approval. |
| `SR-013` | User 2026-09-24: remove the gateway release workflow; gateway will be heavily refactored and may move out of the repo | `N/A` | `Refinement` (user decision) | DEC-112 decided (c) delete. REQ-117 revised. All decisions resolved; Ready for Approval. |
| `SR-014` | User approval 2026-09-24: "approve. i think now its complete right?" | `N/A` | `Approval` | Requirements `Approved` (SR-013 content + `product-model-analysis.md`). Architecture design started. |
| `SR-015` | Architecture design on the SR-014 approved basis | `N/A` | `Design` | `design-spec.md` Ready. task_size=Large, architectural_risk=High. Tables dropped through a Prisma migration; folders through the app-data migration. |
| `SR-016` | ARCH-REV-001 Fail / Design Impact (AR-001–AR-005, R-1–R-4) | AR-001–AR-005 | `Design Impact` | Design revised: gateway removed from pnpm workspace; removal inventory completed (reviewer items + 4 more from a provider-name search); exact REQ-120 gate with no widened exceptions; superseded-ticket disposition; package metadata fixed. Classification unchanged (Large/High). |
| `SR-017` | `/api_e2e_engineer` Requirement Gap: user direction "the gateway should build" | `N/A` | `Requirement Gap` | Proposed REQ-121/AC-121 revision (gateway must build standalone, outside the main workspace) plus DEC-113 and DEC-114. Requirements `Ready for Approval`; the gateway part of the design is `Needs Revision`. |

## Revision Entries

### SR-001 — Agent-Centric External Information Source Baseline

- Triggering role, report path, and round: User clarification in the current conversation on 2026-08-12; initial solution baseline.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: The proposed baseline treats the agent/team as the independently running brain and provider conversations as durable external information sources connected through agent source subscriptions. Inbound events are context data, never automatic run/turn triggers; outbound communication requires explicit intent.
- Why this baseline or revision entry is recorded: This is the first recorded solution baseline. It captures the clarified product intent before design and avoids inferring any authoritative prior result from the absence of a revision record.
- Resolution: Revised the requirements basis away from both legacy channel-to-run binding and the intermediate participant-activation interpretation. Added executable invariants for stopped-agent retention, running-agent non-turn data availability, addressed-event handling, bounded context/cursors, explicit outbound intent, team context ownership, coherent legacy disablement, and no semantic migration.
- Approved behavior or requirement IDs affected: Approval pending for `BEH-001`–`BEH-007`, `R-001`–`R-010`, and `AC-001`–`AC-012`.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/requirements.md` — complete proposed requirements basis.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/investigation-notes.md` — request context, source log, runtime evidence, design-health evidence, findings, risks, and reviewer notes.
- Supplemental artifacts updated, added, or removed:
  - Revised `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/product-model-analysis.md` to define the source/subscription/context model and explicitly reject automatic participant activation.
- Downstream and architecture-review impact: Design production and architecture review remain blocked on user approval. A later design must include a durable source/event spine and a non-user/non-turn agent context boundary; it cannot repurpose current `postUserMessage`, team posting, or open output subscription paths.
- Next recipient or routing: User for requirements-basis approval; no team handoff yet.
- Remaining gaps or risks: Team context-owner choice; autonomous scheduler policy for unread data; retention/compaction/edit-delete semantics; first delivery slice; provider sequencing; connector security, bot-loop, and source prompt-injection threat model.

### SR-002 — Separate Run Lifecycle From Event-Driven Turns

- Triggering role, report path, and round: User integration/MCP brainstorm in the current conversation on 2026-08-13; second requirements refinement round.
- Triggering finding IDs: `N/A` — direct upstream clarification, not a downstream report.
- Prior authoritative result: Proposed context-source baseline in which inbound external events never automatically started agent/team turns.
- Current authoritative result: A target-free messaging integration exposes push inputs/context plus explicit MCP-like capabilities. Agent/team runs start normally and may attach selected sources at launch. A pushed message may become a typed external-human turn input on an already-running attached run according to `EVERY_MESSAGE`, `ADDRESSED_ONLY`, `BATCHED`, or `CONTEXT_ONLY`; provider traffic never creates/restores/activates execution.
- Why this baseline or revision entry is recorded: The prior proposal conflated protection of agent lifecycle autonomy with a prohibition on event-driven work. A group-manager or auto-reply agent must be able to receive push notifications without polling, while the integration must not own execution lifecycle.
- Resolution: Distinguished lifecycle triggers from turn triggers; inverted routing ownership from source-to-target binding to run-owned input attachment; split MCP resources/subscriptions from tools/actions; retained explicit outbound authority and coherent legacy disablement.
- Approved behavior or requirement IDs affected: Approval pending for revised `BEH-001`–`BEH-007`, `R-001`–`R-010`, and `AC-001`–`AC-013`.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/requirements.md` — goal, all behavior rows, findings, recommendations, use cases, requirements, acceptance criteria, constraints, assumptions, risks, coverage, and approval status.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/investigation-notes.md` — request context, MCP/runtime source evidence, health assessment, file map, findings, constraints, risks, and reviewer guidance.
- Supplemental artifacts updated, added, or removed:
  - Revised `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/product-model-analysis.md` around hybrid input/resource/action integration and normal-launch attachments.
- Downstream and architecture-review impact: Design remains blocked on user approval. The future design must extend or complement current tool-only MCP support, add an optional external-input attachment to normal run launch/restore, add typed external-human turn delivery to active workers, and remove all provider-triggered run lifecycle operations.
- Next recipient or routing: User for requirements-basis approval; no team handoff yet.
- Remaining gaps or risks: Default delivery mode; no-active-run retention/backlog; batching/cursors; MCP resource subscription suitability; always-on integration session ownership; team manager/entry ingress; first implementation slice/provider; connector and prompt-injection security.

### SR-003 — Messaging Integrations As Agent Tools

- Phase and classification: Requirements; `Requirement Gap` (user change to intended behavior).
- Triggering user feedback: 2026-09-24 request. The bot is not the agent. Agents are like working humans who use tools to send messages through a bot. Integrations are skills with MCP tools/scripts, and configuring one just adds tools. Includes the Settings → Messaging screenshot (gateway disabled by default).
- Triggering finding IDs: `N/A`.
- Prior authoritative requirements/design status: SR-002 `Refined`, approval pending (hybrid run-attached integration). Never approved. Archived at `history/sr-002-requirements.md`, `history/sr-002-product-model-analysis.md`, `history/sr-002-investigation-notes.md`.
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started.
- IDs affected: all SR-002 IDs (`BEH-001`–`007`, `R-001`–`010`, `AC-001`–`013`, `UC-001`–`012`) are retired. New `BEH-101`–`106`, `UC-101`–`108`, `REQ-101`–`115`, `AC-101`–`115`, `SCN-101`–`110`, `QR-101`–`103`, `ASM-101`–`102`, `DEC-101`–`107`.
- Scenario-basis changes: added the agent-initiated send/read/list scenarios (SCN-103/104/106). Real-time auto-answer (SCN-110) moved to deferred/out of scope. The SR-002 push-to-running-run scenarios were removed.
- Why recorded: the user refined the product model, which removes run attachments, delivery modes, the external-human turn trigger, and MCP resource subscriptions from scope.
- Canonical sections changed: `requirements.md` rewritten to the current template; `investigation-notes.md` updated with re-verification on base `40b1783f4` and platform facts; `product-model-analysis.md` rewritten.
- Supplemental artifacts: `product-model-analysis.md` revised (SR-003). `history/` added with the archived SR-002 artifacts.
- Prototype evidence: `N/A`.
- Intended behavior changed: `Yes`.
- Approval impact: explicit user approval of `requirements.md` + `product-model-analysis.md` (SR-003) required, including answers to DEC-101 to DEC-107.
- Behavior-defining supplement versions: `product-model-analysis.md` SR-003, pending.
- Design/review basis invalidated: `N/A` — no design existed.
- Post-design classification: `N/A`.
- Applied handoff-rule outcome: none. Routine approval hold in the requirements conversation.
- Downstream impact: none until approval.
- Remaining gaps: DEC-101 to DEC-107; ASM-101 to ASM-102.
- Next action: user reviews and approves or amends. After approval, produce `design-spec.md`.

### SR-004 — Remove External Messaging From The Platform

- Phase and classification: Requirements; `Requirement Gap` (user scope change).
- Triggering user feedback: 2026-09-24 reply to the SR-003 analysis: "exactly. i think we should not have any code in the platform about external channel. because those external channel belong to its own project and mcp and etc".
- Triggering finding IDs: `N/A`.
- Prior status: SR-003 `Ready for Approval`, not approved. Archived at `history/sr-003-requirements.md` and `history/sr-003-product-model-analysis.md`.
- Current status: requirements `Ready for Approval`; design not started.
- IDs affected: kept with the same meaning are `BEH-101`–`103`, `REQ-102`, `REQ-103`, `AC-102`, `AC-103`, and `UC-107` (expanded). Revised are `REQ-101` (whole-platform removal), `REQ-114` and `AC-114` (legacy-data outcome now per DEC-110; tokens are no longer preserved), and `BEH-106`. Added are `BEH-107`–`109`, `UC-109`–`111`, `REQ-116`–`120`, `AC-116`–`120`, `SCN-111`–`116`, `QR-104`–`105`, `ASM-103`, and `DEC-108`–`110`. Retired/moved to the separate messaging project are `REQ-104`–`113` and `REQ-115`, `AC-101`, `AC-105`–`113` and `AC-115`, `SCN-101`–`107` and `SCN-109`–`110`, `UC-101`–`106` and `UC-108`, `QR-101`–`103`, `DEC-101`–`107`, and `ASM-101`–`102`.
- Scenario-basis changes: first-party integration scenarios moved out of the platform. Removal, upgrade, release, history, and generic-MCP preservation scenarios added.
- Why recorded: the user moved messaging integrations entirely outside the platform.
- Canonical sections changed: `requirements.md` rewritten; `product-model-analysis.md` rewritten (removal inventory, legacy data, carried-forward input for the MCP project); `investigation-notes.md` gained SR-004 source rows.
- Supplemental artifacts: `history/sr-003-*` added.
- Intended behavior changed: `Yes`.
- Approval impact: explicit approval of SR-004 `requirements.md` + `product-model-analysis.md` and answers to DEC-108 to DEC-110 are required. "Exactly" confirms direction only.
- Design/review basis invalidated: `N/A`.
- Post-design classification: `N/A`.
- Applied handoff-rule outcome: none. Routine approval hold.
- Remaining gaps: DEC-108 to DEC-110; ASM-103.
- Next action: user approval, then `design-spec.md`.

### SR-005 — Delivery Shape For The Separate Messaging Project

- Phase and classification: Evidence; `Evidence-only clarification` (recommendation change, no intended-behavior change).
- Triggering user feedback: 2026-09-24. The messaging gateway project could provide skills, or remote HTTP MCP, or both, and the user asked which is best.
- Prior status: SR-004 `Ready for Approval`.
- Current status: unchanged, `Ready for Approval`.
- IDs affected: DEC-109 recommendation changed from (a) to (b). No REQ/AC changed.
- Canonical sections changed: `product-model-analysis.md` gained a "Recommended Delivery Shape" section; `investigation-notes.md` gained SR-005 rows; `requirements.md` DEC-109 recommendation row updated.
- Intended behavior changed: `No`.
- Approval impact: none beyond the pending SR-004 approval.
- Next action: user approval of SR-004 with DEC-108 to DEC-110.

### SR-006 — Integration-Agnostic Product Principle

- Phase and classification: Requirements rationale; `Evidence-only clarification`.
- Trigger: user message 2026-09-24. Integrations should be provided by specific skills/projects (Discord now, Google later) that contain the integration code. The main product has none of it. Agents use unified MCP and the configured integration to both read and send.
- Status: SR-004 requirements remain `Ready for Approval`. No REQ/AC change.
- Canonical sections changed: `product-model-analysis.md` "Guiding Principle" section added.
- Intended behavior changed: `No`. The principle is rationale. It does not extend this ticket to other existing product features.
- Next action: user approval of SR-004 with DEC-108 to DEC-110.

### SR-007 — No Gateway-Project Changes Now

- Phase and classification: Requirements; `Refinement` of decision options (no REQ/AC text change).
- Trigger: user message 2026-09-24. "For the messaging gateway project, we don't have to change currently, because we leave it there … that project will need a lot of change."
- Evidence: `autobyteus-message-gateway/package.json` depends on `autobyteus-ts: workspace:*`, and its prebuild/pretypecheck/pretest build `autobyteus-ts`. 28 gateway source files import `autobyteus-ts/external-channel/*` (provider, envelope, transport, outbound envelope, peer type, errors, delivery event, discord binding identity).
- Status: SR-004 requirements remain `Ready for Approval`.
- Changes: DEC-109 rewritten; the SR-005 "move with history first" recommendation is withdrawn per the user. DEC-108 is effectively answered (gateway rework is separate/future) and awaits formal approval with the package.
- Intended behavior changed: `No` unless the user picks DEC-109 (b), which would add an allowed exception to REQ-101/REQ-120.
- Next action: user answers DEC-109 and approves the package.

### SR-008 — Where The Gateway Code Actually Lives

- Phase and classification: Evidence; `Evidence-only clarification`.
- Trigger: user question 2026-09-24. The user believes the messaging gateway is a separate project.
- Evidence: see `investigation-notes.md` SR-008 rows (flatten commit `b1c89884e`; 221 tracked files; 267 commits; standalone repo branches end Feb 2026).
- Changes: DEC-109 rewritten with three options; recommendation (a) move back unchanged, then remove.
- Intended behavior changed: `No`.
- Next action: user answers DEC-109 and approves the package.

### SR-009 — Keep The Gateway Project In The Repo, Untouched

- Phase and classification: Requirements; `Requirement Gap` (user scope decision).
- Trigger: user message 2026-09-24. "Even though it exists in the current repo, that's fine. We don't touch the code … just leave the project there … in the future we will continue to work on this messaging gateway itself. But the main products shouldn't have [external channel code]."
- Evidence: `autobyteus-ts/package.json` exports subpaths (`./*` …), so the gateway imports `autobyteus-ts/external-channel/*.js` directly (11 files in `autobyteus-ts/src/external-channel/`). `.github/workflows/release-messaging-gateway.yml` triggers on `push: tags: v*` and `workflow_dispatch`.
- Prior status: SR-004 `Ready for Approval` (snapshot at `history/sr-008-requirements.md`).
- Current status: `Ready for Approval`.
- IDs affected: DEC-109 decided (keep). REQ-101, REQ-117, and REQ-120 revised. DEC-111 and DEC-112 added.
- Intended behavior changed: `Yes` (the gateway package is no longer removed).
- Approval impact: user approval of the revised package with DEC-108, DEC-110, DEC-111, and DEC-112.
- Next action: user approval, then design.

### SR-010 — Internalize Shared Types Into The Gateway

- Phase and classification: Requirements; `Refinement` (user decisions).
- Trigger: user message 2026-09-24. "Maybe we can internalize those code inside the message [gateway] itself … just do not make the project break, but it's definitely not usable anymore … just move it to the gateway folder and satisfy the dependencies … and we should clean up the main product itself."
- Evidence: `autobyteus-ts/src/external-channel/*` has no imports outside its own folder. Gateway usage is 28 src files and 16 test files. The gateway `package.json` depends on `autobyteus-ts: workspace:*` and its pre-scripts build `autobyteus-ts`.
- IDs affected: DEC-108 decided (a). DEC-111 decided (a). REQ-120 exception for the core library removed. REQ-121 added.
- Intended behavior changed: `Yes`. The gateway is explicitly accepted as non-functional while it keeps building and testing.
- Approval impact: the remaining open decisions are DEC-110 and DEC-112, followed by explicit package approval.

### SR-011 — Leave The Gateway Alone

- Phase and classification: Requirements; `Refinement` (user decision).
- Trigger: user message 2026-09-24. "You just move it there and leave it alone. We don't even need to test that project … the key point is that we start to clean up the code from … the main application project."
- IDs affected: REQ-120, REQ-121, and AC-121 revised.
- Intended behavior changed: `Yes` (gateway verification dropped).
- Remaining: DEC-110 and DEC-112, then explicit approval.

### SR-012 — One-Time Cleanup Migration

- Phase and classification: Requirements; `Refinement` (user decision).
- Trigger: user message 2026-09-24. "Just remove them … we could have one data migration … remove those messaging folders and the database tables … if the functionality is removed … we don't really need to care about those data."
- Evidence: app-data migration framework at `autobyteus-server-ts/src/app-data-migrations/`, with precedent removal migrations (`remove-external-runtime-working-context-snapshots-migration.ts`, `remove-self-evolution-run-metadata-migration.ts`, `remove-global-skill-discovery-mode-migration.ts`). Backups are chosen per migration and are not automatic in the runner.
- IDs affected: DEC-110 decided. REQ-114 and QR-104 revised.
- Intended behavior changed: `Yes` (concrete deletion outcome).
- Remaining: DEC-112 and final approval.

### SR-013 — Delete The Gateway Release Workflow

- Phase and classification: Requirements; `Refinement` (user decision).
- Trigger: user message 2026-09-24. "We can just remove the gateway release flow … in the future we will have quite a lot of refactoring for the gateway … we might move the gateway out of this project."
- IDs affected: DEC-112 decided (c). REQ-117 and REQ-120 revised.
- Intended behavior changed: `Yes`.
- Status: `Ready for Approval`, with every open decision resolved by the user. The package awaits the user's final explicit approval before design.

### SR-014 — Requirements Approved

- Phase and classification: Requirements; approval capture.
- Trigger: user message 2026-09-24, "approve. i think now its complete right?", in reply to the final five-point scope summary (main-product removal; release/packaging removal; gateway kept with internalized types and no validation; one-time cleanup migration; preserved MCP/skills/run history).
- Prior status: `Ready for Approval`. Current status: `Approved`.
- Approved basis: `requirements.md` SR-013 content (REQ-101–103, 114, 116–121; AC-102, 103, 114, 116–121; DEC-108–112 decided) plus `product-model-analysis.md`.
- Intended behavior changed: `No` (approval only).
- Next action: architecture investigation and `design-spec.md`.

### SR-015 — Architecture Design Complete

- Phase and classification: Design; initial design on the approved basis.
- Trigger: SR-014 approval.
- Prior status: requirements `Approved`; no design. Current status: `design-spec.md` `Ready`.
- IDs covered: BEH-101–103, 106–109; REQ-101–103, 114, 116–121; AC-102, 103, 114, 116–121; QR-104–105.
- Canonical sections changed: `design-spec.md` created. `investigation-notes.md` gained architecture evidence AE-01–AE-16.
- Key design decisions:
  - Cleanup app-data migration `20260924_remove_external_messaging_data` (four roots, no backup, never throws, retried on the next start).
  - Prisma migration `20260924120000_remove_external_channel_tables` drops the two orphan tables (AE-11 precedent). This is the split that REQ-114's design latitude allows.
  - The internal base URL helper, the `EXTERNAL_SIGNATURE` route class, and `EXTERNAL_USER_MESSAGE` (contracts/server/web) are removed as messaging-only.
  - Two historical app-data migrations lose their external-channel branches.
  - Types move into the gateway with `git mv`. The gateway stays in the pnpm workspace.
  - The server build script is renamed to `copy-build-assets.mjs`.
- Intended behavior changed: `No`.
- Classification: `task_size = Large`; `architectural_risk = High` (public API removal, shared streaming contract change, persistence deletion + DDL, release/deployment pipeline change, startup sequence change, wide blast radius).
- Next action: apply the handoff rules.

### SR-016 — Design Revision After ARCH-REV-001

- Phase and classification: Design; `Design Impact` (reviewer findings; approved intent unchanged).
- Trigger: `/architecture_reviewer` ARCH-REV-001, `design-review-report.md` (Fail), findings AR-001 to AR-005 and recommendations R-1 to R-4.
- Prior status: `design-spec.md` SR-015 `Ready` (archived at `history/sr-015-design-spec.md`). Current status: `design-spec.md` SR-016 `Ready`.
- Resolutions:
  - AR-001: the gateway is removed from the pnpm workspace; the lockfile importer and the root `onlyBuiltDependencies` entry are removed. This is required by approved AC-117 and AC-121.
  - AR-002: the reviewer's 7 items are added. A provider-name search found 4 more (AE-19): the web Discord binding validator + its spec, binding cases in 3 tests, and the web README gateway paragraph.
  - AR-003: an exact allowed-hit set tied to REQ-120's approved exceptions. The cleanup migration's unit test counts as part of the "DEC-110 cleanup migration" exception. AC-102/AC-103 become one-time validation probes recorded in the ticket folder. The AC-119 durable test uses a generic metadata key. Tracked logs are outside the "source, config, docs" search domain. No exception is widened, so user confirmation is not required.
  - AR-004: the three in-progress messaging tickets are moved to `tickets/done/` with `superseded.md`.
  - AR-005: stale investigation sections are replaced; supplement status fields and the history inventory are corrected in `investigation-notes.md`, `product-model-analysis.md`, and `requirements.md` (metadata only).
  - R-1: constructor-injected roots. R-2: surgical workflow edits. R-3: release-notes mention. R-4: loopback 404 noted.
- Evidence added: AE-17 to AE-22 in `investigation-notes.md`.
- Intended behavior changed: `No`. Requirements approval (SR-014) still applies. The `requirements.md` edit was to the supplement status field only.
- Classification: unchanged (`task_size = Large`, `architectural_risk = High`).
- Next action: resubmit to `/architecture_reviewer` for ARCH-REV-002 through the handoff rules.

### Review Receipt — ARCH-REV-002 Pass (informational)

- 2026-09-24: `/architecture_reviewer` reported ARCH-REV-002 **Pass** on the SR-014 requirements and the SR-016 design. AR-001 to AR-005 are resolved. Non-blocking notes N-1 to N-3 are in `design-review-report.md`.
- The reviewer forwarded the cumulative reviewed package to `/implementation_engineer` and confirmed delivery. Per the informational-Pass rule, the Solution Designer does not repeat that handoff.
- No solution change. Next expected event: downstream implementation/validation/delivery, ending with a `Delivery Completed` receipt to the Solution Designer.

### SR-017 — Requirement Gap: The Gateway Must Build

- Phase and classification: Requirements; `Requirement Gap` (user change to intended behavior).
- Trigger: `/api_e2e_engineer` message of 2026-09-24 relaying the verbatim user direction, after the round-2 API/E2E Pass on `40f769e0d`. Evidence is in `api-e2e-evidence/gateway-build-check/`.
- Prior status: requirements `Approved` (SR-014); design SR-016 `Ready`, reviewed Pass in ARCH-REV-002; implementation `40f769e0d`.
- Current status: requirements `Ready for Approval` for the REQ-121/AC-121 revision only; the design's gateway section is `Needs Revision`. All other approved content is unchanged. The pre-revision snapshot is at `history/sr-016-requirements.md`.
- IDs affected: REQ-121 and AC-121 (proposed revision); DEC-113 and DEC-114 added.
- Evidence added: AE-23 to AE-25.
- Intended behavior changed: `Yes` (the gateway must build).
- Approval impact: renewed explicit user approval of REQ-121/AC-121 and answers to DEC-113 and DEC-114 are required before the design revision and implementation.
- Downstream impact: finalization must wait for this revision. The worktree currently holds an unfinished merge of `origin/personal` (`fdbd07124`, v1.4.79) by another member; it has not been touched.
- Next action: user decision, then a design revision (gateway-only), reclassification, and routing through the handoff rules.
