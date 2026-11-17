# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-002, option A+, approved by the User on 2026-11-17 in the Solution Designer's conversation.
- Behavior-defining supplements: None
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/bundled-claude-code-514/tickets/in-progress/bundled-claude-code-514/investigation-notes.md`
- Authorities read (2026-11-17, this conversation): `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (rule 12 and the anti-pattern "A gate that reads a package's build output does not build it"), `RELEASE.md` (build-only release run).
- Conflicts or discrepancies: None.

## Current-State Read

- The packaged server is staged by three paths, all after `pnpm deploy … --legacy --prod`:
  - macOS/Linux desktop: `autobyteus-web/scripts/prepare-server.sh` (calls `node "$WEB_ROOT/scripts/onnxruntime-web-packaging.mjs" "$TARGET_DIR"` at line 318);
  - Windows desktop: `autobyteus-web/scripts/prepare-server.mjs` `stageRuntimeBundle()` (lines 489-513; flat `npm install` tree, imports `pruneOnnxruntimeWebDist`);
  - Docker server package: `autobyteus-server-ts/docker/Dockerfile.monorepo:55-65` (runs the same onnx module as a CLI).
- `pnpm` installs the SDK's platform package for the build host (`optionalDependencies`, 8 platforms). In a packaged macOS app it appears as `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280/` (208 MB) plus links `node_modules/.pnpm/node_modules/@anthropic-ai/claude-agent-sdk-darwin-arm64` and `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@…/node_modules/@anthropic-ai/claude-agent-sdk-darwin-arm64` (measured in `/Applications/AutoByteus.app`).
- The SDK looks for that package only when no `pathToClaudeCodeExecutable` is passed (`sdk.mjs`: `let Ov=u.pathToClaudeCodeExecutable; if(!Ov){ … XW(…) … throw "Native CLI binary … not found" }`). AutoByteus always passes one: `resolveClaudeCodeExecutablePath()` returns an override, the `which claude` result, or the string `claude` (`claude-sdk-executable-path.ts:85-94`), at both call sites (`claude-sdk-client.ts:320`, `claude-sdk-control-query.ts:44`).
- BEH-005: the packaged copy is unused, and on macOS it cannot run (probes P5–P7).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one new packaging module (with its test) following the existing onnxruntime pruning module, three one-line call sites (sh, mjs, Dockerfile); no server or web runtime code changes.
- Architectural risk: `Low`
- Risk rationale: removes files nothing loads (SDK lookup is skipped when a path is passed, which every call site does); no contract, persistence, security or runtime-path change. The build-step change is covered by the release guide's build-only run (DESIGN.md rule 12).
- Escalation trigger: if any packaged build needs the SDK's bundled binary (e.g. a call path found that omits `pathToClaudeCodeExecutable`), or the build-only release run fails on a platform for a reason tied to this change, return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported |
| --- | --- | --- | --- |
| SDK code | `@anthropic-ai/claude-agent-sdk/sdk.mjs` (`XW`, `if(!Ov)`) | lookup only without a path; returns null when absent | removal is safe |
| Resolver | `claude-sdk-executable-path.ts:85-94` | always returns a path string | removal is safe |
| Packaged layout | `/Applications/AutoByteus.app/Contents/Resources/server/node_modules/.pnpm/…` | one folder + two links | prune both forms |
| Existing pattern | `autobyteus-web/scripts/onnxruntime-web-packaging.mjs`, its three callers | one module, CLI + export | reuse the pattern |
| Probes | `evidence/probes-2026-11-17.md` | packaged copy broken on macOS; 208 MB | motivation |

## Intended Change

Every packaged server (desktop on all platforms, Docker server package) is staged without the Agent SDK's platform binary packages; the SDK package itself stays.

## Change Scope (Mandatory)

- In scope: UC of REQ-002/REQ-003; areas: the server-staging step of desktop packaging and of the Docker server package.
- Derived consumers: macOS signing (`build/scripts/macSign.ts` discovers Mach-O files; it will simply find one fewer — no change); `verify-macos-signing-policy.mjs` (no reference to the binary — no change); `verify-packaged-server-startup.mjs` (still starts the server — run it).
- Deliberately left alone: the server's Claude resolver and runtime card (REQ-001: unchanged); the development checkout's `node_modules` (live tests may use Anthropic's copy there); the Docker runtime image's global `@anthropic-ai/claude-code` install.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing | Change / Preserved | Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-005 | Operational | REQ-002, AC-001 | Desktop / Docker packaging | unused binary shipped | removed | DS-001 |
| BEH-001 | System | REQ-001, REQ-003, AC-002, AC-003 | Claude run, catalog, availability | installed program | preserved | unchanged |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship |
| --- | --- | --- |
| `evidence/probes-2026-11-17.md` | why the copy is dead weight | motivation, not behaviour |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `No` (the bundled copy is a side effect of the SDK's optional dependencies).
- Structural triggers: *Capability-area reuse* (4) → reuse the packaging-prune pattern of `onnxruntime-web-packaging.mjs` with a sibling module; *Repeated coordination* (13) → one prune function called by all three staging paths, not three copies of the rule (the sh and Dockerfile paths call it as a CLI, the mjs path imports it). Ruled out: persisted data, contracts, empty indirection (a function with its own rule and check).
- Deliberate deviations: None.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`.
- Evidence / response: as above.

## Terminology

- `SDK platform binary package`: `@anthropic-ai/claude-agent-sdk-<platform>-<arch>[-musl]`, the optional package holding Anthropic's Claude Code program. Not the SDK package `@anthropic-ai/claude-agent-sdk`.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the packaged copies of the SDK platform binary packages.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected` — build output only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-005 | `pnpm deploy` stage (or Windows npm stage) | packaged server without platform binaries | `claude-agent-sdk-binary-packaging.mjs` | the only change |

## Primary Execution Spine(s)

`prepare-server.sh | prepare-server.mjs | Dockerfile.monorepo -> pnpm deploy (npm install on Windows) -> pruneClaudeAgentSdkBinaries(stage) -> (existing) onnx prune, checks, signing -> packaged app / server package`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | After the server's dependencies are staged, the prune removes every SDK platform binary package (folder and links) under the stage's `node_modules`, fails if the SDK package itself is missing, and reports the size removed; the rest of staging runs as today | the new module |

## Spine Actors / Main-Line Nodes

The three staging scripts (callers) and the prune module.

## Ownership Map

- `autobyteus-web/scripts/claude-agent-sdk-binary-packaging.mjs` (new): owns which packages are removed and the check that the SDK package remains.
- The three staging scripts own when it runs (beside the onnx prune).

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| Packaged `@anthropic-ai/claude-agent-sdk-<platform>` packages | never loaded (path always passed); broken on macOS | nothing | development `node_modules` keeps them |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

N/A.

## Ownership Boundaries

The prune only touches the stage directory it is given; never the workspace `node_modules`.

## Boundary Encapsulation Map

N/A.

## Dependency Rules

Staging scripts → the prune module. The module depends on Node built-ins only. No process-wide state.

## Interface Boundary Mapping

| Interface | Responsibility | Notes |
| --- | --- | --- |
| `export async function pruneClaudeAgentSdkBinaries(stageDir): Promise<number>` | remove every entry named `claude-agent-sdk-<platform…>` inside an `@anthropic-ai` scope folder at any depth of `stageDir/node_modules` (folders and links, pnpm and flat npm layouts), and every `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-<platform…>@*` folder; throw if `@anthropic-ai/claude-agent-sdk` cannot be found under `stageDir/node_modules` afterwards; return bytes removed | match platform packages with `/^claude-agent-sdk-(darwin|linux|win32|android)-/` and `/^@anthropic-ai\+claude-agent-sdk-(darwin|linux|win32|android)-/`, so the SDK's own `.pnpm` folder (`@anthropic-ai+claude-agent-sdk@…`) is never matched; do not follow links when sizing or walking |
| CLI: `node claude-agent-sdk-binary-packaging.mjs <stageDir>` | same, prints MB removed | for the sh and Dockerfile callers |

## Interface Boundary Check

| Interface | Singular | Identity explicit | Risk | Action |
| --- | --- | --- | --- | --- |
| prune | Yes | Yes (stage dir) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | OK |
| --- | --- | --- |
| module | `claude-agent-sdk-binary-packaging.mjs` (sibling of `onnxruntime-web-packaging.mjs`) | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| prune a dependency in all staging paths | `onnxruntime-web-packaging.mjs` pattern | Reuse pattern, new sibling module | different package and rule; folding both into one file would mix two concerns |

## Subsystem / Capability-Area Allocation

`autobyteus-web/scripts` (desktop packaging scripts, already used by the Dockerfile).

## Draft / Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/scripts/claude-agent-sdk-binary-packaging.mjs` | Add | prune + CLI (header comment: why it is safe — the server always passes `pathToClaudeCodeExecutable`; cite autobyteus-514) |
| `autobyteus-web/scripts/__tests__/claude-agent-sdk-binary-packaging.spec.*` (follow the folder's existing test style) | Add | fixture trees: pnpm layout (folder + both links) and flat npm layout (Windows); asserts platform packages gone, SDK package kept, missing SDK throws, bytes returned |
| `autobyteus-web/scripts/prepare-server.sh` | Modify | call the CLI next to the onnx prune |
| `autobyteus-web/scripts/prepare-server.mjs` | Modify | import and call it in `stageRuntimeBundle()` after `installPortableRuntimeDependencies()` |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Modify | `&& node /app/autobyteus-web/scripts/claude-agent-sdk-binary-packaging.mjs /out/server-package` after the onnx line; update the comment block above |
| docs: the desktop packaging doc that describes `prepare-server` / onnx pruning (implementation finds it; e.g. `autobyteus-web/docs/…`) | Modify | one line |

## Reusable Owned Structures Check / Shared Structure Tightness

N/A — no shared types.

## Applied Patterns

The existing packaging-prune module pattern (export + CLI).

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

| Path | Depth | Clear | Risk |
| --- | --- | --- | --- |
| `autobyteus-web/scripts/` | packaging scripts | Yes | Low |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Matching | removes `.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280/` and links `…/@anthropic-ai/claude-agent-sdk-darwin-arm64`; keeps `.pnpm/@anthropic-ai+claude-agent-sdk@0.3.280_…/` and `@anthropic-ai/claude-agent-sdk` | a glob like `claude-agent-sdk*` (would delete the SDK) |
| Mechanism | prune after staging | `pnpm deploy --no-optional` (drops every optional dependency, e.g. other native prebuilds); `ignoredOptionalDependencies` in the workspace (would also remove the development copy that live tests use) |

## Backward-Compatibility Rejection Log

| Candidate | Decision | Note |
| --- | --- | --- |
| Keep the binary as a fallback | Rejected (option A+ chosen; B was not) | — |

## Change / Refactor Sequence

1. Module + test. 2. Wire the three callers. 3. Local macOS arm64 build (`pnpm -C autobyteus-web build:electron:mac -- --arm64`, unsigned is fine): inspect the app, run `verify-packaged-server-startup.mjs`; on an isolated instance of that build run one Claude turn and load the Claude model list (AC-002, AC-003). 4. `pnpm deploy` stage for Linux/Docker shape: run the CLI, inspect. 5. Build-only release run for all five desktop targets (`pnpm release:test --ref codex/bundled-claude-code-514`, RELEASE.md) and check AC-001 in each artifact; optionally the Docker build.

## Key Tradeoffs

- No bundled fallback: a user without Claude Code installed sees "not available", as today (chosen with A+).

## Risks

- A future SDK that resolves its binary even with a path passed would fail at runtime — the error is explicit ("Native CLI binary … not found"); the SDK upgrade checks catch it.

## Guidance For Implementation

- Reproduction to start from: inspect `/Applications/AutoByteus.app/Contents/Resources/server/node_modules/.pnpm/` (the platform package is there today); after the change the built app has none.
- Do not touch the workspace `node_modules`; the prune takes the stage directory only.
- Measure and report the size removed per platform.
