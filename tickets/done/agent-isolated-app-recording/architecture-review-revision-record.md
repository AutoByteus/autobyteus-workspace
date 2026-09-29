# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record holds the initial baseline and later review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-007) | SR-003, SR-006, SR-007 | N/A | Fail | ARCH-DR-001, ARCH-DR-002, ARCH-DR-003 |
| ARCH-REV-002 | Round 2 / Revised design (SR-009) after ARCH-REV-001 | SR-008, SR-009 | Fail | Fail (Requirement Gap) | ARCH-DR-001..003 resolved; ARCH-DR-004 new |
| ARCH-REV-003 | Round 3 / SR-010 requirements repair | SR-010 | Fail | Pass | ARCH-DR-004 resolved |
| ARCH-REV-004 | Round 4 / SR-011 isolated-launch capability gate (IMP-DI-001) | SR-011 | Pass | Fail (Design Impact) | ARCH-DR-005, ARCH-DR-006 new |
| ARCH-REV-005 | Round 5 / SR-012 AppImage branch + text alignment | SR-012 | Fail | Pass | ARCH-DR-005, ARCH-DR-006 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review of isolated-app lifecycle, env policy, recorder and helper design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` handoff from `/solution_designer`
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-architecture-design-complete.md`; N/A
- Relevant solution revision IDs: SR-003, SR-006, SR-007
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: Baseline established. Behavior basis confirmed against code; all structural sections pass. Three narrow findings: helper loading channel diverges from approved REQ-006/AC-005 (Medium, blocking); `--output` path rule unspecified (Low); `stop` on a dead-process record unspecified (Low).

#### Prior Finding Resolution

None

- New or remaining finding IDs: ARCH-DR-001 (Medium), ARCH-DR-002 (Low), ARCH-DR-003 (Low)
- Material classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: occluded-window screencast (MP-003, Unclear); Node `WebSocket`→CDP not probed; recorder pid identity; Linux default app location; `databaseUrl` derivation; restart ownership flag; allowlist completeness and loopback binding (validation-time).

### ARCH-REV-002 — Re-review of SR-009 (helper + recording in browser-automation; lifecycle reduced)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-review-report.md`
- Review round and trigger: Round 2; revised `Architecture Design Complete` (SR-009) with widened scope (DS-005/006/007, mcps `presentation/` and `recording/`, simplified lifecycle)
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-architecture-design-complete.md`; responds to ARCH-DR-001..003
- Relevant solution revision IDs: SR-008, SR-009
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (Requirement Gap)
- What changed in the review result: All structural checks pass for the rewritten design, including the new browser-automation recording service/worker, the helper auto-install in `run_script`, `ArtifactPolicy` reuse, and the instance-only lifecycle. Prior findings are resolved. A new artifact-integrity gap: the requirements doc's AC-007/AC-014 rows are overwritten with scenario content and SCN-004/SCN-005 are stale.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DR-001 | Open (Medium) | Resolved | SR-009 REQ-006/AC-005 re-approved | REQ-006/AC-005 now specify built-in auto-install; design DS-005 and `presentation/helper.py` match; no lifecycle loading remains |
| ARCH-DR-002 | Open (Low) | Resolved | SR-009 | Recording outputs go through existing `ArtifactPolicy` (verified `policy.py`: workspace-relative, temp sibling, no-overwrite commit); lifecycle relative paths via `INIT_CWD` |
| ARCH-DR-003 | Open (Low) | Resolved | SR-008/SR-009 AC-003 | DS-002 and interface table define the dead-process branch (`wasRunning:false`, DEC-003 disposal, record removed); AC-003 alternate updated |

- New or remaining finding IDs: ARCH-DR-004 (Requirement Gap, Medium, blocking — artifact repair)
- Material classification changes: from `Design Impact` (round 1) to `Requirement Gap` (round 2); design itself passes
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: MP-003 occlusion (Unclear; switches + validation), MP-004 orphaned worker (recoverable), MP-005 dialog auto-dismissal by worker Playwright (Unclear), concurrent MCP connection during screencast not probed, tab id change on restart, restart `ownsDataRoot`, worker interpreter/connect-only

### ARCH-REV-003 — Requirements artifact repair confirmed; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-review-report.md`
- Review round and trigger: Round 3; SR-010 repair of ARCH-DR-004 plus design Guidance residuals
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-architecture-design-complete.md`; ARCH-DR-004
- Relevant solution revision IDs: SR-010 (on SR-009 basis)
- Prior authoritative decision: `Fail` (ARCH-REV-002, Requirement Gap)
- Current authoritative decision: `Pass`
- What changed: AC-007/AC-014/SCN-004/SCN-005 restored and consistent with REQ-008/REQ-015 and the design; AC-003 alternate aligned with the SR-009 boundary; status lines fixed. Design structure is unchanged, and the Guidance carries the ARCH-REV-002 residuals as implementation and validation items.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DR-004 | Open (Requirement Gap, Medium) | Resolved | SR-010 | `requirements-doc.md` lines 110, 114, 121, 130–131, 53, 11, 244; `investigation-notes.md` line 15; SR-010 entry records root cause and no intent change |

- New or remaining finding IDs: None
- Material classification changes: N/A
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: MP-003 occlusion and MP-005 dialog handling (validation items; with a no-op listener, confirm the dialog stays visible and operable); concurrent MCP calls during screencast; allowlist completeness; loopback binding

### ARCH-REV-004 — Isolated-launch capability gate (SR-011) re-review

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-review-report.md`
- Review round and trigger: Round 4; SR-011 responding to implementation Design Impact IMP-DI-001 (`implementation-handoff.md`, `implementation-revision-record.md`)
- Triggering role, report path, and finding IDs: `/implementation_engineer` → `/solution_designer`; IMP-DI-001
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail` (Design Impact)
- What changed: Option B (fail-closed isolated-launch marker gate before any launch work) is accepted as the correct, proportionate enforcement of REQ-002 on the default installed-app path. Options A and C were correctly rejected. The REQ-002 scope note and AC-001 alternate need no renewed approval. New gaps: the marker lookup ignores the Linux AppImage release format (ARCH-DR-005), and ASM-001 plus the Guidance line still carry the superseded "≥1.4.53" basis (ARCH-DR-006).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DR-001..004 | Resolved | Resolved (unaffected by SR-011) | SR-009, SR-010 | SR-011 touches only the lifecycle start/restart gate, build resources, REQ-002 note and AC-001 alternate |

- New or remaining finding IDs: ARCH-DR-005 (Medium, blocking), ARCH-DR-006 (Low)
- Material classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: unchanged from ARCH-REV-003. Manual launches of pre-change binaries remain uncontrollable (accepted by the REQ-002 scope note; document in the guide).

### ARCH-REV-005 — AppImage branch and prerequisite alignment confirmed; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-review-report.md`
- Review round and trigger: Round 5; SR-012 responding to ARCH-REV-004
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-architecture-design-complete.md`; ARCH-DR-005, ARCH-DR-006
- Relevant solution revision IDs: SR-011, SR-012
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed: The gate now handles packed AppImages explicitly without executing them, and the extracted layout goes through the normal marker gate. The stale ≥1.4.53 basis is removed from ASM-001 and the Guidance.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DR-005 | Open (Medium) | Resolved | SR-012 | `design-spec.md:407` AppImage branch (magic/suffix detection, no execution, `APPIMAGE_EXTRACTION_REQUIRED` exit 2, recovery text, marker in AppImage `resources/`, tests, docs); `design-spec.md:232` exit-code table |
| ARCH-DR-006 | Open (Low) | Resolved | SR-012 | `requirements-doc.md:181` ASM-001 and `design-spec.md:489` aligned with the isolated-launch contract; only the removal instruction mentions 1.4.53 |

- New or remaining finding IDs: None
- Material classification changes: N/A
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: Linux Chromium sandbox for directly launched unpacked/extracted builds (validation-time; escalate rather than silently disabling the sandbox); earlier residuals unchanged (MP-003, MP-005, concurrent MCP calls during screencast, allowlist completeness, loopback binding)
