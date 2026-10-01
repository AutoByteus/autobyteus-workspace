# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record keeps the initial baseline and later review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer "Architecture Design Complete" handoff, 2026-09-24 | SR-014, SR-015 | N/A | Fail (`Design Impact`) | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2 / SR-016 resubmission after ARCH-REV-001, 2026-09-24 | SR-014, SR-016 | Fail (`Design Impact`) | Pass | AR-001–AR-005 (all resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the main-product messaging removal design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/design-review-report.md`
- Review round and trigger: Round 1. Triggered by the `/solution_designer` handoff (`solution-handoff.md`, SR-015, task_size=Large, architectural_risk=High).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-handoff.md`; no prior finding IDs.
- Relevant solution revision IDs: `SR-014` (requirements approval), `SR-015` (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classified `Design Impact`
- Baseline established:
  - The approved behavior basis was confirmed against the code at `40b1783f4`.
  - Spines DS-001 to DS-008, the ownership and boundary model, and the persisted-data decisions passed. Those decisions are: discard the four roots through an app-data migration, drop the orphan tables through a Prisma migration, and read historical `externalSource` metadata directly.
  - Also verified as sound: deleting the internal base URL helper (no other reader in the repo or sibling repos), removing `EXTERNAL_SIGNATURE` and `EXTERNAL_USER_MESSAGE` end to end, the historical app-data migration edits, and the gateway type move.
  - Three material premises were recorded: MP-001 and MP-002 are `Not Reachable`, and MP-003 is `Unclear` with a benign consequence. The review failed on the five completeness and coherence findings below.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001: gateway pnpm-workspace membership conflicts with AC-117 and REQ-120.
  - AR-002: messaging-only code and config are missing from the removal plan: `verify-gateway-signature.ts`, the `AppConfig` channel-callback accessors, `scripts/personal-docker.sh`, the remaining compose entries, the web `.env.local.example` block, a future-tickets doc, and the root `index.html`.
  - AR-003: the step-7 allowed-hit list conflicts with the mandated tests and with REQ-120's approved exceptions.
  - AR-004: the in-progress messaging tickets have no disposition.
  - AR-005: stale or contradictory status and content in the investigation notes and supplement metadata.
- Material classification changes: N/A (initial)
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - AR-003 may need a narrow user confirmation if the reconciliation widens REQ-120's exceptions.
  - Non-blocking recommendations R-1 to R-4 are in the report.

### ARCH-REV-002 — SR-016 re-review: all findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/design-review-report.md`
- Review round and trigger: Round 2. Triggered by the `/solution_designer` resubmission of SR-016 (`solution-handoff.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` "Review Findings Resolution (ARCH-REV-001)" and "REQ-120 Verification Gate"; AR-001 to AR-005.
- Relevant solution revision IDs: `SR-014`, `SR-016`
- Prior authoritative decision: `Fail` (`Design Impact`), ARCH-REV-001
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Every prior finding was rechecked against the current design spec and the code.
  - New evidence AE-17 to AE-22 was re-verified: the AE-19 importer and test cases, root `index.html` being unreferenced, and the remaining gateway path/filter references all being covered.
  - No new blocking issue was found. Non-blocking notes N-1 to N-3 were recorded.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-016; design-spec Removal Plan (workspace row), step 6, Dependency Rules, Key Tradeoffs; AE-17 | Gateway removed from `pnpm-workspace.yaml`. The lockfile importer is refreshed away. `@whiskeysockets/baileys` is dropped from root `onlyBuiltDependencies` (declared only by the gateway), and `protobufjs` is correctly kept. BEH-107 map updated with AC-121. |
| AR-002 | Open (Medium-High) | Resolved | SR-016; Removal Plan rows AE-18/19/20; step 6; supplementary residue search; AE-18–AE-20 | All 7 items are planned with line references matching the code. The designer added `discordBindingIdentityValidation.ts` + spec (only importer: the binding store), binding cases in 3 server tests (verified), and the web README paragraph. Root `index.html` is confirmed stale and unreferenced. |
| AR-003 | Open (Medium) | Resolved | SR-016; "REQ-120 Verification Gate" | The allowed-hit set is exact, and each entry maps to an approved REQ-120 exception. The cleanup's unit test counts as part of the DEC-110 migration. AC-102/AC-103 become one-time probes with evidence in the ticket folder. AC-119 uses a generic metadata key plus a real-run probe. Tracked logs fall outside "source, config, docs". No exception is widened, so no user confirmation is needed. |
| AR-004 | Open (Low) | Resolved | SR-016; Removal Plan tickets row, step 6a; AE-21 | `git mv` to `tickets/done/` with `superseded.md`. This is consistent with the only existing conventions (`done/`, `in-progress/`) and does not touch the Out-of-Scope clause on existing done records. |
| AR-005 | Open (Low) | Resolved | SR-016; `investigation-notes.md`, `product-model-analysis.md`, `requirements.md` metadata | The token-preservation contradiction is replaced with REQ-114-consistent text. Statuses and the history inventory are corrected. Minor residual stale text is recorded as non-blocking N-1. |

- New or remaining finding IDs: None. Non-blocking notes: N-1 (minor stale investigation text; ASM-103 `Open`), N-2 (incidental `messaging` mentions to disposition), N-3 (validation-stage probe obligations).
- Material classification changes: `Design Impact` → `Pass`
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: unchanged accepted risks (the stale gateway Dockerfile/runtime script, release workflows untestable without a tag, irreversible approved deletion, gateway unvalidated).
