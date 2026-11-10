# Handoff Summary

## Summary Meta

- Ticket: `agent-semantic-memory` (Project Task `autobyteus-12`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Date: `2026-11-10`
- Classification: `task_size: Large`, `architectural_risk: High`, route: independent architecture review (pass), source code review (CRR-001 Pass), API/E2E (API-REV-001 Pass, final confidence 95%), test-code review (CRR-002 Pass).
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/agent-semantic-memory`. Base `origin/personal` @ `f78b60ddd` at bootstrap. Integrated by merge at delivery: `origin/personal` @ `c60ebbb9f` (64 commits) → `82599d9ae`, no conflicts; post-integration checks pass (`evidence/DEL-post-integration/`).
- Product code: `785ff7c95` (server), `0fa12575c` (web, docs), `7e5f90d7f` (web test fixture); E2E suites `595990347`.

## Delivery Summary

- Delivered scope:
  - `semanticMemoryEnabled` in an agent's `agent-config.json` (key written only when on); for package and built-in agents a personal setting (`SEMANTIC_MEMORY`) with reset to the package's value.
  - `AgentSemanticMemory` owns one folder per agent definition: `<memory>/semantic/<encodeURIComponent(agentDefinitionId)>/`, created at run start, never deleted by the system, not listed by the Memory page, memory search or Memory Sync.
  - Every runtime (native AutoByteus, Codex, Claude, Antigravity, ACP/Grok/DeepSeek harness) adds the `## Semantic Memory` section after the Project section, for standalone runs, shared team members and delegated copies; agents without the setting get byte-identical instructions.
  - Write access: Codex adds the folder to the `workspace-write` sandbox's `writable_roots` (one merged `sandbox_workspace_write` object with the integration's `network_access`); Claude gets it as an additional directory.
  - GraphQL `semanticMemoryEnabled` (read/create/update) and read-only `semanticMemoryPath`; the agent form's switch and the detail card (en, zh-CN).
- Docs: by the implementation `GLOSSARY.md`, server module docs `agent_memory`, `agent_definition`, `prompt_engineering`, `personal_settings`, `codex_integration`, `credential_proxy`, `deepseek_harness_runtime`, design doc `collaboration_model`, web `agent_management`; at delivery `autobyteus-server-ts/docs/modules/agent_execution.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence (delivery's judgement; no user check needed). AC-001…AC-008 are directly proven; each critical criterion was opened in its evidence files (`release-deployment-report.md`, Verification).
- Key evidence:
  - `evidence/API-SM-deterministic/`: real server, scripted AGY; SM-04 prompt has the exact section and folder; SM-05 Project B, team member and delegated copy get the same folder; SM-03 no section and no folder without the setting; SM-07 off/on keeps the document; SM-10 the Memory page/search/sync do not list it.
  - `evidence/API-SML-{codex,claude,autobyteus,grok,agy}/`: real runtimes write `deploy-codeword.md` in the folder from Project A with no approval, and a Project B run answers the codeword. Codex control: a write elsewhere outside the workspace asks and is denied.
  - `evidence/IMP-08-ui-probe/`: screenshots of the form switch, the Personal mark and reset, the detail card, and zh-CN.
  - Integrated state: `evidence/DEL-post-integration/` (server unit 269 passed; deterministic semantic-memory E2E + collaboration prompt wording 20 passed; E2E node-credential guard 4 passed; web specs 15 passed; server typecheck PASS at baseline).
- Secret Gate PASS on the ticket commits and on the merged state; artifact hygiene PASS.

## Residual Risks For The User

- DeepSeek harness not run: `dsh` is not installed here and the test vault has no DeepSeek key. Per the design, with auto-execute off a write to the folder asks for a sandbox escalation (AC-002's documented alternate outcome, FU-007, evidence API-20). With auto-execute on, writes work.
- All runs were as root in a Linux arm64 container. The fresh-start Linux arm64 release build passed (API-FS); the macOS and x64 build jobs were not run locally.
- Claude treats the semantic memory folder as an additional working directory (accepted by the design).
- Concurrent runs writing the same document are not coordinated (DEC-006); there is no history or backup (FU-001).

## Follow-ups

- `follow-ups.md` FU-001..FU-012 (none added at delivery). The Solution Designer sends them.

## Release

- No release (the user did not ask; RELEASE.md's default). The change ships with the next beta or stable; `release-notes.md` holds user-facing notes for it.
