# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `ARCH-REV-001` | Round 1 / initial architecture review | `SR-001` | N/A | Fail — Design Impact | `AR-001`, `AR-002`, `AR-003` |
| `ARCH-REV-002` | Round 2 / `SR-002` re-review | `SR-002` | Fail — Design Impact | Fail — Design Impact | `AR-001`, `AR-002`, `AR-003` |
| `ARCH-REV-003` | Round 3 / user-approved automatic-team-tool clarification | `SR-003` | Fail — Design Impact | Pass | `AR-001`, `AR-002`, `AR-003` |
| `ARCH-REV-004` | Round 4 / `SR-004` re-review after code review reroute | `SR-004` | Pass, then downstream `CRR-001` Fail — Design Impact | Pass | `CR-001`, `CR-002` |

## Revision Entries

### ARCH-REV-001 — Initial carpenter-model architecture review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`
- Review round and trigger: Round 1, solution-designer handoff of user-approved `SR-001`.
- Triggering role, report path, and finding IDs: `solution_designer`; no prior review report; new findings `AR-001`, `AR-002`, `AR-003`.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: Established the first authoritative architecture-review result. The approved behavior and most of the shared composition/removal design are coherent, but Codex MCP-session failure cleanup is not concretely owned, the native final-placeholder invariant is placed before terminal Skills content, and two supplemental evidence statements are stale.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `AR-001`, `AR-002`, `AR-003`
- Material classification changes: N/A — initial baseline.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: No approval ambiguity. `MP-001` and `MP-002` are reachable; the required corrections are bounded. Claude create/resume symmetry and fence-aware heading behavior remain downstream validation risks already addressed by the design.

### ARCH-REV-002 — Exact-session and final-payload corrections re-reviewed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`
- Review round and trigger: Round 2, solution-designer re-review handoff for `SR-002`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`; `AR-001`, `AR-002`, `AR-003`.
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: `SR-002` resolves final native provider-payload ownership and both stale supplemental statements. It also resolves the original orphaned Codex MCP-session identity by carrying the exact session ID to a singular revoker. Re-review found that the proposed factory full cleanup still overlaps the existing `CodexThreadManager.startThread` client release on the same failure path, so `AR-001` remains open in narrowed form.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `AR-001` | Open | Remaining — narrowed | `SR-002`, `ARCH-REV-002`, `MP-001`, `MP-003` | Exact MCP session identity/cleanup is now concrete, but factory full cleanup calls cwd-based client release after `startThread` already balances the failed acquisition; with another same-workspace run this consumes its reference. |
| `AR-002` | Open | Resolved | `SR-002`, `ARCH-REV-002`, `MP-002` | `DS-005`, `SystemPromptProcessingStep` ownership, target mapping, failure behavior, and placeholder-shaped skill coverage now operate after terminal Skills and before state/LLM mutation. |
| `AR-003` | Open | Resolved | `SR-002`, `ARCH-REV-002` | The system-skill ownership table now assigns the approved fixed practices to Bash/File system-prompt sections, and the Classroom fixture records authored-body rewriting as an external follow-up. |

- New or remaining finding IDs: `AR-001`
- Material classification changes: `AR-001` remains `Design Impact`/Major but is narrowed from missing exact-session ownership to overlapping cleanup ownership across the MCP lease and ref-counted Codex client. `AR-002` and `AR-003` are resolved.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: No requirement ambiguity. `MP-003` is reachable through supported concurrent same-workspace Codex runs and the existing start-failure path. Claude create/resume symmetry and fence-aware headings remain downstream verification risks already covered by the design.

### ARCH-REV-003 — Context-owned prompt and automatic team-tool design passed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`
- Review round and trigger: Round 3, solution-designer re-review handoff for user-approved `SR-003`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`; remaining `AR-001` and the approved behavior clarification affecting `BEH-003`, `BEH-004`, `BEH-011`, and `BEH-012`.
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The user-approved revision makes validated team context independently govern fixed Team Runtime prose and the exact two automatic provider-native collaboration tools. Prompt composition no longer consumes tool names or descriptors. A renamed shared runtime-exposure boundary supplies one deduplicated request to native, Codex, and Claude while existing MCP/client lifecycle remains unchanged. The superseded cleanup mechanism behind `AR-001` and `MP-003` is absent.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `AR-001` | Remaining — narrowed | Obsolete / resolved by target replacement | `SR-003`, `ARCH-REV-003`, `MP-003` | The descriptor-before-prompt prerequisite, added Codex session lease, factory full-cleanup call, and client double-release path are all prohibited in the current design. `MP-003` is `Not Reachable` under the target. |
| `AR-002` | Resolved | Resolved | `SR-002`, `SR-003`, `ARCH-REV-002`, `ARCH-REV-003` | Post-Skills validation remains owned by `SystemPromptProcessingStep` before state/LLM mutation with the placeholder-shaped metadata case. |
| `AR-003` | Resolved | Resolved | `SR-002`, `SR-003`, `ARCH-REV-002`, `ARCH-REV-003` | Corrected supplement ownership and out-of-scope wording remain intact and coherent with the approved package. |

- New or remaining finding IDs: None.
- Material classification changes: Overall decision changes from `Fail — Design Impact` to `Pass`. `AR-001` is obsolete rather than mechanically “fixed” because its finding-driving target machinery was removed by an approved behavior/design replacement.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: No blocking uncertainty. Implementation must preserve exact automatic-tool deduplication across all three provider projections, keep MCP/client lifecycle untouched, preserve Claude create/resume system-prompt symmetry, and verify fence-aware headings plus native final-payload rejection.

### ARCH-REV-004 — Core native removal and fence correction passed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`
- Review round and trigger: Round 4, solution-designer re-review handoff for `SR-004` after code review `CRR-001` returned one design-impact finding and one bounded local defect from the first implementation pass.
- Triggering role, report path, and finding IDs: `code_reviewer` via `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-report.md`; `CR-001`, `CR-002`, and `CR-MP-001`.
- Relevant solution revision IDs: `SR-004` (retaining approved `SR-003` behavior)
- Prior authoritative decision: Architecture `Pass` at `ARCH-REV-003`; downstream source review `Fail — Design Impact` at `CRR-001`.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-004` extends the clean removal boundary through the public core runtime. `AgentConfig` loses processor defaults/injection/copy state; the generic pipeline, processor abstractions, registry/registration, exports, tests, and usages are removed; one focused platform-owned Skills appender is called directly by the singular final native step. It also defines a legal active-fence close separately from opening recognition and carries the reachable parser case into focused coverage.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-001` | Open — Design Impact | Resolved in design | `CRR-001`, `SR-004`, `ARCH-REV-004` | The current design names every omitted `AgentConfig` field/constructor/copy path, `SystemPromptPipeline`, processor base/definition/registry/default/registration/barrel/root export, obsolete tests/usages, positional caller updates, replacement owner, and repository-wide absence search; no alias or compatibility slot remains. |
| `CR-002` | Open — Local Fix | Resolved in design / pending implementation evidence | `CRR-001`, `CR-MP-001`, `SR-004`, `MP-004`, `ARCH-REV-004` | The design separates opening from active-close recognition, requires same marker and sufficient run length followed only by spaces/tabs, preserves same-marker content, and specifies info-string/backtick/tilde/longer-close/overflow tests. |
| `AR-001` | Obsolete / resolved by target replacement | Unchanged | `SR-003`, `SR-004`, `ARCH-REV-003`, `ARCH-REV-004` | Prompt composition remains descriptor-independent and existing MCP/client lifecycle remains unchanged. |
| `AR-002` | Resolved | Resolved under the closed direct owner | `SR-002`, `SR-004`, `ARCH-REV-004` | `SystemPromptProcessingStep` directly appends configured Skills, validates the complete payload before state/LLM mutation, and requires a real configured-skill failure case rather than injected processor coverage. |
| `AR-003` | Resolved | Resolved | `SR-002`, `SR-004`, `ARCH-REV-004` | Supplemental ownership and external follow-up statements remain coherent; exact prompt wording is unchanged. |

- New or remaining finding IDs: None.
- Material classification changes: The source-review `Design Impact` is resolved at the design layer. `CR-MP-001` is retained as architecture premise `MP-004` with `Reachable` status; it justifies only the bounded fence correction.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: No blocking design uncertainty. Implementation must update every positional `AgentConfig` caller, prove the retired public/core names absent, implement the exact fence close rule, and return through source review before API/E2E. Existing Claude create/resume symmetry and unchanged MCP/client lifecycle remain downstream verification obligations.
