# API/E2E Coverage Investigation

## Investigation Meta and authority
Round 1; trigger Implementation Complete at `3baede153b55e2098bd8b68304d5a0440b25950a`. Assigned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt`. Canonical ticket directory: `tickets/in-progress/agent-work-request-prompt/`.
Read complete requirements-doc.md (approved R1), investigation-notes.md, design-spec.md, solution-revision-record.md (SR-001), solution-handoff.md, prior-investigation.md (historical evidence only), implementation-handoff.md and implementation-revision-record.md (IR-001). Architecture/source review reports and revision records, Product supplements, delivery record: N/A — not applicable. No prior API result. API-REV-001 will record baseline; canonical execution report and ledger are sibling `api-e2e-execution-coverage-report.md` and `api-e2e-test-case-ledger.md`.

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
| unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts | Needs Update | Existing real bootstrap with injected dependencies; add create/restore guidance assertions for Team, standalone and no context |
| unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts | Needs Update | Assert same paragraph in actual bootstrap-produced system prompt |
| integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts | Needs Update | Existing official SDK loopback case lists actual catalog; add description/content/selector schema assertions |
| integration/agent-execution/codex-thread-bootstrapper.integration.test.ts | Out Of Scope | Live skill discovery gated on RUN_CODEX_E2E; not necessary to prove text projection |
| integration/application-backend/brief-package-team-prompt.integration.test.ts | Out Of Scope | Requires built application bundle; application-specific instructions unchanged |
| integration/agent-execution/agent-run-prompt-fallback.integration.test.ts | Out Of Scope | Definition fallback and native lifecycle; composer/native tool matrix already directly covers changed wording |

## Durable coverage decisions
Add assertions/cases in the three Needs Update files above, before running them. Real bootstrap uses production composer, not mocked strings; MCP SDK crosses real HTTP/catalog/schema boundary. Preserve all existing assertions; remove/replace none. No temporary probe needed: gaps fit existing durable harnesses.

## Execution plan and ledger
Ledger required: multiple independently meaningful boundaries. C1 focused six-file unit regression; C2 Codex/Claude bootstrap projection (updated durable tests); C3 actual loopback MCP tool projection (updated integration test). C1 then C2 then C3; record each attempt before next case. Evidence logs and exact commands in `api-e2e-evidence/`.

## Confidence and broader-validation decision
Pending repository execution; no percentage or Pass inferred from implementation evidence. After C1/C2 assess mock gap before C3. Expected targeted additional evidence is real HTTP `tools/list`; browser/desktop would not improve backend prompt/schema evidence. Model adherence, incident causality, and existing running-session refresh are not tested or promised. No ambiguities or reroute triggers identified. Proceed: Yes; durable updates Yes.

## Repository execution and confidence gate (after C1/C2)
C1: Pass 55/55 across six files. C2: Pass 35/35 across two bootstrap files (includes three newly parameterized create/restore cases). Exact commands are retained in api-e2e-evidence/C1-command.sh and C2-command.sh; logs C1.log/C2.log. CWD worktree root. No failures/skips. Expected deliberately induced skills/list failure diagnostic belongs to a passing existing recovery test, not a validation failure.

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

## Broader execution and final investigation decision
C3 Pass: 9/9 tests, official SDK crossing owned loopback listener and actual MCP catalog. api-e2e-evidence/C3-command.sh and C3.log retain command and evidence. No durable removals, source changes, temporary executable probes, failed or blocked cases. Three test files updated as planned. Diff whitespace check passed. Final cross-boundary confidence increases from 90% to 95%; all other applicable categories remain 95%. Final average 95%. Required broader validation completed; no further broader work required for approved wording scope. Model adherence/original causality and retroactive refresh remain unverified, not treated as passed cases. No user app/data touched; listeners and test-owned temporary directories closed/deleted by fixtures. Worktree-owned test DB and prerequisite builds retained. Proceed to delivery: Yes, subject to rules.
