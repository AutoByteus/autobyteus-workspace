# Flat Agent Organization Model — Follow-up Requirements

## Document Status
- Package identifier: `AORG-FOLLOWUP-20260914-001`
- Ticket: `flat-agent-organization-model-follow-up`
- Owner: Solution Designer
- Date: 2026-09-14
- Status: **Approved — AgentOrg and AgentTeam restart/resume correction**.
- Current solution revision: SR-007 (completed design; approved behavior baseline remains SR-005).
- Approval: Direct user response “Yeah, I approve.” approves SR-004 Org correction. In the same message the user asks to check AgentTeam and states “if it has, we should also fix that.” INV-R06 confirms identical eager Team restore preparation, satisfying this explicit conditional extension. SR-005 applies the same approved work-driven behavior and preserved constraints to standalone Teams. No naming/refactor approval inferred. Approval source: this conversation, user message immediately following SR-004 approval request (2026-09-14).
- Approved baseline: SR-004 plus same-message conditional Team extension, consolidated in SR-005. Evidence supplements do not add normative behavior.

## Problem And Desired Outcome
After server restart with the browser left open, sending to one retained offline Org Agent makes every configured Agent appear green. User requests analysis and expects activation only when members receive work. Source analysis establishes eager restore preparation of every configured runtime in both AgentOrg and standalone AgentTeam; fresh configured launches are lazy. Correct both restore paths while preserving fresh behavior.

## Workspace And Authority
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up`
- Branch: `codex/flat-agent-organization-model-follow-up`
- Refreshed base: `origin/requirements/flat-agent-organization-model` at `72dee5ad2c2e332272a0c00eb36af1a036bd69fb`.
- Confirmed future integration target: `origin/requirements/flat-agent-organization-model`. User explicitly says this is an unreleased feature branch and this follow-up ticket will merge back into that base after completion. The larger AgentOrg feature remains in progress. Do not merge into `personal` or infer release/deployment authority. Actual integration remains a Delivery-stage action after applicable gates, not an immediate merge or push.
- Release context: user explicitly confirms the requested base branch is unreleased. No released-version compatibility or upgrade/migration support is in scope; current development-run history/identity preservation remains approved.
- Completed source packages remain historical, unchanged: `tickets/done/flat-agent-organization-model/` and `tickets/done/collaboration-follow-up-fixes/`.

## Scope Guardrail
User selects the restart/resume bug, now confirmed and approved for AgentOrg and standalone AgentTeam. Scope: REQ-001–005 / SCN-001–004 below. Backend renaming, Mixed/Flat naming changes and removal of forwarding/interface layers remain explicitly deferred. Preserve completed tickets and historical results. No configured nested-Team restoration, new task policy, color-only workaround, deployment, live-data migration/reset. Architecture design is authorized on this approved basis; implementation handoff still requires completed design and applicable routing.

Blocking downstream corrections must trace to this approved basis; new behavior or compatibility/migration obligations require renewed approval.

## Approved Behavior / Requirements / Acceptance Baseline
- BEH-001 / SCN-001 / REQ-001 / AC-001: website stays open, server restarts, user selects an offline configured Agent in a retained Org and sends. Current code restores/prepares all configured Agents. Required outcome: complete Org scope remains available, selected recipient continues correctly; unrelated configured Agents remain genuinely Offline/unactivated. Include both direct Agents and mounted-Team Agents, previously used and never used.
- BEH-002 / SCN-002 / REQ-002 / AC-002: a different configured member later receives supported human/peer work; it activates normally with truthful status. No zero-human-message mask or expansion of recipient authorization.
- BEH-003 / REQ-003 / AC-003 (preserved, within SCN-001–004): keep exact local/provider conversation identity, history, attachments, accepted communication/task records, current failure-closed continuation safety, full coordinator-free Org scope and flat coordinator-led Teams. No old-message replay, duplicate accepted input, unintended restart of settled task execution or new migration obligation.
Scenario validity: SCN-001 supported normal scenario from direct user report and source continuation path. SCN-002 supported work-driven follow-on, approved by the SR-004 acceptance and SR-005 conditional extension. No runtime reproduction claimed.

- BEH-004 / SCN-003 / REQ-004 / AC-004: with the website open across server restart, user selects a retained offline Agent in a standalone Team and sends. The full Team scope and exact conversation remain available; only required recipients activate, unrelated configured members remain genuinely Offline. Later legitimate human/peer work can activate other members. Cover previously used and never-used members. Apply REQ-002 and REQ-003 continuity, safety and task-preservation constraints equally. SCN-003 is a supported normal scenario: user explicitly requested Team parity and the existing retained-Team composer implements it (INV-R06).
- BEH-005 / SCN-004 / REQ-005 / AC-005 (preserved): fresh configured Team/Org launch before any work leaves unused members Offline; normal first message starts only required recipients and reports truthful lifecycle. Org remains coordinator-free and initially unfocused; Team retains coordinator ingress. Task-scoped execution already receiving an assignment is not an unused configured member and its activation is unchanged. SCN-004 is supported normal creation/launch with independent current-source and prior accepted fresh-launch evidence (INV-R05–06).

## UI, Quality And Data Continuity
Green maps to Idle, not reasoning. Status must represent actual runtime state rather than hide eager activation. Persisted history/bindings are involved; preserve their meaning and identities. No data loss/reset authorized. No new visual design or Product request. Provider-specific resource costs not measured.

## Evidence And Supplements
- investigation-notes.md: canonical investigation index and bootstrap evidence.
- restart-resume-analysis.md: INV-R01–05 source chain, original-personal comparison, prior scope and limits.
- team-backend-abstraction-analysis.md: INV-B01–04 historical rationale, caller/test boundary and forwarding-layer assessment.
- solution-revision-record.md: cumulative SR-001–007 approval/evidence/design history.
- design-spec.md: DS-REV-001 technical authority realizing this approved basis; no changed product intent.
- solution-handoff.md: complete architecture-ready result and route record.
- bootstrap-handoff.md: historical bootstrap receipt.
No behavior-defining Product supplement or new design applies.

## Approval / Readiness
- Approved intended behavior: SR-005 (explicit Org approval plus satisfied conditional Team extension).
- Source cause, supported product paths and origin/personal comparison: INV-R01–06. No live reproduction claimed.
- Relevant ACs are observable; history/bindings, task policy, fresh behavior, mixed-runtime capability and lifecycle truth must remain preserved.
- Requirements ready for architecture design: Yes. No blocking product question for this narrow correction.
- Exact deployed runtime/provider details unverified; realistic reproduction and executable coverage are still required downstream.
- Technical design resolution: DS-REV-001 carries complete binding-change metadata to existing root persistence at first work; preserves current binding/cache and failure semantics. Never discard replacement metadata or switch restore mode to fresh.
- Design: design-spec.md DS-REV-001 Ready; completed classification Medium / High. Independent architecture review required by matching route; not yet performed.
- Behavior-defining supplements: none beyond this document; analysis files are evidence only.

## Backend-Abstraction Investigation Decision
User authorized investigating why FlatTeamRunBackend implements TeamRunBackend with one production implementation. Source/history investigation is complete. Historical provider polymorphism explains origin; test substitution and bounded access remain legitimate; the extra concrete forwarding adapter has weak independent responsibility. These are evidence/assessment, not new REQ/AC scope or an approved design. Restart behavior IDs and desired outcomes are unchanged. Decide separately whether structural cleanup belongs in a future approved correction.

User clarification (SR-003): Mixed refers to differing member runtime backends, independently of flat membership. Naming investigation only; no rename approved. Preserve mixed-runtime capability if structural correction is later requested.

SR-004 deferred backend naming/abstraction; SR-005 retains that exclusion and extends the approved work-driven restore correction to standalone Team after confirming the same defect.

User go-ahead reconfirmation: “We should fix the problem now. You're ready to go.” Followed by clarification that the base is an unreleased feature branch and completed child work merges back there. This does not authorize backend renaming, release, personal integration, or skipping downstream gates.
