# API/E2E Execution Coverage Report

## Execution Round Meta

- API/E2E revision: `API-REV-006`
- Trigger: `/code_reviewer` `CRR-013`, after user-approved `SR-010` / `ARCH-REV-010` and documentation-only `IR-008`
- Scope: correct the proof oracle without weakening the real Brief Studio business join; complete ownership of the three pending API-REV-005 durable test edits
- Prior result: `API-REV-005 Fail / 96.4%` remains truthful history under the then-approved zero-shell oracle
- Worktree HEAD: `4994980aa7db1d56c1fd5fe31c32d0052329642e`
- Evidence root: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-006`
- Broader-validation decision: `Required and completed by current-oracle reclassification of integrity-verified, executable-identical real-browser evidence`
- Result: **Pass**
- Final validation confidence: **98.4%**

## Current Acceptance Boundary

`SR-010` corrects proof, not production behavior. `AC-032`–`AC-038` still require:

- the actual shipped `codex_app_server` / `gpt-5.6-luna` Brief Studio Team through the supported browser;
- one successful `get_brief_context({})` first per member, with exact call/result, application, binding, member, run, and brief identity;
- exact marker-first files at `brief-studio/research.md` and `brief-studio/final-brief.md` inside the actual member workspaces;
- exact relative publication, complete research handoff, no writer cross-member read, and verbatim research use;
- no mutation from the context read alone, followed by publication/reconciliation-caused same-brief `in_review` UI with two outputs and exactly one final.

Corrected `AC-039` accepts any already-authorized runtime foundation operation, including shell. Provider/normalized operation events are optional diagnostics and cannot decide acceptance. Missing, fabricated, out-of-workspace, unauthorized, unpublished, or causally unjoined output still fails. `AC-040`–`AC-044` remain unchanged.

## Coverage Decisions And Durable Changes

Round 6 made no new repository-resident test edit. The three pending Round 5 edits remain current and were executed:

1. `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`
   - deleted issuer/bearer fixture replaced by the explicit current tokenless run-session activator;
2. `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
   - current run identity/memory/batch/scoped-authority fixture and exact Luna diagnostic retained;
3. `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts`
   - stale “authenticated MCP” label corrected to current tokenless MCP.

The then-current three-file diff is byte-identical to API-REV-005: `157 insertions / 111 deletions`, SHA-256 `b6b0f95c538bec361a0fe512c477d4d94fb6a89ee84d8d4c80e950e7b0807438`. No production source, maintained Brief prompt/config/Team/launch file, or implementation-owned test changed in this round.

## Executed Checks

All selected commands ran from the assigned worktree. Vitest commands ran from `autobyteus-server-ts`.

| Check / execution mode | Result | Evidence |
| --- | --- | --- |
| `git diff --name-status d26ad181e..HEAD` with non-ticket exclusion, plus uncommitted production/maintained-input diff | **Pass:** no committed non-ticket executable delta; no uncommitted production or maintained-input delta | `current-state-no-executable-delta.log` |
| SHA-256 of researcher/writer role/config, Team, and launch source against API-REV-005 snapshot | **Pass:** all six identical; all maintained model-facing text remains operation-agnostic | `maintained-input-hash-verification.json` |
| API-REV-005 evidence-manifest verification | **Pass:** every retained file hash matches | `api-rev-005-evidence-integrity.log` |
| Frontend SDK/devkit build; Brief backend typecheck; Brief package build and validation | **Pass** | `brief-package-environment-build.log` |
| Exact three pending durable files after package setup | **Pass:** 2 files / 5 tests; optional Codex provider file compiled and 10 gated tests skipped by default | `pending-durable-tests-after-package-build.log` |
| Brief handler/prompt/source/package/MCP/import/reconciliation/publication collection | **Pass:** 10 files / 44 tests | `brief-package-publication-matrix.log` |
| Current-oracle synthesis over immutable real-browser evidence | **Pass:** all 27 authoritative checks and `AC-032`–`AC-044` true | `current-oracle-synthesis.log`; `current-oracle-identity-artifact-ui-join.json` |
| Current durable diff equality and `git diff --check` | **Pass** | `durable-diff-verification.log`; `git-diff-check.log` |

### Truthful Non-Product Execution Classifications

- `pnpm test -- --run ...` passed a literal separator to Vitest and unintentionally began broad discovery. API/E2E interrupted it. Its partial unrelated run-history failures are **Harness Command Error / Not Evidence**. The selected exact command uses `pnpm exec vitest --run ...`; evidence is retained in `misinvoked-broad-command.log` and its classification file.
- The first correctly filtered three-file run produced `4 passed / 10 skipped / 1 failed` because Round 5 cleanup had correctly removed generated `applications/brief-studio/dist/importable-package`. The MCP integration failed on its explicit precondition `fs.stat`, before application setup. After the documented build/validation, the same selected collection passed. This is **Environment Setup Required / Resolved**, not an implementation or coverage failure.

## Supported Browser Evidence Reclassification

### Why A Fresh External-Model Retry Was Not Required

API-REV-005 already executed the current latest-base production stack and exact shipped Codex/Luna Team from the supported Brief Studio browser. `IR-008` changes documentation only. Round 6 directly verifies:

- no executable file changed from `d26ad181e` through `4994980aa`;
- all maintained role/config/Team/launch files are byte-identical to the retained browser snapshot;
- every retained evidence hash matches;
- current package build/validation and durable business-contract suites pass.

A new model retry would run identical code and inputs while adding only external nondeterminism. `SR-010` explicitly permits reclassification or rerun; therefore a new, non-mutating oracle synthesis is the proportional higher-quality action. It preserves the API-REV-005 historical join/result and writes a distinct API-REV-006 join.

### Authoritative Real Journey Preserved

- Brief: `brief-6e01ee36-3707-416c-9270-9a8e9f8e8838`
- Binding: `e6aa7750-a3e7-4741-b468-8c8fef5a7b23`
- Team: `brief_studio_team_4c9fad8bea574281bf65a7c35cfad92a`
- Researcher: `brief_studio_researcher_e85b68996cc9463ea0208cb15548d71f`
- Writer: `brief_studio_writer_c9494bbaeecc49229efe7e52ac7f132e`
- Exact runtime/model: `codex_app_server` / `gpt-5.6-luna`

The new synthesis independently verifies:

- both members' first recorded tool call is exactly one paired successful `get_brief_context({})`;
- both retained files begin with the exact result-derived marker;
- both `publish_artifacts` inputs contain exactly their canonical relative path;
- those paths resolve to the exact launch workspaces and publication producers/revisions;
- the researcher Team message has the exact marker/path and complete body;
- the writer performs no `read_file` and contains the required complete research bullet verbatim;
- application/binding/member/run/publication identities join;
- the final same brief is `in_review`, and all ten semantic browser assertions remain true.

The researcher and writer each used one successful `run_bash` foundation call. That observation remains truthful in `diagnosticChecks` but is explicitly excluded from the acceptance decision. The pass comes from the real workspace artifacts, publications, handoff, identities, causality, and UI—not from changing the operation label or ignoring a business assertion.

## Requirement / Scenario Matrix

| Acceptance criterion | Result | Current evidence |
| --- | --- | --- |
| AC-032 researcher first call/result, marker, workspace artifact, relative publication, complete handoff | **Pass** | current-oracle join over raw trace/file/publication/message evidence |
| AC-033 writer first call/result, handoff-only research use, marker, workspace artifact, relative publication | **Pass** | current-oracle join over raw trace/file/publication evidence |
| AC-034 exact application/binding/member/run/call/revision join; no secret | **Pass** | Team tree, publications, app/platform evidence, integrity manifest |
| AC-035 supported same-brief `in_review`, two outputs, exactly one final | **Pass** | ten browser assertions and retained screenshot |
| AC-036 read-only call; publication/reconciliation causes state/UI change | **Pass** | before/final data and prior machine join, integrity-verified |
| AC-037 exact Codex/Luna and operation-agnostic maintained inputs | **Pass** | current hash and vocabulary verification |
| AC-038 exact complete handoff, verbatim use, member-workspace relative publication | **Pass** | current-oracle artifact/message/path checks |
| AC-039 any authorized foundation operation permitted; authoritative business join required | **Pass** | all 27 acceptance checks true; operation diagnostics excluded |
| AC-040–AC-044 tokenless activation, fresh restore, capability disposition, lane/session orthogonality, exact deactivation/shutdown | **Pass** | integrity-verified current 21-file/178-test matrix plus no-executable-delta verification |

## Validation Confidence Scorecard

| Category | Score | Evidence / residual |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Every corrected `AC-032`–`AC-044` assertion is true |
| Changed-boundary execution directness | 99% | Current oracle recomputed; executable and maintained-input equality verified |
| Cross-boundary integration realism and mock gap | 99% | Actual package/provider/worker/Team/publication/database/browser evidence; no substitute |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact shipped inputs and identities match; current package and durable tests pass |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Current lifecycle matrix plus explicit harness/environment classifications |
| User-surface, browser, and desktop-shell confidence | 99% | Ten semantic browser assertions and visual evidence; Electron-only behavior is not implicated |
| Durable regression coverage quality and relevance | 97% | Three current-contract edits pass; proportional review is the remaining process gate |

- Overall: `(99 + 99 + 99 + 98 + 98 + 99 + 97) / 7 = 98.4%` rounded.
- Clean-target status: met; no critical criterion is missing or failing and no category is below 90%.
- Final result: **Pass**.

## Cleanup And Routing

- Generated Brief, backend SDK, frontend SDK, devkit, and SDK-contract build outputs created for this round were removed after evidence capture.
- No browser or long-lived service was started in Round 6; the browser proof is the integrity-verified API-REV-005 supported journey.
- No production data, unrelated process, or unrelated generated output was touched.
- JSON output, evidence manifest, and `git diff --check` pass.
- Delivery remains paused after `DR-004` until `/code_reviewer` completes proportional review of the three-file durable diff.

Required next route: the complete cumulative package, this report, `API-REV-006`, and the then-current durable diff to `/code_reviewer`.
