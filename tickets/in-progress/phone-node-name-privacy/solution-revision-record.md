# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-433 and its 2026-11-08 comment) | N/A | N/A | Approved | BEH-001…BEH-008; REQ-001…REQ-008; AC-001…AC-010 | Requirements approved within the direction; user informed |
| SR-002 | Design | Architecture design on the approved SR-001 | N/A | Requirements Approved; design N/A | Design Ready; `Medium` / `Low` | All (design) | `design-spec.md` complete; classified |
| SR-003 | Mixed | CRR-001 failure-origin review (code reviewer) of API-REV-001 | F-001 (C-001, C-002, C-003); FU-002 | Requirements Approved (SR-001); design Ready (SR-002) | Requirements Approved (SR-003); design Ready; `Medium` / `Low` | BEH-006; REQ-006; AC-007; DEC-009; DS-004, DS-006 | The WebView is hidden under every overlay; the page shows only after a load that succeeded; FU-002 folded in |
| SR-004 | Design | Implementation Design Impact IR-002 (premise check IMP-09) | IR-002 | Design Ready (SR-003) | Design Ready; `Medium` / `Low` | BEH-006; DS-006 | The load outcome is decided and the mark reset at `onPageFinished`, not `onPageStarted` |

## Revision Entries

### SR-001 — Name, never address, on every phone surface

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task `autobyteus-433` (description and the user's comment of 2026-11-08), two phone screenshots (private; real names kept out of the repository)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: `requirements-doc.md` Approved
- IDs affected: BEH-001…BEH-008, SCN-001…SCN-006, UC-001…UC-005, REQ-001…REQ-008, AC-001…AC-010, DEC-001…DEC-008
- Scenario-basis changes: none (baseline). Before approval was used downstream, a mixed APK/page-version scenario and its AC/quality row were removed as contrary to `DESIGN.md` rule 9 (one release, no mixed-version design); SCN-003 now covers the browser case only.
- Why recorded: first coherent baseline
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md`
- Supplements: none
- Product design evidence: none (the user gave the wording direction in the Task comment)
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction (no `Needs user` decision; the address decision is the user's own, from the Task comment); user informed in the Solution Designer's conversation on 2026-11-08
- Supplement approvals: N/A
- Design/review basis invalidated: N/A
- Classification: N/A (before design)
- Handoff: none at this round
- Remaining gaps: none
- Next action: architecture design

### SR-002 — Design: name sources and plain texts

- Phase and classification: Design, `Refinement`
- Trigger: approved SR-001
- Finding IDs: N/A
- Prior status: requirements Approved; design N/A
- Current status: `design-spec.md` Ready
- IDs affected: all requirements mapped to DS-001…DS-005
- Scenario changes: none
- Why recorded: design complete
- Canonical sections changed: `design-spec.md` (new); `investigation-notes.md` (Architecture Investigation Findings); `follow-ups.md` (FU-001)
- Supplements: none
- Intended behavior changed: No
- Approval impact: none; SR-001 approval applies
- Design/review basis: new
- Classification: `task_size = Medium`, `architectural_risk = Low` (one additive field in the in-repository app↔page bridge reply; no server, pairing, credential, Host/Origin, persistence or permission change)
- Handoff: see `solution-handoff.md`, Route
- Downstream impact: implementation per the handoff rules
- Remaining gaps: none
- Next action: hand off per `get_handoff_rules`

### SR-003 — The page under an overlay (CRR-001 F-001)

- Phase and classification: Mixed, `Design Impact` (with a requirements clarification within the direction)
- Triggering input: code reviewer `/software_engineering_team/code_reviewer` (run `code_reviewer_c015abee75944ddca0d98cc5e927b360`), failure-origin review CRR-001 (`code-review-report.md`) of API/E2E round API-REV-001 (`api-e2e-execution-coverage-report.md`), code `ba3ba5b23e`, reports at `850bff3c1d`
- Triggering finding IDs: F-001 (with C-001, C-002 and C-003, the last held for evidence); FU-002
- Prior status: requirements Approved at SR-001; design Ready at SR-002
- Current status: requirements Approved at SR-003; design Ready
- IDs affected: BEH-006; REQ-006 (adds: nothing shows behind an overlay or reaches the accessibility tree; a failed load never replaces the overlay; a successful load closes it); AC-007 (reload, Back, Retry, first load; dump check; overlay closes after recovery); DEC-009 (new); DS-004 (revised), DS-006 (new)
- Scenario changes: none; SCN-006 already covered network loss
- Why recorded: the design decided the overlay's text but not what the WebView shows behind it. WebView's built-in error page prints the node URL; the translucent overlay showed it and screen readers could reach it. The first-load path also replaced the overlay with that page.
- Canonical sections changed: `requirements-doc.md` (status, REQ-006, AC-007, DEC-009); `design-spec.md` (approval basis, Change Scope, behavior map, design health, DS-004, DS-006, removal plan, file mapping, risks, guidance); `investigation-notes.md` (Source Log); `follow-ups.md` (FU-002 folded, not sent); `docs/design-cases.md` (Case 18)
- Supplements: none
- Intended behavior changed: Yes, as a clarification within the direction. REQ-006's outcome ("no URL on the overlay screens") is unchanged. Closing the overlay after a successful load is new; it is needed because the page is now hidden under the overlay.
- Approval impact: approved by the Solution Designer within the direction; the user was informed in the Solution Designer's conversation on 2026-11-08
- Supplement approvals: N/A
- Design/review basis invalidated: SR-002 DS-004 and its implementation in `AutoByteusWebView`, `MainActivity` and `WebShellScreen`; the other code is unaffected
- Classification: unchanged, `Medium` / `Low` (three Android files within existing owners; no contract, persistence or security boundary change)
- Handoff: `solution-handoff.md`, Route (SR-003)
- Downstream impact: implementation of DS-006 and the WebShellScreen change; API/E2E reruns API-08, API-08b and API-03, plus a Retry-after-recovery case
- Remaining gaps: one premise for the emulator, the WebView callback order on a failed load (design-spec DS-006)
- Next action: hand off per `get_handoff_rules`

### SR-004 — Where the load-failure mark resets (IR-002)

- Phase and classification: Design, `Design Impact`
- Triggering input: implementation engineer (run `implementation_engineer_083c78e04e3b4efd89064cf23ef526bc`), IR-002, premise check IMP-09 (`evidence/IMP-09-sr003-load-order-premise.log`, committed at `74c683208c`); SR-003 not implemented, code still `ba3ba5b23e`
- Triggering finding IDs: IR-002
- Prior status: requirements Approved (SR-003); design Ready (SR-003)
- Current status: requirements Approved (SR-003, unchanged); design Ready
- IDs affected: DS-006 only
- Scenario changes: none
- Why recorded: the measured callback order differs by error kind (HTTP error before `onPageStarted`, network error after it), so SR-003's "reset in `onPageStarted`" would have erased HTTP failures. `onPageFinished` always ends a main-frame load, so the decision and the reset move there (the implementation engineer's proposed option). Keying by URL was rejected because of redirects.
- Canonical sections changed: `design-spec.md` (approval basis line, DS-006 inventory row and bounded local spine, `AutoByteusWebView` file-mapping row); `investigation-notes.md` (Source Log); `docs/design-cases.md` (Case 18 note)
- Supplements: none
- Intended behavior changed: No
- Approval impact: none; SR-003 requirements approval applies
- Design/review basis invalidated: SR-003 DS-006 reset point only
- Classification: unchanged, `Medium` / `Low`
- Handoff: `solution-handoff.md`, SR-004 section
- Downstream impact: implementation of SR-003 with the SR-004 rule; a JVM or instrumented test of the three measured orders
- Remaining gaps: the unobserved cancelled-load residual (fails toward hiding)
- Next action: hand off per `get_handoff_rules`
