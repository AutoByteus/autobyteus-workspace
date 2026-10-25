# Delivery Revision Record — agent-tool-results-omit-empty (autobyteus-260)

`task_size`: Large · `architectural_risk`: High · route: reviewed (architecture review, code review, API/E2E, test-code review).

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Code reviewer delivery handoff (CRR-005 Pass, API-REV-002 Pass) | N/A | Blocked: Local Fix to implementation | `delivery-revision-record.md`, `follow-ups.md` (FU-008), `evidence/DEL-01-…` |

## Revision Entries

### DR-001 — Integration refresh exposes a new tool outside the one result rule

- Delivery round and trigger: first delivery round, from the code reviewer's handoff (source review CRR-004 Pass, API/E2E API-REV-002 Pass at 95%, test-code review CRR-005 Pass).
- Triggering upstream report, verification, or evidence: `code-review-report.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-review-report.md`.
- Prior authoritative result: N/A.
- Current authoritative result: **Blocked — Local Fix**, recipient implementation engineer.
- Docs sync report: not started (the skill blocks docs sync until the integrated state passes its checks).
- Handoff summary: not started.
- Release/publication/deployment report: not started.
- Integration and post-integration verification:
  - Checkpoint commit `269dbc209f`: the Solution Designer's SR-012 edits (`docs/design-cases.md` Case 8 and the ticket's design/review/solution records) and the code reviewer's `code-review-report.md`, `code-review-revision-record.md` and `api-e2e-test-review-report.md`.
  - Merge commit `54cd6803f4`: `origin/personal@63a36d00d8` (34 new commits: autobyteus-296 and autobyteus-303, and beta `v1.5.9-beta.7`) merged into the ticket branch. One conflict, in `GLOSSARY.md`; both sections kept (Project Tasks and Agent Runtimes).
  - Post-integration check (`evidence/DEL-01-integrated-architecture-and-agent-tools-unit.log`):
    `npx vitest run tests/architecture tests/unit/agent-tools tests/unit/startup tests/unit/available-agent-runtimes`
    → 3 failed / 537 passed.
    - `agent-tool-result-boundaries.test.ts`, 2 failures. **This ticket's rule (AC-002).** autobyteus-303 added `list_available_agent_runtimes` on `personal` after this ticket's base, and it serializes its result itself:
      - `src/agent-tools/agent-runtimes/list-available-agent-runtimes-tool.ts:30`: `return JSON.stringify(report);`
      - `src/agent-tools/mcp/providers/list-available-agent-runtimes-mcp-adapter-provider.ts:27`: `JSON.stringify(report)` and a `structuredContent:` literal.

      The integrated state therefore has a platform tool outside the one result rule, so the merge changed effective behavior.
    - `application-framework-boundaries.test.ts`, 1 failure. Already on `personal` (both files are identical to `origin/personal`); not this ticket's. Recorded as FU-008.
- Verification and finalization state: Verify From Evidence is not yet judged; it is done on the fixed integrated state. Nothing has been pushed or finalized.
- Release decision: **the user asked for a new beta "if everything is fine"** (2026-10-25). Once the fix passes and the evidence is verified, cut the next beta with `scripts/desktop-release.sh beta`. This is the user's decision; do not ask again.
- Terminal return to the Solution Designer: Not yet eligible.
- Why recorded: the integration refresh's check failed. The release guide and delivery rules block docs sync, finalization and release until it passes.
- Next recipient/action: implementation engineer.
  - Move `list_available_agent_runtimes` (native tool and MCP adapter) onto `toToolResultJson` / `toAgentToolsMcpStructuredJsonResult`, as for every other platform tool.
  - Update its tests if the result text changes (for example empty fields now omitted).
  - Rerun the boundary test and the agent-runtimes suites on branch `codex/agent-tool-results-omit-empty`, starting from `54cd6803f4`.
  - Then delivery resumes. If the result shape of `list_available_agent_runtimes` changes, API/E2E or the code reviewer may need a proportionate look, as the team's route decides.
- Remaining blockers, rollback concerns, or untested scope:
  - Release note to carry: rolling back after the title migration is not supported (design spec, Migration Plan).
  - REQ-012 agents repo (`codex/agent-tool-results-omit-empty` @ `82b7bae`) is still to be finalized.
