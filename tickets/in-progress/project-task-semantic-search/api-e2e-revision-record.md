# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer pass handoff, `code-review-report.md` CRR-002; round 1 | SR-004, SR-006, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 87% (requirement proof 50%) |

## Revision Entries

### API-REV-001 — Baseline validation; the default model's relevance floor fails at 1,000-Task scale

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002, Pass), round 1.
- Triggering finding or case IDs: reviewer holds C-08 (LEAF-IR floor on a realistic backlog) and C-09 (`listTasks` per search at 1,000 Tasks); RSK-002, RSK-005/RSK-009; packaging smoke.
- Related revision IDs: SR-004, SR-006, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002.
- Why this baseline was recorded: first complete API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` (API-D01). No existing test changed or removed.
- Cases added, changed, removed, or rechecked: API-R01…R08, API-D01, API-L01…L05 (see the execution report's Cases).
- Commands, environment, fixture, or broader-validation delta: packaged macOS arm64 desktop build (isolated instance), Docker image built from the worktree (linux/arm64), 1,000-Task synthetic backlogs plus real product-domain text, all three catalog models at score level.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 87% overall (requirement and acceptance-criteria proof 50%).
- New or remaining failure IDs: F-001 (AC-004; AC-001 at 1,000-Task scale) with the default model LEAF-IR.
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` → Solution Designer.
- Remaining risks, blocked evidence, or untested scope: Windows/Linux/macOS x64 desktop packaging and Docker amd64 not built here (release workflow); two pre-existing agent-status WebSocket cadence integration cases fail independently of this change; observations O-1…O-4 in the report.
