# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001 (user decisions DEC-001…003; the rest within the direction, user informed), with `icon-inventory.md`
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/tickets/in-progress/web-ui-cleanup-round/investigation-notes.md`
- Authorities read (2026-10-28): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `GLOSSARY.md`, `TESTING.md`
- Conflicts or discrepancies: none

## Current-State Read

The current state of each item is in the investigation notes (E-01…E-07). Each item has an existing owner: the page components, the voice input component, the notice builder and the pickers. The only cross-cutting change is the runtime names: three maps in two codebases (E-03) become one list in a contract package both read.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 25 web files for the icon removals (markup only), about 8 web files and 5 server files plus one new contract file for the names, and one or two files each for items 3–6, with their tests. Many files, but each change is local within existing owners.
- Architectural risk: `Low`
- Risk rationale: presentation only. The names change in text, not in runtime kinds, and the contract-package addition is an additive constant and function. There is no API shape, persistence, security, concurrency or deployment change. Agent-facing prose changes from short to full names (no parser reads them).
- Escalation trigger: if a runtime name is found to be parsed by code or stored, or the icon removal changes layout beyond the icon (for example an icon-only control in group B), return a Design Impact.

## Intended Change

Six independent local changes (one per item). Item 2 adds one shared list and removes three local maps.

## Change Scope (Mandatory)

- In scope: UC-001…UC-006; files per item below.
- Derived consumers (item 2): every caller of `runtimeKindToLabel`, `runtimeShortLabel`, `runtimeName` (web) and `agentRuntimeDisplayName` / `RUNTIME_NAMES` (server) switches to the shared function (E-03 lists them). Runtime kinds are unchanged.
- Deliberately left alone:
  - group C icons;
  - icons that were visible before beta 15;
  - model and provider names (for example `GROK_BUILD_PROVIDER_NAME`, the Antigravity provider label);
  - the rest of autobyteus-312.
- Follow-ups: none found.

## Per-Item Design

### Item 1: icons (REQ-001, REQ-002)
- Remove each group A/B `<Icon>` in `icon-inventory.md`. Where the icon's only container is a decorative wrapper (ToolCard's tinted box, VoiceInputExtensionCard's round badge), remove the wrapper too, and keep the text's alignment.
- Remove the `empty-icon` prop of `ToolList` and its value in `ToolsManagementWorkspace` (dead after #27/#28, Principle 7). Remove `ToolCard`'s `icon` computed and the `Icon` imports left unused.
- Keep group C exactly.
- Tests: the existing component tests that assert removed icons change. Add a sidebar test that asserts no icon in the menu items and that the Back arrow remains.

### Item 2: runtime names (REQ-003, REQ-004)
- Add `autobyteus-agent-presentation-contracts/src/agent-runtime-names.ts`:
  - `AGENT_RUNTIME_NAMES`, a frozen record: autobyteus → "AutoByteus", codex_app_server → "Codex App Server", claude_agent_sdk → "Claude Agent SDK", antigravity_cli → "Antigravity CLI", grok_build → "Grok Build";
  - `agentRuntimeName(runtimeKind: string): string`, which returns the known name, or else the kind as given;
  - export both from `index.ts`, with a contract test.
- Server:
  - replace `RUNTIME_NAMES` and `agentRuntimeDisplayName` in `available-agent-runtimes-service.ts` with `agentRuntimeName`, removing the local map (also its use at `:245`);
  - switch the callers (`model-routing-sessions.ts:120`, `model-router.ts:51`, `launch-usability-check.ts:174`, and any other found by grep);
  - update the tests that assert short names.
- Web:
  - remove `AGENT_RUNTIME_KIND_LABELS`/`runtimeKindToLabel` (`types/agent/AgentRunConfig.ts`), `RUNTIME_SHORT_LABELS`/`runtimeShortLabel` (`utils/chat/chatDefaults.ts`) and `RUNTIME_NAMES`/`runtimeName` (`agentRuntimesPresentation.ts`);
  - callers use `agentRuntimeName`;
  - where a caller relied on `runtimeKindToLabel`'s empty-kind default ("AutoByteus") or on title-casing an unknown kind, keep that behavior explicitly at that caller only if the caller can receive such a value, and say so in the implementation handoff; otherwise the shared fallback applies.
- `GLOSSARY.md`: add an "Agent runtimes" section with the five names and their kinds.
- Build note: the contract package's `dist` must be rebuilt for web and server to see the new export (the package build, or `test:integration:prepare`).

### Item 3: one "Waiting…" (REQ-005, REQ-006)
- `ProjectIndexesCard.vue:57`: always `t('settings.search.projects.state.waiting')`. Remove the `waitingModel` key in en and zh-CN. Set the `waiting` text to "Waiting…" / "等待中…". Remove `modelReady` if nothing else uses it.
- Update `EmbeddingSettingsPanel.spec.ts:147`, and test both model states.
- REQ-006: the Solution Designer asks the Product Team to record it in `autobyteus-web-design` (DEC-005); delivery links the record.

### Item 4: literal paths (REQ-007)
- In `skill-update-notice-builder.ts`, wrap each changed-file path and `change.skillDir` in an inline code span through one helper, `inlineCode(text)`. The helper uses a backtick run one longer than the longest run inside the text, and pads with spaces when the text starts or ends with a backtick (CommonMark).
- Tests:
  - builder: `references/__init__.py`, `notes/*draft*.md`, and a path with a backtick;
  - web card: renders them literally.

### Item 5: Depends-on Enter (REQ-008)
- `TaskDependencyPicker.vue:117`: add `{ immediate: true }`, as in `TaskPartOfPicker.vue:123`.
- Regression test: options loaded before mount, with the newest option a loop Task; Enter chooses the first choosable one. It fails on base.

### Item 6: voice input in Memory search (REQ-009)
- Use the existing `VoiceInputButton`:
  - `source` gets a new value `'memory-search'` in `types/voiceInput.ts:2`;
  - `compact`, placed inside the search box at its right end (the input gets right padding), like the chat input's button;
  - `:disabled="!store.searchReady"`;
  - its visibility is the component's own (hidden when voice input is not available).
- Target: a `VoiceTranscriptTarget` in `MemorySearchPanel.vue`, built the way `useProjectTaskDraft.ts:32-33` builds one:
  - its key is unique;
  - `isCurrent` is true while the panel is mounted;
  - `appendTranscript` sets `queryInput` to `mergeTranscriptWithDraft(queryInput, transcript)`;
  - the operation is cancelled on unmount (the button already does this).
  - No submit on transcript.
- Status line: move `components/projects/ProjectVoiceStatus.vue` to `components/voiceInput/VoiceTargetStatus.vue`, since it is the shared status for a voice target. Move its texts from `projects.ui.voice*` to `voiceInput.status.*` in en and zh-CN. Use it in the project editor, the task composer and Memory search (below the form). This gives one status component, not a copy.
- Tests:
  - Memory search: button shown when available, hidden when not; disabled when search is not ready; a transcript merges into the box and does not search;
  - the moved status component's existing tests follow it.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` / `Bug Fix` / small feature
- Current design issue found: `Yes` (item 2: three maps for one fact; item 6: a voice status component placed under `projects/` but shared)
- Structural triggers: *Derived data* (a runtime's name is worked out in four places), which gets one owner. *Vocabulary drift* (three names per runtime), resolved with one name and a glossary entry. Others do not fire.
- Root cause classification: `Duplicated Policy Or Coordination` (names), `File Placement Or Responsibility Drift` (voice status)
- Refactor needed now: `Yes`, small (both above)
- Intentional deferrals: none

## Legacy Removal Policy (Mandatory)

- Removed:
  - the three web name maps and their functions, and the server map and function;
  - the `waitingModel` key;
  - `ToolList`'s `emptyIcon` prop;
  - the unused `Icon` imports.
- Compatibility wrappers kept: `None`. In particular, no alias of `runtimeKindToLabel` re-exporting the new function.

## Persisted Data / State Transition Decision

- `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-003 | A runtime kind in any view or server text | A displayed name | `agentRuntimeName` (contract package) |
| DS-002 | Primary | BEH-007 | Mic button in Memory search | Transcript in the search box | `voiceInputStore` with the panel's target |

Other items are local renders with no spine beyond their component.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By |
| --- | --- | --- |
| `runtimeKindToLabel`, `runtimeShortLabel`, `runtimeName` (web), `agentRuntimeDisplayName`/`RUNTIME_NAMES` (server) | Duplicate maps | `agentRuntimeName` |
| `settings.search.projects.state.waitingModel` | One state | `…state.waiting` |
| `ToolList` `emptyIcon` prop; `ToolCard` `icon` computed | Their icons removed | — |
| `components/projects/ProjectVoiceStatus.vue` (moved), `projects.ui.voice*` keys | Shared by three places | `components/voiceInput/VoiceTargetStatus.vue`, `voiceInput.status.*` |

## Dependency Rules

`autobyteus-web` and `autobyteus-server-ts` → `@autobyteus/agent-presentation-contracts` (existing). `components/memory` → `components/voiceInput` (shared).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `agentRuntimeName(runtimeKind)` | runtime | display name | runtime kind string |

## Concrete Examples / Shape Guidance

```ts
// autobyteus-agent-presentation-contracts/src/agent-runtime-names.ts
export const AGENT_RUNTIME_NAMES = Object.freeze({
  autobyteus: "AutoByteus",
  codex_app_server: "Codex App Server",
  claude_agent_sdk: "Claude Agent SDK",
  antigravity_cli: "Antigravity CLI",
  grok_build: "Grok Build",
} as const);
/** The runtime's name everywhere in the app and in texts to agents; an unknown kind is shown as given. */
export const agentRuntimeName = (runtimeKind: string): string =>
  (AGENT_RUNTIME_NAMES as Record<string, string>)[runtimeKind] ?? runtimeKind;
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the old name functions as aliases | Rejected |

## Change / Refactor Sequence

1. Item 1 (the user's first priority).
2. Item 2: contract file and build, then server callers and tests, then web callers and tests, then the glossary.
3. Items 3, 4, 5.
4. Item 6, including the status component move.
5. Run the web tests (`test:nuxt`), the web guards (localization boundary and literal audits for the moved keys), server unit tests for the changed areas, the contract package tests, and the server typecheck.

## Key Tradeoffs

- Longer runtime names in tight spots, a user decision (R-01).

## Risks

- R-01, R-02 (investigation notes).

## Guidance For Implementation

- Reproduction to start from: the regression tests for AC-009 (builder) and AC-010 (picker) fail on base. The rest are UI changes verified by tests and a look in the app.
- AC-002 and AC-011 need a look in the app (API/E2E); voice input needs the voice extension enabled in a test instance.
