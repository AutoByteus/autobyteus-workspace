# Handoff Summary — code-quality-leftovers (autobyteus-357: ten code-quality leftovers, no behavior change)

## Ticket

- Package: `code-quality-leftovers`; Project Task `autobyteus-357`, merging autobyteus-54, 107, 124, 125, 135, 147, 157, 158, 159 and 178.
- Classification: `task_size=Large`, `architectural_risk=High`; route: reviewed. Architecture review ARCH-REV-002 Pass; source review CRR-001 (CR-001, CR-002) → IR-002 → CRR-002 Pass; API/E2E API-REV-001 Pass (95.3%); test-code review CRR-003 Pass (three baseline test fixes, each with its cause).
- Archived ticket folder: `tickets/done/code-quality-leftovers/` on `personal`

## The Ten Items (REQ-004)

| Item | Outcome | What was done, or why not | Evidence |
| --- | --- | --- | --- |
| **54** (54.1–54.4) | **Fixed** | 54.1: `BaseLLM.releaseConversation`, the summary port's bounded release step and its timeout removed. 54.2: `logicalConversationId` removed from both request builders and the provider deny-list; the tests and harnesses that read it recognise compaction requests from the request the model receives (DESIGN rule 11). 54.3: the always-`LLM` `modelKind` removed from dynamic sources, `DynamicModelSourceLifecycle.status` and GraphQL `ModelSourceStatus`. 54.4: the web settings' multi-kind source logic and `ModelKind` type removed; GraphQL types regenerated. | IMP-02/DEL-04 searches 0 hits; IMP-04/IMP-05 compaction suites; API-03 Settings on a real LM Studio host (READY, PARTIAL, READY again; Ollama ERROR; no `modelKind` in responses); API-04 a real local-model turn; DEL-01 `codegen:check` current |
| **107** | **Dropped** | Cosmetic: ~25 catalog-only "collaborator" type names across the delegation path; renaming them is large and gains nothing. | investigation-notes item 107 |
| **124** | **Dropped** (already done) | No code serves only sub-teams of Team runs any more (the web team config has no `agent_team` member kind; the hierarchy builds only root scopes). | investigation-notes item 124 |
| **125** (125.1–125.6) | **Fixed**, except 125.4 **dropped** | 125.1 `utils/application/applicationLaunch.ts` removed (no importer). 125.2 `getTeamAgentRunLocation`, the `team_agent_run` location type and `normalizeScope` removed. 125.3 an unused import removed (its frozen copy pruned by the frozen-layer script). 125.5 the unreachable Codex admission branch, its reason code, test case and the parameter only it read removed. 125.6 the unread `launchConfiguration` on the located standalone execution removed. 125.4: already gone (`ccd725cf80`). | IMP-02/DEL-04 searches; IMP-12 line counts; suites |
| **135** | **Moved out** → FU-001 | Task teams never hold task executions, but removing `TaskTeamExecution.taskExecutions` changes the public collaboration DTO across ~30 files: its own Task (DEC-003). | `follow-ups.md` FU-001 |
| **147** | **Fixed** | `ProjectTaskService` split: `ProjectTaskContextDrafts` (drafts and saved context files for the REST routes) and `TaskContextOwnership` (shared existence check and byte reclaim); `project-task-service.ts` 494 → 445 effective lines (target ≤ 470); `searchCleanup` formatted normally. | IMP-12; API-02 Projects probe 17/17 (REST context-file journey, context bytes after a real restart); DEL-07 |
| **157** | **Fixed** | Write-result outcomes renamed in current code to `not_committed` / `finalization_indeterminate`; frozen copies and sealed migrations keep the released names. | IMP-02/DEL-04 searches; persistence suites in API-01/DEL-05 |
| **158** | **Dropped** (already done) | `context-file-record-locators.ts` is already in the sealed migration area (autobyteus-280). | investigation-notes item 158 |
| **159** | **Fixed** | The two streaming docs' Team identity/stream sections brought to `autobyteus-team-stream-contracts`; short mentions corrected in five other docs. Listed, not rewritten: `autobyteus-server-ts/docs/features/task_agent_identity_future_improvements.md`, built on the removed `TeamExecutionAddress` / `agent_execution` identity (the Solution Designer's call). | AC-005 searches; `docs-sync-report.md` |
| **178** | **Fixed** | `drainRuntimeReleases`, `TaskExecutionResourceRelease.drain` and its `inFlight` tracking removed (DEC-001: roots already drain their own queues at shutdown); tests synchronise through a test helper. | IMP-02/DEL-04 searches; Task closure suites (IMP-14, API-01/DEL-05) |

Also: `DESIGN.md` rule 11, "tests follow the code and never hold it back", with the autobyteus-357 example (the user's direction; REQ-007).

## Contract Change

GraphQL `ModelSourceStatus.modelKind` is removed together with its only reader, this repository's web app, in one release (DESIGN rule 9). External GraphQL clients that selected it would get a validation error; none are known.

## Integration

- Checkpoint `8b58d9577b` (the reviewers' and the Solution Designer's uncommitted records), then merge of `origin/personal` `a96a871950` (27 commits: packaging dependencies (autobyteus-345), release guide notes and Grok smoke (autobyteus-355), Docker in-place update closure) as `a20c9f56d3`; no conflicts. The one file changed on both sides, `autobyteus-web/generated/graphql.ts`, auto-merged and is current with the server schema (`codegen:check`).
- The base changed `pnpm-lock.yaml`, a shared foundation, so every recorded case was rerun (TESTING.md Rule 4): see `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Verification

- Judged from the evidence; no user check needed. Every critical acceptance criterion (AC-001, 002, 004, 006) is directly proven and reproduced on the merged state. AC-006's live compaction scenario was not run: TESTING.md runs it only on the user's request, and AC-006's own fallback (typecheck plus the scripted suites) is met. The user can ask for that run.

## Release

- `No release`: the Task says "No release unless asked", and the user did not ask. The change ships with the next release.

## For The Solution Designer

- Follow-ups in `follow-ups.md`, none sent: FU-001 (item 135), FU-002 (the reload toast reports success on STALE_ERROR), FU-003 (terminal `ps` 500 ms deadline under load), FU-004 (rotted `RUN_LMSTUDIO_E2E` backend-factory suite), FU-005 (added at delivery: the folder-watcher unit test's fixed wait under load).
- Listed for your decision: `autobyteus-server-ts/docs/features/task_agent_identity_future_improvements.md` (stale).
- Residual risks: the `CompactionAttempts` test heuristic for future compaction-retry suites; the live compaction run (user request only).
