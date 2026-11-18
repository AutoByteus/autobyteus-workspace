# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Evidence + Requirements) | Investigation of autobyteus-387 and the user's decisions in conversation | RT-001…RT-022 | N/A | Approved | BEH-001…BEH-015, REQ-001…REQ-015 | Investigation answered; user extended the ticket to building; requirements approved within the direction |
| SR-002 | Design | Architecture design on the approved SR-001 basis | N/A | N/A | Ready | All | `design-spec.md` complete; Large / High; routed to architecture review |
| SR-003 | Design | Architecture review ARCH-REV-001, round 1 (Fail, Design Impact) | AR-001…AR-007 | Ready (SR-002) | Ready | BEH-001/004/005/006/009/010/011/012/013/015; DEC-019, DEC-020 added | Reopen traced as a restore form with held instructions; one end owner; relay access disposition per composition with refusal rule and process slot; Anthropic refusal envelope; `normalizeModels` removed; "provider relay" vocabulary; relay never alters bodies |
| SR-004 | Design | Architecture review ARCH-REV-002, round 2 (Fail, Design Impact) | AR-008 | Ready (SR-003) | Ready | BEH-009, REQ-009/AC-009 | One run-pass lifetime owner (`RunPassRevocation`) wired into `AgentRunManager` and `AgentRunResourceManager` in every composition, application scopes included |

## Revision Entries

### SR-001 — Investigation answer and approved requirements for the DeepSeek Harness runtime

- Phase and classification: `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Project Task autobyteus-387; the user's answers in the Solution Designer conversation of 2026-11-05/06 (quoted in `investigation-notes.md`).
- Triggering finding IDs: RT-001…RT-022.
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: requirements `Approved`; design not yet written at this round.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001…BEH-015, REQ-001…REQ-015, AC-001…AC-017, SCN-001…SCN-010, DEC-001…DEC-018.
- Scenario-basis or scenario-validity changes: all Supported Normal Scenarios.
- Why this baseline was recorded: the Task asked for an answer, then the user decided to build in this ticket ("we do it now in this ticket").
- Canonical sections changed: all (new).
- Supplemental artifacts added: `probes/`, `evidence/` (no key material).
- Product design evidence or product decisions incorporated: None.
- Intended behavior changed: `No` (first baseline).
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved by the Solution Designer within the direction, with the user informed in the conversation; DEC-001…DEC-006 are the user's own decisions or accepted defaults.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification: N/A.
- Applied handoff-rule outcome: N/A.
- Downstream and architecture-review impact: architecture design next.
- Remaining gaps, assumptions or blocked decisions: RSK-004 (process memory, measured in validation), RSK-006 (merge overlap with autobyteus-386).
- Next action: architecture design.

### SR-002 — Architecture design

- Phase and classification: `Initial Baseline` (design)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: approved SR-001 basis; architecture investigation (`investigation-notes.md`, Relevant Codebase And Technical Facts, Architecture Investigation Findings).
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: requirements Approved; design N/A.
- Current authoritative requirements/design status: requirements Approved (unchanged); design `Ready`.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all mapped in `design-spec.md`.
- Scenario-basis or scenario-validity changes: None.
- Why this revision was recorded: design completed.
- Canonical sections changed: `design-spec.md` (new); `investigation-notes.md` architecture sections.
- Supplemental artifacts added, changed or removed: `follow-ups.md` (FU-001).
- Product design evidence or product decisions incorporated: None.
- Intended behavior changed: `No`.
- Approval impact: none; design approval by the user is not required by the direction.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification and rationale: `Large` / `High` (design spec).
- Applied handoff-rule outcome / result-file reference: `handoff-architecture-design-complete.md`; route `/software_engineering_team/architecture_reviewer`.
- Downstream and architecture-review impact: independent architecture review required.
- Remaining gaps, assumptions or blocked decisions: as SR-001.
- Next action: architecture review.

### SR-003 — Design revision after architecture review round 1

- Phase and classification: `Design Impact`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: `design-review-report.md`, ARCH-REV-001, round 1 (Fail).
- Triggering finding IDs: AR-001…AR-007.
- Prior authoritative requirements/design status: requirements Approved; design Ready (SR-002), failed review.
- Current authoritative requirements/design status: requirements Approved (intent unchanged; DEC-019/DEC-020 added within the direction); design `Ready`.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001/004/005/006/009/010/011/012/013/015; DEC-019 (keep dsh's plugin-inventory field), DEC-020 (dsh runs only where the credential proxy runs; unavailable and refused elsewhere).
- Scenario-basis or scenario-validity changes: the reopen after an Agent Tools change (existing supported path) is now traced as a restore form; application launches in the studio included under SCN-001.
- Why this revision was recorded: to resolve the review findings.
- Canonical requirements, investigation and design sections changed:
  - AR-001: DS-004 lists three restore forms. The backend holds the run's instructions and passes them on reopen (re-sent, not recomposed). `acp-agent-run-backend.ts` was added to the inventory, and its reopen call to the `"load"` → `"restore"` removal row.
  - AR-002: DS-008 makes `AcpSessionLauncher.end` the one end owner, in the order unsubscribe → close session → close connection or stop process → release launch. The factory's `releaseResources` calls it. The unsubscribe is identity-scoped per generation.
  - AR-003: a required `providerRelayAccess` disposition in `createForExecution` and in every composition (studio: the host's; application platform runtime: threaded from the studio; standalone host: `null`). A launch whose profile names a relay but has no access is refused before spawn. A process relay slot, set by the composition, serves the dsh catalog and the availability provider. dsh reports as unavailable, with a reason, where the slot is empty.
  - AR-004: relay refusals use the Anthropic error envelope, with a status and type for each code.
  - AR-005: `normalizeModels` removed from the shared launch contract.
  - AR-006: "runtime model route" renamed to "provider relay" (`/relay/<relayId>`); dsh's own route kept as `DSH_PROVIDER_ROUTE`.
  - AR-007: the relay never alters bodies; the probe-only field stripping is noted; DEC-019.
  - Residual guidance adopted: `finished` delivered synchronously; `issue`/`clearGrants` keep the relay grant; home files written atomically; `customSkillDirs` is an empty list when unset.
  - Requirements doc: approval-line alignment (review note), DEC-019, DEC-020. Investigation notes: architecture facts from the review.
- Supplemental artifacts added, changed or removed: none (probe notes only).
- Product design evidence or product decisions incorporated: None.
- Intended behavior changed: `No` (DEC-020 states where the approved REQ-009 rule leaves dsh available; the user is informed).
- Approval impact: none beyond informing the user of DEC-019/DEC-020.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: SR-002 design superseded by SR-003; ARCH-REV-001 applies to SR-002.
- Post-design task-size/risk classification and rationale changes: unchanged, `Large` / `High` (inventory grows by compositions).
- Applied handoff-rule outcome / result-file reference: `handoff-architecture-design-complete.md` (updated for SR-003); route `/software_engineering_team/architecture_reviewer`.
- Downstream and architecture-review impact: architecture review round 2.
- Remaining gaps, assumptions or blocked decisions: RSK-004, RSK-006.
- Next action: architecture review round 2.

### SR-004 — One run-pass lifetime owner (architecture review round 2)

- Phase and classification: `Design Impact`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: `design-review-report.md`, ARCH-REV-002, round 2 (Fail; AR-001…AR-007 resolved).
- Triggering finding IDs: AR-008.
- Prior authoritative requirements/design status: requirements Approved; design Ready (SR-003), failed review.
- Current authoritative requirements/design status: requirements Approved (unchanged); design `Ready`.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-009, REQ-009, AC-009.
- Scenario-basis or scenario-validity changes: none (P-003, a dsh run launched from an application in the studio, is SCN-001 under DEC-020).
- Why this revision was recorded: relay-granted passes in application scopes were never revoked, because revocation lived only on `IntegrationRunAccess`, which those scopes pass as `null`.
- Canonical sections changed: design spec Current-State Read, Change Scope (revocation callers under `RunPassHolder` consumers), Task Design Health (one fact, one owner), Ownership Map (`RunPassRevocation`), Boundary Encapsulation Map, Dependency Rules, Interface Boundary Mapping, Removal Plan (`IntegrationRunAccess.revokeForRun` and the `integrationRunAccess` revoke dependencies), Final File Responsibility Mapping (`run-pass-revocation.ts`, `integration-run-access.ts`, `agent-run-resource-manager.ts`, `agent-run-manager.ts`, compositions), Change Sequence step 3, Guidance (slot before listen; post-release refusal check).
- Supplemental artifacts added, changed or removed: none.
- Product design evidence or product decisions incorporated: None.
- Intended behavior changed: `No`.
- Approval impact: none.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: SR-003 superseded by SR-004; ARCH-REV-002 applies to SR-003.
- Post-design task-size/risk classification and rationale changes: unchanged, `Large` / `High`.
- Applied handoff-rule outcome / result-file reference: `handoff-architecture-design-complete.md` (updated for SR-004); route `/software_engineering_team/architecture_reviewer`.
- Downstream and architecture-review impact: architecture review round 3.
- Remaining gaps, assumptions or blocked decisions: RSK-004, RSK-006.
- Next action: architecture review round 3.
