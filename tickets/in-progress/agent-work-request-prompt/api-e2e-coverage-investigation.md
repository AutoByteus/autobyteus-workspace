# API/E2E Coverage Investigation

## Investigation Meta and authority
Round 2; trigger IR-002 Implementation Complete at `8d8d6889c68239abb9e31082b655b7598055767a`. Assigned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt`. Canonical ticket directory: `tickets/in-progress/agent-work-request-prompt/`.
Read complete requirements-doc.md (approved R2), investigation-notes.md, design-spec.md, solution-revision-record.md (SR-001/SR-002), solution-handoff.md, prior-investigation.md (historical evidence only), implementation-handoff.md and implementation-revision-record.md (IR-001/IR-002). Architecture/source review reports and revision records and Product supplements: N/A — not applicable. Read DR-001 delivery-revision-record.md, docs-sync-report.md, handoff-summary.md and release-deployment-report.md: historical R1 candidate, no R2 approval inferred. Prior API-REV-001 Pass 95% covers R1 only. API-REV-002 will record current result; canonical execution report and ledger are sibling `api-e2e-execution-coverage-report.md` and `api-e2e-test-case-ledger.md`.

## Routing Classification
Small / Low; Direct Low-Risk. Successful route Delivery subject to rule lookup. Test review: Not Required — direct low-risk route.

## Requirement and changed-boundary basis
SC-001–004 / BE-001–004 / REQ-001–004 / AC-001–004: one approved conditional work-request paragraph precedes mechanics in Team/Org and standalone collaboration; own instructions/skills, no acknowledgements, intermediate handoff/blocker, requester fallback, aligned send_message_to descriptions. Preserve notification semantics, selectors, optional exposure, delegation and no-context exclusion. No additional or contrived scenarios. These acceptance criteria govern supplied guidance, not enforced model compliance.

| Boundary | Change | Coverage consequence |
| --- | --- | --- |
| Backend prompt composition | Added shared paragraph; changed Team no-rule guidance and heading | Composer matrix plus real bootstrap create/restore config capture |
| API/tool description contract | Changed descriptions only | Native schema assertions and real MCP client tools/list projection |
| Routing/lifecycle/exposure | Preserved | Parser, scope, exposure and bootstrap regressions |
| Persistence | Not Affected | No migration or historic content rewrite; implementation compatibility and persisted-data sections read and consistent with diff |
| UI/browser/desktop shell/auth/worker | Not changed | No UI/full-product journey required for generated backend text |
| Provider execution | Guidance consumed beyond deterministic boundary | Live adherence remains unverified; explicitly not an acceptance guarantee |

## Project execution discovery
Read root TESTING.md; no closer TESTING*.md exists; server AGENTS.md; server README.md Tests/development sections; package.json, vitest.config.ts, tests/setup/prisma-{env,global-setup,test-config}.ts. Vitest run --no-watch is documented; global setup resets only this worktree's `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`. Dependencies/shared dist and generated Prisma are present from implementation. No new secrets required. Use server CWD or pnpm -C from root. No user app, home data, external model or development stack will be used. MCP test starts its own loopback ephemeral port and closes it; fixtures clean owned temp roots. No guideline conflicts. Real-provider tests require preflight, but no live-provider claim is planned.

## Existing durable coverage validity
All paths below relative to autobyteus-server-ts/tests/.
| Path | Decision | Evidence/action |
| --- | --- | --- |
| unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts | Still Valid | Approved paragraph semantic/hash/docs assertions |
| unit/agent-execution/prompt/carpenter-prompt-composer.test.ts (+ snapshot) | Still Valid | Shared/native six-scope matrix, exact-once, order, no-context |
| unit/agent-tools/team-communication/send-message-to.test.ts | Still Valid | Native/MCP description and selector/schema assertions |
| unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts | Still Valid | Preserved address/run-ID parsing |
| unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts | Still Valid | Optional tools / automatic context exposure |
| unit/agent-collaboration/execution/member-instance-scope.test.ts | Still Valid | Team/Org/local ownership |
| unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts | Still Valid | Real bootstrap with injected dependencies; IR-002 updated create/restore expectation for exact R2 wording |
| unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts | Still Valid | Existing assertion checks current shared paragraph in bootstrap-produced system prompt |
| integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts | Still Valid | Existing official SDK loopback case asserts actual catalog description/content/selector schema |
| integration/agent-execution/codex-thread-bootstrapper.integration.test.ts | Out Of Scope | Live skill discovery gated on RUN_CODEX_E2E; not necessary to prove text projection |
| integration/application-backend/brief-package-team-prompt.integration.test.ts | Out Of Scope | Requires built application bundle; application-specific instructions unchanged |
| integration/agent-execution/agent-run-prompt-fallback.integration.test.ts | Out Of Scope | Definition fallback and native lifecycle; composer/native tool matrix already directly covers changed wording |

## Durable coverage decisions
No new API-owned test edits needed. IR-002 already updated exact full-paragraph expectation/hash, standalone snapshot and Codex bootstrap substring for R2. Reviewed the source/test/doc diff: only third production sentence changes. Existing composer, bootstrap, native schema and real-HTTP MCP tests remain valid. Reuse C1/C2/C3 and rerun independently; retain earlier logs as history. No removals, temporary probes or unresolved prior validation failures.

Exact required sentence: Use `send_message_to` only at a workflow-defined handoff point or when blocked and needing external input.

Instruction paths/configuration and TESTING.md remain unchanged since API-REV-001. Existing safe worktree-only setup applies. Delivery's eight-line docs addition and four untracked delivery artifacts are owned by Delivery and will not be edited/staged.

## Execution plan and ledger
Ledger required: multiple independently meaningful boundaries. C1 focused six-file unit regression; C2 Codex/Claude bootstrap projection (existing R2-aligned tests); C3 actual loopback MCP tool projection (existing integration test). C1 then C2 then C3; record each attempt before next case. Evidence logs in `api-e2e-evidence/api-rev-002/`; exact unchanged commands in `api-e2e-evidence/C1-command.sh`, C2-command.sh and C3-command.sh.

## Confidence and broader-validation decision
Pending repository execution; no percentage or Pass inferred from implementation evidence. After C1/C2 assess mock gap before C3. Expected targeted additional evidence is real HTTP `tools/list`; browser/desktop would not improve backend prompt/schema evidence. Model adherence, incident causality, and existing running-session refresh are not tested or promised. No ambiguities or reroute triggers identified. Proceed: Yes; new API-owned durable updates No.


## Repository execution and confidence gate (after C1/C2)
C1: Pass 55/55 across six files. C2: Pass 35/35 across two bootstrap files (includes three existing parameterized create/restore cases, now asserting R2). Exact commands are retained in api-e2e-evidence/C1-command.sh and C2-command.sh; current logs api-e2e-evidence/api-rev-002/C1.log and C2.log. CWD worktree root. No failures/skips. Expected deliberately induced skills/list failure diagnostic belongs to a passing existing recovery test, not a validation failure.

| Mandatory category | Post-repository score | Evidence / uncertainty / next evidence |
| --- | --- | --- |
| Requirement and AC proof | 95% | All wording ACs directly asserted; negligible content-path uncertainty |
| Changed-boundary execution directness | 95% | Real composers, native schema, Codex create/restore and Claude bootstrap output; provider is not invoked |
| Cross-boundary integration realism / mock gap | 90% | Bootstrap external services injected; actual MCP HTTP list still unexecuted; C3 closes serialization gap |
| Environment/configuration/identity/fixture fidelity | 95% | Real context models, isolated worktree DB and defined scopes; external provider fixtures deliberately substituted |
| Failure/edge/lifecycle/recovery | 95% | No-context exclusion, selector rejection, scope isolation, bootstrap restore and failure-path suite; no lifecycle source changed |
| User-surface/browser/desktop shell | N/A | Backend generated guidance only; no UI/shell changes |
| Durable regression relevance | 95% | Semantic exact-once and intermediate-handoff assertions plus real bootstrap; durable HTTP assertions pending |

Overall 94.17% = (95+95+90+95+95+95)/6; no category below 90%; critical wording ACs proven, but clean target not yet met. Broader validation Required: Other — existing durable integration test over real loopback HTTP with official MCP SDK (C3). Expected gain is catalog/schema projection evidence, not real-model behavior. Browser/desktop not required because it would not add direct proof of the changed backend strings. Provider adherence remains unverified and outside approved text-only guarantee. No reroute or setup blocker.


## Round 2 broader result and final decision
C3 Pass 9/9 with real HTTP/catalog/SDK; logs in api-e2e-evidence/api-rev-002/C3.log. All 99 tests / 9 files passed independently on R2. No skips/failures. Exact R2 paragraph assertion, shared/native scope matrix, Codex create/restore and Claude projection pass; MCP unchanged contract regression passes. Broader validation Required and completed; no further surface needed for this text-only scope. Final cross-boundary score 95%, other applicable categories 95%, overall 95%. No API-owned durable edits/removals, no source/docs edits or temporary probes. No legacy or persisted-data impact. Model adherence, original causality, and running-session refresh remain unverified. Owned sockets/fixtures cleaned by tests; worktree DB/build outputs retained. Delivery-owned artifacts/docs preserved. Current API-REV-002 supersedes API-REV-001 for this R2 candidate.
