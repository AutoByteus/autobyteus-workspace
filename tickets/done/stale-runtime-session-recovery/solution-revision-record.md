# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Initial baseline (Task autobyteus-599) | PRB-001…PRB-008, data counts | N/A | Requirements Approved (within the direction); design Ready | BEH-001…007, REQ-001…007, AC-001…007 | Baseline; to architecture review |
| SR-002 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, N-1, N-2, N-4 | Design Ready (SR-001), review Fail | Design Ready; requirements unchanged in intent | BEH-007, REQ-006, AC-005 (verification paths) | Member commit consumers decided; dead staged activation removed; back to architecture review |
| SR-003 | Mixed | CRR-001 (Fail, Design Impact) | CR-002, CR-001 | Design Ready (SR-002, ARCH-REV-002 Pass) | Requirements Approved (REQ-006 extended within the direction, AC-008, DEC-007); design Ready | REQ-003, REQ-006, AC-008, BEH-006, BEH-007 | Renewal wired in all three compositions; unread `cause` and `rpcCode` removed; back to architecture review |

## Revision Entries

### SR-001 — A lost runtime session continues in a fresh session from the work journal

- **Phase and classification:** `Initial Baseline`.
- **Triggering evidence:** the founder's screenshot (Task 599); probes PRB-001…008; read-only data counts.
- **Prior status:** N/A.
- **Current status:** requirements `Approved`; design `Ready`.
- **IDs affected:** all, as baseline.
- **Scenario basis:** SCN-001 is a Supported Normal Scenario (Claude's 30-day cleanup). SCN-002…004 are Supported Explicit Edge Scenarios.
- **Sections:** all sections of `requirements-doc.md`, `investigation-notes.md` and `design-spec.md`.
- **Supplements:** `probes/` (evidence).
- **Intended behavior changed:** `Yes` (baseline): automatic renewal (DEC-001) with the REQ-004 chat line (DEC-003).
- **Approval:** baseline SR-001, approved by the Solution Designer within the direction; the founder was informed in this conversation on 2026-11-22.
- **Design/review basis:** N/A (first).
- **Classification:** `Large` / `High` (design-spec.md).
- **Handoff:** `solution-designer-handoff.md`.
- **Downstream impact:** architecture review.
- **Remaining gaps:** RSK-001…003; FU-001.
- **Next action:** architecture review.

### SR-002 — Member binding-change consumers decided; dead staged activation removed (ARCH-REV-001)

- **Phase and classification:** `Design Impact`.
- **Triggering report:** `design-review-report.md`, ARCH-REV-001, round 1.
  - AR-001 (Medium): `replace_lost_session` is consumed in five places, and the design decided one. The Team path would throw.
  - AR-002 (Low): the uncalled staged member activation was missing from the removal plan.
  - Non-blocking: N-1 (Grok exactness), N-2 (delegated copies go through the standalone lifecycle), N-4 (application scope).
- **Verified by the Solution Designer:**
  - the five consumers (`collaboration-agent-platform-binding.ts:35-44`, `configured-agent-execution-handle.ts:386-392`, `flat-team-agent-execution-handle.ts:182-205`, `team-agent-platform-binding-committer.ts:34-40`, `agent-org-run.ts:249-254`);
  - the staged activation's callers: in `src` only its own definition and the forwarding wrapper; the rest are tests and test doubles. The `commitAfterDurability` in the root directory and registry belong to other objects.
- **Prior status:** design Ready (SR-001), review Fail.
- **Current status:** design Ready (SR-002). Requirements are unchanged in intent: AC-005 now names the paths it is verified through, an evidence-level clarification, so no renewed approval is needed.
- **Design sections changed:**
  - Change Scope: a new table of the five consumers with a decision for each, and the neutral renames of the shared compare-and-set;
  - Interface Boundary Mapping: the `replace_lost_session` payload is `replacement: { binding, expectedPreviousPlatformAgentRunId }`;
  - Data-Flow Spine Inventory, DS-002 spine and narrative: delegated copies and application-scope runs move to DS-001;
  - Removal plan: the staged activation, the wrapper, and the tests and doubles;
  - Final File Responsibility Mapping: the Team and Org files added;
  - Refactor and Legacy sections;
  - Change Sequence step 5;
  - Guidance: the N-1 probe on an isolated home, and the AC-005 paths.
- **Design cases:** `docs/design-cases.md` Case 26 added, for a new union kind whose consumers were not listed.
- **Classification:** unchanged, `Large` / `High`.
- **Next action:** architecture review, round 2.

### Note to SR-002 (no new round) — DEC-006, evidence for N-1

- 2026-11-22: the implementation engineer asked how to probe Grok exactness. Decided (A): an isolated home plus the test vault's Grok key, with no model call (requirements DEC-006). Intended behavior and design are unchanged; this only selects the evidence.

### SR-003 — Renewal wired in every composition; unread fields removed (CRR-001)

- **Phase and classification:** `Design Impact`, with a requirements extension within the direction.
- **Triggering report:** `code-review-report.md`, CRR-001.
  - **CR-002:** on the application paths a renewal ran without the hand-over notice. The application host's standalone lifecycle, and the delegated copies through it, could not renew; its members renewed without the notice.
    - Verified: the studio wires both parts (`build-studio-server.ts:283-306`). The application scope's `AgentRunManager` has no `inputPreface` (`application-execution-scope-kernel-builder.ts:144-170`). The host passes no `runtimeSwitching` and no hand-over notice (`start-standalone-application-host.ts:262-293`).
  - **CR-001:** `RuntimeSwitch.cause` and `CodexAppServerRpcError.rpcCode` have no production reader. Verified (`runtime-switch.ts:22, 52, 75`; `codex-app-server-client.ts:315-320, 400`).
- **Origin:** design. SR-002 adopted N-4 (application scope reaches the same owners) and reused the notice "unchanged", but did not list the compositions or record that only the studio wires the notice. The `cause` field was prescribed by the design.
- **Requirements:**
  - REQ-006 now names every composition that runs external-runtime agents;
  - AC-008 added (the notice on every path);
  - DEC-007 decided (a): wire both parts everywhere, rather than keeping the dead end on the application paths.
  - This is within the Task's direction (any run that lost its session), so the Solution Designer approved it and informed the founder on 2026-11-22.
- **Design sections changed:**
  - Change Scope: a Compositions table with the rule "both parts or no renewal";
  - DS-001 narrative;
  - Vocabulary drift and D-1 wording: no `cause`;
  - Interface Boundary Mapping, Naming Check, Tightness Check and Terminology;
  - Final File Responsibility Mapping: the two compositions, the supervisor input comment, and the Codex client;
  - Change Sequence steps 1 and 8;
  - Guidance: AC-008 tests per composition.
- **Design cases:** `docs/design-cases.md` Case 27 added.
- **Classification:** unchanged, `Large` / `High`.
- **Downstream:** ARCH-REV-002's pass covered SR-002, not the composition change. Architecture review again, then implementation, source review and API/E2E.

- 2026-11-22: ARCH-REV-003 **Pass** on SR-003 (no findings). The reviewer delivered the package to `/implementation_engineer`. N-5 citation corrected in the design spec's Compositions note: on the host, switches are unoffered because no run-selection surface is served, not because of `canSwitchRuntime`. This is a factual correction, with no design change.
