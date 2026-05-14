# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/design-spec.md`
- Current Review Round: 2
- Trigger: Round 2 architecture review after `solution_designer` updated the design for DR-001.
- Prior Review Round Reviewed: Round 1 in this same report path.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read the updated requirements/investigation/design package, rechecked Round 1 finding DR-001, and spot-checked the current parser-state/tool code surfaces named by the finding: terminal tools, run-bash XML usage formatters, `tool-syntax-registry.ts`, `custom-xml-tag-run-bash-parsing-state.ts`, `xml-run-bash-tool-parsing-state.ts`, and associated test areas.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | 1 | Fail | No | DR-001 found: legacy `run_bash background` parser metadata cleanup was under-specified. |
| 2 | Updated design after DR-001 | DR-001 | 0 | Pass | Yes | DR-001 is resolved; design is ready for implementation. |

## Reviewed Design Spec

The updated design remains architecturally sound. It cleanly separates stateless agent command execution from interactive PTY terminal sessions, introduces `ShellCommandExecutor` as the authoritative foreground command-execution owner, rebuilds `BackgroundProcessManager` around PID-keyed process-spawn/adoption lifecycle, preserves server/web PTY terminal ownership, and rejects legacy compatibility surfaces.

Round 2 specifically closes the prior parser-metadata gap by naming the parser-state files that must delete all `run_bash background` recognition. The design now forbids a background-specific compatibility branch, alias, or parse-and-ignore fallback; if generic XML parsing tolerates unknown attributes, `background` has no semantic effect and must not emit metadata or tool arguments.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies Bug Fix + Refactor + Behavior Change posture. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary Or Ownership Issue is supported by direct repros showing PTY heredoc corruption while direct/non-PTY and chunked PTY paths preserve bytes. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now and rejects chunked PTY / PTY fallback for agent command execution. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership map, decommission plan, dependency rules, migration sequence, and tests all reflect the refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | DR-001 | Major | Resolved | Updated design now includes removal/decommission row for parser-state extraction, final file responsibilities for `custom-xml-tag-run-bash-parsing-state.ts` and `xml-run-bash-tool-parsing-state.ts`, boundary/dependency/backward-compat entries, stale XML examples, migration steps, implementation guidance, and named tests. | No `background` recognition remains in the parser states; generic unknown-attribute tolerance is not a compatibility path and must not produce public metadata or tool args. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Foreground `run_bash` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Background process lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Server/web interactive terminal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Background output return flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Foreground shell adoption scan | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Terminal tool public facades | Pass | Pass | Pass | Pass | Public wrappers stay thin and no longer own process/session lifecycle. |
| Agent command execution | Pass | Pass | Pass | Pass | New non-PTY owner is justified by evidence. |
| Background process management | Pass | Pass | Pass | Pass | Rebuild/extend existing manager around PID-keyed process-spawn ownership. |
| Interactive terminal sessions | Pass | Pass | Pass | Pass | Server/web PTY use case remains separate and valid. |
| Tool usage formatting/parser metadata | Pass | Pass | Pass | Pass | Round 2 now includes parser-state extraction cleanup, formatter/schema updates, adapter guard, and tests. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Background process metadata | Pass | Pass | Pass | Pass | Public PID-only shape removes parallel identity. |
| Shell invocation selection | Pass | Pass | Pass | Pass | `NonInteractiveShellResolver` avoids shell/platform policy duplication. |
| Process probing/kill | Pass | Pass | Pass | Pass | `ProcessGroupObserver` isolates platform process-tree details. |
| Background manager retrieval from context | Pass | Pass | Pass | Pass | Centralized retrieval under background manager/facade area is appropriate. |
| Run-bash parser metadata cleanup | Pass | Pass | Pass | Pass | Existing parser-state files remain the owner; extraction is modified in place rather than bypassed downstream. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TerminalResult.backgroundProcesses` | Pass | Pass | Pass | N/A | Pass | PID-keyed records only. |
| `BackgroundProcessInfo` | Pass | Pass | Pass | N/A | Pass | `pid`, `status`, `command`, `startedAt`, `effectiveCwd`; no public `processId`/`processGroupId`. |
| `BackgroundProcessOutput` | Pass | Pass | Pass | N/A | Pass | Query result is PID-based. |
| Internal background record | Pass | Pass | Pass | Pass | Pass | Process group/session details are hidden internal cleanup metadata. |
| Parser segment metadata for `run_bash` | Pass | Pass | Pass | N/A | Pass | Supported metadata remains; legacy `background` is removed at extraction sites. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent `run_bash` dependency on `TerminalSessionManager` | Pass | Pass | Pass | Pass | Replaced by `ShellCommandExecutor`. |
| Session-backed background manager implementation | Pass | Pass | Pass | Pass | Replaced by PID-keyed process-spawn manager. |
| Synthetic ids / `processId` / `process_id` | Pass | Pass | Pass | Pass | Public identity becomes `pid` only. |
| Public `run_bash background` schema/usage parameter | Pass | Pass | Pass | Pass | Remove from public tool schema, examples, docs, and parser metadata. |
| `run_bash background` parser metadata extraction | Pass | Pass | Pass | Pass | Round 2 names both parser-state files and requires deletion of all background-specific recognition. |
| Docs claiming stateful `run_bash` | Pass | Pass | Pass | Pass | Update docs to stateless run-bash and separate server terminal. |
| Agent-command PTY fallback branch | Pass | Pass | Pass | Pass | No PTY fallback in agent command path. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts` | Pass | Pass | Pass | Pass | Foreground execution, timeout, capture, adoption sequence. |
| `autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.ts` | Pass | Pass | Pass | Pass | Platform shell invocation. |
| `autobyteus-ts/src/tools/terminal/command-execution/process-group-observer.ts` | Pass | Pass | Pass | Pass | Platform process-tree probing/stop details. |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | Pass | Pass | Pass | Pass | PID registry/output/status/stop lifecycle owner. |
| `autobyteus-ts/src/tools/terminal/types.ts` | Pass | Pass | Pass | Pass | Tight public result/type owner. |
| Terminal tool facades under `autobyteus-ts/src/tools/terminal/tools/` | Pass | Pass | Pass | Pass | Public schemas/cwd validation/delegation only. |
| `autobyteus-ts/src/tools/register-tools.ts` | Pass | Pass | N/A | Pass | Register new `get_background_processes` and updated tools. |
| Usage formatter files | Pass | Pass | N/A | Pass | Remove `background` guidance; teach bash-native background commands. |
| `autobyteus-ts/src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts` | Pass | Pass | N/A | Pass | Round 2 now assigns removal of `background` attribute extraction. |
| `autobyteus-ts/src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts` | Pass | Pass | N/A | Pass | Round 2 now assigns removal of opening-attribute and `<arg name="background">` extraction. |
| `autobyteus-ts/src/agent/streaming/adapters/tool-syntax-registry.ts` | Pass | Pass | N/A | Pass | Final guard: no residual `metadata.background` mapping into args. |
| `autobyteus-ts/docs/terminal_tools.md` | Pass | Pass | N/A | Pass | Durable docs update is named. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ShellCommandExecutor` | Pass | Pass | Pass | Pass | No terminal-session/PTX dependency. |
| `BackgroundProcessManager` | Pass | Pass | Pass | Pass | Tools do not call `ps`/`kill` directly. |
| `NonInteractiveShellResolver` | Pass | Pass | Pass | Pass | Platform shell policy remains isolated. |
| Server terminal streaming service | Pass | Pass | Pass | Pass | No global default-session change. |
| Streaming run-bash parser states | Pass | Pass | Pass | Pass | Legacy `background` must be removed at extraction sites, not normalized as a supported metadata path. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent command execution | Pass | Pass | Pass | Pass | `run_bash` -> `ShellCommandExecutor`. |
| Background process lifecycle | Pass | Pass | Pass | Pass | Public PID only; process groups hidden. |
| Interactive terminal sessions | Pass | Pass | Pass | Pass | Server/web PTY remains authoritative for xterm sessions. |
| XML/parser metadata surface for `run_bash` | Pass | Pass | Pass | Pass | DR-001 resolved by parser-state cleanup and explicit rejection of parser legacy branches. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `runBash(context, command, cwd?, timeoutSeconds?)` | Pass | Pass | Pass | Low | Pass |
| `ShellCommandExecutor.execute(command, options)` | Pass | Pass | Pass | Low | Pass |
| `BackgroundProcessManager.startCommand(command, cwd)` | Pass | Pass | Pass | Low | Pass |
| `BackgroundProcessManager.adoptObservedProcesses(...)` | Pass | Pass | Pass | Medium | Pass |
| `BackgroundProcessManager.listProcesses()` | Pass | Pass | Pass | Low | Pass |
| `BackgroundProcessManager.getOutput(pid, lines?)` | Pass | Pass | Pass | Low | Pass |
| `BackgroundProcessManager.stopProcess(pid)` | Pass | Pass | Pass | Low | Pass |
| `get_background_processes` tool | Pass | Pass | Pass | Low | Pass |
| `get_process_output` tool | Pass | Pass | Pass | Low | Pass |
| `stop_background_process` tool | Pass | Pass | Pass | Low | Pass |
| XML parser run-bash metadata | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/tools/terminal/tools` | Pass | Pass | Low | Pass | Public tool wrappers. |
| `src/tools/terminal/command-execution` | Pass | Pass | Low | Pass | New command lifecycle owner. |
| `src/tools/terminal` root | Pass | Pass | Medium | Pass | Mixed existing area remains acceptable with explicit file boundaries. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Pass | Pass | Low | Pass | Separate interactive terminal owner. |
| `src/agent/streaming/parser/states/*run-bash*` | Pass | Pass | Low | Pass | Existing parser-state files are the correct place to remove legacy metadata extraction. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool registration/schemas | Pass | Pass | N/A | Pass | Reuse. |
| Output buffers | Pass | Pass | N/A | Pass | Reuse. |
| WSL utilities | Pass | Pass | N/A | Pass | Reuse/extend. |
| Interactive PTY sessions | Pass | Pass | N/A | Pass | Reuse only for server/session APIs. |
| Stateless command execution | Pass | Pass | Pass | Pass | New owner justified. |
| PID-keyed background registry | Pass | Pass | N/A | Pass | Extend/rebuild existing manager. |
| Run-bash parser metadata cleanup | Pass | Pass | N/A | Pass | Reuse/modify existing parser-state files. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Agent `run_bash` PTY foreground path | No in target | Pass | Pass | Removed from agent command path. |
| Session-backed background manager | No in target | Pass | Pass | Rebuilt around PID/process-spawn ownership. |
| Synthetic ids / `processId` / `process_id` | No in target | Pass | Pass | PID-only public identity. |
| `run_bash background` schema/formatter/adapter mapping | No in target | Pass | Pass | Removed from public schemas/examples/args. |
| `run_bash background` parser metadata extraction | No in target | Pass | Pass | Round 2 explicitly rejects parse-and-ignore-later as compatibility retention; extraction is removed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared types | Pass | Pass | Pass | Pass |
| Non-PTY command internals | Pass | Pass | Pass | Pass |
| Background manager rewrite | Pass | Pass | Pass | Pass |
| Public terminal tools | Pass | Pass | Pass | Pass |
| Parser/usage/schema docs | Pass | Pass | Pass | Pass |
| Regression tests | Pass | Pass | Pass | Pass |
| Obsolete imports/code paths | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Bash-native background command | Yes | Pass | Pass | Pass | Clear good/avoid examples. |
| PID-only identity | Yes | Pass | Pass | Pass | Clear. |
| Non-PTY foreground execution | Yes | Pass | Pass | Pass | Clear. |
| Server terminal separation | Yes | Pass | Pass | Pass | Clear. |
| Legacy parser metadata cleanup | Yes | Pass | Pass | Pass | Round 2 adds examples showing unsupported `background` syntax has no semantic effect and parser legacy branches are forbidden. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact background adoption event handling (`exit` vs `close`) | Background children may keep inherited stdout/stderr pipes open; implementation should not block adoption waiting for process `close` when ordinary `&` survivors remain. | Implementation should test shell-exit-based adoption and bounded output capture. | Non-blocking implementation risk; design already says adoption occurs after shell exits. |
| Cross-platform process-group details | macOS/Linux/Android/WSL differ. | Keep in `ProcessGroupObserver`; validate platform command construction and at least local-platform lifecycle behavior. | Non-blocking residual risk already captured. |
| Daemonized/escaped processes | `setsid`, double-fork, or supervisors may escape ordinary process-group observation. | Document as out of ordinary bash background scope; do not parse shell syntax to guess intent. | Non-blocking residual risk already captured. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no unresolved findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Process-group scanning and stop behavior are platform-sensitive; keep the observer/resolver boundaries tight and validate local behavior.
- Bash-native background commands that redirect output to files may produce little captured output; this is expected and should be documented/test-aligned.
- Deliberately daemonized commands may not be adoptable; the in-scope guarantee remains ordinary bash background jobs left in the spawned shell's observable process group.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 resolves DR-001. The implementation package may proceed with the updated design, including parser-state removal of legacy `run_bash background` metadata.
