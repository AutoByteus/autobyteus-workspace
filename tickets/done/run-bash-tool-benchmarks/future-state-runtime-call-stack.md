# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/run-bash-tool-benchmarks/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/done/run-bash-tool-benchmarks/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001` through `DS-004`
  - Ownership sections: terminal tools, file tools, API tool-call adapters, benchmark harnesses

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | terminal tools | Requirement | R-001, R-002, R-003 | N/A | Nested-directory `run_bash` execution with stable cwd reporting | Yes/Yes/Yes |
| UC-002 | DS-002, DS-004 | Primary End-to-End | file tools | Requirement | R-004, R-005, R-006, R-007 | N/A | Patch-first file editing with exact-text fallback | Yes/Yes/Yes |
| UC-003 | DS-003 | Primary End-to-End | benchmark harnesses | Design-Risk | R-007, R-008 | Measure whether final-result success remains acceptable and why residual failures occur | Yes/N/A/Yes |

## Transition Notes

- No legacy compatibility path is modeled in the future-state flow. The future-state model assumes `edit_file` is patch-only and the new edit primitives are additive peers.

## Use Case: UC-001 Nested-directory `run_bash` execution with stable cwd reporting

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `run_bash`
- Why This Use Case Matters To This Spine: it proves that cwd certainty is solved at the tool contract rather than in model memory
- Why This Spine Span Is Long Enough: it starts at the model-visible schema and ends at the tool result the model uses for recovery

### Goal

Run commands for one target directory without relying on prior `cd` state and confirm the effective working directory in the result.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(...)
├── autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(...) [ASYNC]
│   ├── autobyteus-ts/src/tools/terminal/tools/run-bash.ts:resolveExecutionCwd(...) [STATE]
│   ├── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:ensureStarted(...) [ASYNC]
│   └── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:executeCommand(...) [IO]
└── autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(...) # returns stdout/stderr/exit state plus effectiveCwd
```

### Branching / Fallback Paths

```text
[FALLBACK] background execution
autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(...)
└── autobyteus-ts/src/tools/terminal/background-process-manager.ts:startProcess(...) [ASYNC]
```

```text
[ERROR] invalid cwd or missing directory
autobyteus-ts/src/tools/terminal/tools/run-bash.ts:resolveExecutionCwd(...)
└── autobyteus-ts/src/tools/terminal/tools/run-bash.ts:ensureDirectoryExists(...) [IO]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Patch-first file editing with exact-text fallback

### Spine Context

- Spine ID(s): `DS-002`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: file tools
- Why This Use Case Matters To This Spine: it captures the full recovery loop from reading a file through fallback editing and final validation
- Why This Spine Span Is Long Enough: it starts at the prompt-facing tool family and reaches the on-disk result the benchmark validates

### Goal

Allow the agent to start with a surgical patch edit, then recover with exact replacement or insertion when patch context is too brittle.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(...)
├── autobyteus-ts/src/tools/file/read-file.ts:readFile(...) [IO]
├── autobyteus-ts/src/tools/file/edit-file.ts:editFile(...) [ASYNC]
│   ├── autobyteus-ts/src/tools/file/workspace-path-utils.ts:resolveAbsolutePath(...) [STATE]
│   ├── autobyteus-ts/src/utils/diff-utils.ts:applyUnifiedDiff(...) [STATE]
│   └── fs.writeFile(...) [IO]
└── autobyteus-ts/src/tools/file/read-file.ts:readFile(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] patch context mismatch or exact text is easier
autobyteus-ts/src/tools/file/replace-in-file.ts:replaceInFile(...)
└── autobyteus-ts/src/tools/file/text-edit-utils.ts:replaceExactBlock(...) [STATE]
```

```text
[FALLBACK] insertion near a stable anchor
autobyteus-ts/src/tools/file/insert-in-file.ts:insertInFile(...)
└── autobyteus-ts/src/tools/file/text-edit-utils.ts:insertRelativeToAnchor(...) [STATE]
```

```text
[ERROR] exact block or anchor not found
autobyteus-ts/src/tools/file/text-edit-utils.ts:replaceExactBlock(...)
autobyteus-ts/src/tools/file/text-edit-utils.ts:insertRelativeToAnchor(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Benchmark-driven residual-failure diagnosis

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: benchmark harnesses
- Why This Use Case Matters To This Spine: it proves the branch with realistic scenarios and preserves actionable residual failure data
- Why This Spine Span Is Long Enough: it starts from scenario setup and ends at summarized validation evidence used for ticket closure

### Goal

Run realistic scenario suites and record both aggregate rates and the reasons the remaining misses still happen.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts:runScenario(...)
├── autobyteus-ts/src/agent/factory/agent-factory.ts:createAgent(...) [STATE]
├── autobyteus-ts/src/agent/message/agent-input-user-message.ts:AgentInputUserMessage(...) [STATE]
├── autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(...) [ASYNC]
├── autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts:validate(...) [IO]
└── autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts:logs diagnostic failure reasons(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] scenario completes with wrong final content
autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts:summarizeDifference(...) [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
