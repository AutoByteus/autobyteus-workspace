# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved by user; design spec in progress.
- Investigation Goal: Understand why self-evolution user messages include defensive/internal language and define whether/how to simplify the runtime-generated message.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Requires tracing prompt/message generation across runtime/self-evolution components and separating runtime task contract from durable policy instructions.
- Scope Summary: Analyze the self-evolution user message surface, identify redundant/internal wording, and propose clearer ownership for prompt content.
- Primary Questions To Resolve:
  - Where is `SelfEvolvementUserMessage` composed? Answer: `SelfEvolutionCompanionTriggerMessageBuilder.build()`.
  - Which content is runtime-specific data vs stable policy? Answer: paths/target ids are runtime-specific; edit/privacy/no-change behavior is stable policy.
  - Which instructions are redundant or better placed in agent/skill/system guidance? Answer: most numbered rules except dynamic roots/target id; the “semantically complete / backend protocol fields” rationale belongs in docs only.
  - What constraints must remain in the user message for safety and completion? Answer: exact evidence paths, editable roots, `SKILL.md` entry-file path, target id/message type, and concise per-request completion parameters.
  - Is `Primary guidance file` the right label for `SKILL.md`? Answer: no; `SKILL.md` is the skill package entry file/entrypoint, while referenced files inside the root may contain equally important guidance.

## Request Context

User supplied an example self-evolution user message containing work trace paths, editable skill package roots, rules, and a final `send_message_to` instruction. User objected that some text feels like internal/defensive noise, especially raw-trace prohibitions despite only curated trace files being listed, and explanations about hidden backend protocol fields.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis
- Current Branch: codex/self-evolution-message-noise-analysis
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-24
- Task Branch: codex/self-evolution-message-noise-analysis
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: Original checkout had unrelated untracked `.article-work/` and `docs/articles/`; dedicated worktree created from fresh origin/personal.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-24 | Command | `git fetch origin --prune` | Refresh base before dedicated worktree | Succeeded | No |
| 2026-06-24 | Command | `git worktree add -b codex/self-evolution-message-noise-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis origin/personal` | Create isolated task worktree | Succeeded | No |
| 2026-06-24 | Command | `rg -n "SelfEvolvementUserMessage|Self Improve requested|raw_traces|backend protocol|work_trace_active|editable skill|self-evolution|self_evolution|send_message_to exactly once|skill_update" -S .` | Locate message generation and related docs/tests | Found prompt string in `src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts`; docs and tests under `autobyteus-server-ts` | No |
| 2026-06-24 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Inspect exact runtime message owner | Builder emits all highlighted wording in one template literal; metadata also carries the same structured facts | Yes: update if approved |
| 2026-06-24 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | Check stable self-evolver instructions | Agent definition already owns generic edit scope, no off-root edits, no source/memory/config edits, privacy, no-change behavior, and final `skill_update` behavior; current `SKILL.md is the primary guidance file` wording is too strong because `SKILL.md` is the package entrypoint and may delegate to critical referenced files | Yes: maybe add explicit raw-trace read rule if runtime negative removed; change wording to entry-file semantics |
| 2026-06-24 | Doc | `autobyteus-server-ts/docs/modules/self_evolution.md` | Understand intended self-evolution prompt contract | Docs say work traces are self-evolver-facing, raw JSONL remains backend-internal, work traces are semantically complete, protocol fields are hidden, and trigger message currently instructs not to read raw trace files | Yes: docs may need update if prompt contract changes |
| 2026-06-24 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts` | Check runtime enforcement around final `skill_update` | Registers direct-message grant with allowed target id, message type, reference roots, max accepted deliveries, and expiry before posting trigger | No |
| 2026-06-24 | Code | `autobyteus-server-ts/src/agent-communication/services/direct-agent-run-message-grant-registry.ts` | Check service-level enforcement independent of prompt wording | Grant rejects wrong target, wrong message type, exhausted delivery, or reference files outside allowed roots | No |
| 2026-06-24 | Test | `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Identify durable tests around current message | Test asserts path-only trigger, paths, target id/message type, prior run ids, and absence of exact `raw_traces.jsonl` and inline `user:/worker:` content | Yes: update assertions for concise prompt and no internal-rationale wording |
| 2026-06-24 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent-config.json` | Check whether built-in Skill Self-Evolver currently uses configured skills | `skillNames` is currently empty | Yes: configure agent-private skill if chosen |
| 2026-06-24 | Code | `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Verify agent-private skill support | Resolver can load `agentDirPath/skills/<configuredName>` before global skills | Yes: built-in bootstrap must sync template skills into agent dir |
| 2026-06-24 | Code | `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Verify built-in template sync behavior | Bootstrapper currently copies only `agent.md` and `agent-config.json`, not `skills/` directories | Yes: update bootstrapper if built-in agent gets private skill |
| 2026-06-24 | Other | User approval in conversation | Confirm direction and ask to kick off ticket | User approved thin runtime prompt + retrospective coaching/private skill direction and requested detailed requirements/design including prompt/agent/skill content | No |
| 2026-06-24 | Code | `autobyteus-server-ts/src/file-explorer/directory-traversal.ts`, `src/file-explorer/traversal-ignore-strategy/default-ignore-strategy.ts`, `src/agent-tools/skills/get-skill-content.ts` | Check existing tree rendering/ignore behavior | Existing tree traversal can build trees and default ignore excludes common generated/dependency/binary-heavy paths; existing skill content tool serializes a tree but not bounded/annotated exactly for this prompt | Yes: design a self-evolution-specific bounded package tree renderer or reusable formatter |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: manual self-improvement start posts a user message to the companion agent.
- Current execution flow:
  1. `SelfEvolutionService.startFromEvolutionRequest()` resolves target, writable skills, work trace package, and companion session.
  2. `SelfEvolutionCompanionSessionService.postSelfImproveRequest()` registers a grant for one final direct `skill_update` message.
  3. `SelfEvolutionCompanionTriggerMessageBuilder.build()` creates an `AgentInputUserMessage` with human-readable content plus structured metadata.
  4. Companion receives the prompt as a user message.
- Ownership or boundary observations:
  - Runtime task packet owner: `SelfEvolutionCompanionTriggerMessageBuilder`.
  - Stable companion behavior owner: built-in Skill Self-Evolver `agent.md`, or preferably a thin `agent.md` plus agent-private self-evolver skill package.
  - Work-trace privacy/rationale owner: `docs/modules/self_evolution.md` plus work trace projection/redaction services.
  - Final notification enforcement owner: direct-agent-run message grant registry and global router.
- Current behavior summary: The runtime prompt is path-only and does not inline work trace body, but it duplicates stable agent policy and embeds internal rationale.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / Boundary Or Ownership Issue
- Refactor posture evidence summary: Small refactor/cleanup likely needed in prompt contract and tests, not in self-evolution lifecycle or storage.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User-provided example | Message mixes task payload, edit-scope rules, internal rationale, and completion tool call requirements | Prompt contract ownership is blurred | Yes |
| Trigger builder | One template literal owns all highlighted wording | Localized change point exists | Yes |
| Skill Self-Evolver `agent.md` | Stable generic rules are already present | Runtime message can be shorter; avoid duplicate policy | Maybe strengthen stable raw-trace read rule |
| Self-evolution docs | “Semantically complete” and “hidden backend protocol fields” are documented as implementation/rationale facts | This should not be repeated to the worker in every task | Update docs if wording changes |
| Direct-message grant | Code enforces final target/message/reference constraints | Prompt need not carry long defensive wording for those constraints | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Builds the self-evolution companion user message | Contains the exact noisy wording and dynamic fields in one template literal, including `Primary guidance file` label | Should render a concise task packet from structured sections and label `SKILL.md` as the skill entry file |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | Stable role and behavior instructions for the companion | Already covers task authority, edit scope, durable/no-change behavior, privacy, and final message behavior; should better frame the agent as a retrospective skill coach and call `SKILL.md` the entry file rather than the primary guidance file | Keep this thin if an agent-private self-evolver skill owns the detailed method/examples |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Product/module contract documentation | Explains work traces as curated backend-internal projection | Keep rationale here; do not surface it as user-message copy |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` | Converts raw memory trace events into readable work trace markdown | Emits user/worker/tool summaries, not raw trace JSONL envelopes | Supports positive wording: listed work traces are the evidence package |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts` | Redacts obvious secrets/backend fields from rendered content | Enforces a subset of the “backend fields hidden” claim | Rationale belongs in docs/tests, not prompt |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts` | Companion lifecycle and final-message grant setup | Registers exact grant before posting task | Prompt can state parameters concisely while code enforces grant |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Focused companion/session test | Verifies current path-only prompt shape | Needs prompt text assertions updated if changed |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-24 | Static source trace | `rg` + `sed` over self-evolution source/docs/tests | The supplied message maps exactly to builder line 13 | No runtime reproduction needed for analysis |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Language classification

| Current wording | Classification | Recommendation |
| --- | --- | --- |
| `Self Improve requested for the target worker.` | Task intent, but awkward wording | Use `Self-improvement requested for the target worker.` |
| `Read the provided self-evolution work trace files as needed` | Essential task direction | Keep, preferably as positive evidence section wording |
| `do not read raw_traces*.jsonl files` | Defensive negative / negative affordance | Remove from runtime prompt; if required, put stable read prohibition in `agent.md` |
| Work trace manifest/root/file paths | Dynamic runtime data | Keep |
| Prior evolver run ids | Dynamic continuity data | Keep when present, maybe clarify as optional context only |
| Editable skill packages/root/SKILL.md paths | Dynamic edit scope | Keep |
| `Use the work trace files as coaching evidence. They are semantically complete...` | Mixed task direction + docs rationale | Keep task direction; move rationale to docs only |
| `hide backend protocol fields` | Internal implementation rationale | Remove from runtime prompt |
| `You may inspect and edit files only inside...` | Dynamic guardrail, duplicated in agent.md | Keep concise dynamic form or rely on agent.md; recommended keep one concise line tied to listed roots |
| `Do not edit agent/team definitions...` | Stable policy, duplicated in agent.md | Remove from runtime prompt; keep in agent.md |
| `If no durable reusable improvement...` | Stable behavior, already in agent.md | Can remove or keep as one short task outcome line; recommended agent.md owns it |
| `Do not copy secrets...` | Stable privacy policy, already in agent.md partially | Keep in agent.md; remove from runtime prompt unless adding concise reminder is explicitly desired |
| Final `send_message_to` rule | Mixed dynamic parameters + stable behavior | Keep exact dynamic parameters; move generic prose to agent.md |

### Skill package label clarification

`SKILL.md` should not be called the `Primary guidance file` in the runtime task packet. In this codebase, skills can use `SKILL.md` as an entry file that routes the agent to references, templates, scripts, and supporting assets. For large skills such as solution-designer, the referenced design principles/templates/examples are part of the actual operational guidance. The best runtime shape is a bounded skill package index/tree: list the absolute root once, mark `SKILL.md` as the entry file, and show relative package contents. This gives the companion package awareness without implying `SKILL.md` is the only important guidance.

### Self-evolver role clarification

The companion should be framed as a retrospective skill-improvement coach, not merely a file editor. Its evidence is the target worker's work trace from using the skill: user messages, assistant responses, tool calls, tool results, corrections, retries, and user feedback. It should look for friction, inefficiency, repeated correction, missed reusable rules, brittle examples, unclear routing, tool-exploration paths that converged into a precise repeatable operation, and other durable skill-level improvements. It should update the skill package only when that retrospective evidence supports a reusable improvement.




### Thin agent.md plus private skill option

The better long-term shape is likely:

- `agent.md`: short identity, role, non-negotiable boundaries, and instruction to use the configured self-evolver skill.
- `skills/self-evolver-retrospective-coach/SKILL.md`: detailed retrospective coaching workflow, high-signal trace patterns, package-improvement method, examples, and no-change criteria.
- Supporting skill files: example library, package-structure checklist, SOP extraction checklist, or templates if the guidance becomes large.

This keeps the built-in agent definition readable while making the detailed coaching playbook reusable and maintainable as a normal skill package. The current platform supports agent-private skills through `agentDir/skills/<skill-name>` resolution, but the built-in bootstrapper currently syncs only `agent.md` and `agent-config.json`. Therefore implementation would need to add template skill directory syncing and set the built-in skill-evolver `agent-config.json` `skillNames` to the private skill name.

### High-signal evidence patterns for the coaching agent

The self-evolver should mine the work trace for signals such as:

- User feedback or corrections that teach a better future behavior.
- Repeated mistakes, failed attempts, or backtracking by the target worker.
- Tool exploration that eventually converges to a precise repeatable procedure, for example learning how to inspect a browser DOM and then operate a specific UI reliably.
- Places where the worker had to rediscover environment facts or operational steps that could become a reusable SOP.
- Missing examples, missing routing instructions, or ambiguous wording in the skill that caused the worker to choose the wrong approach.
- Cases where a one-off task detail should not be copied, but the underlying reusable procedure should be generalized.

### Comprehensive skill package improvement scope

Skill improvement should apply to the whole editable skill package, not only the current `SKILL.md` text. Valid improvements can include:

- rewriting guidance flow so the entry file routes naturally from task recognition to action;
- adding or improving SOPs, examples, checklists, troubleshooting notes, or reference files;
- splitting an oversized mixed file when separate responsibilities are clearer;
- merging or deleting over-fragmented files when many tiny files obscure the flow;
- improving file names and file responsibility boundaries;
- updating templates or scripts when those are part of the durable skill workflow;
- preserving concise entry guidance while moving detailed procedure into referenced files.

The coach should avoid blindly adding content. It should decide whether the package needs a small rule, a new SOP/reference, a structural reorganization, or no change.


### Demonstrative examples needed in agent instructions

The self-evolver `agent.md` should include short examples because this role requires judgment, not just rule following. Useful example categories:

1. **SOP extraction from exploration**
   - Trace signal: worker tries several browser/DOM approaches, eventually discovers a stable selector and operation sequence.
   - Durable update: add a generalized browser-operation SOP with the reliable inspection/action sequence.
   - Avoid: copying the exact private URL, one-off page data, or transient DOM values unless they are part of a durable public workflow.

2. **User correction becomes durable guidance**
   - Trace signal: user corrects the worker's interpretation or gives a future-facing rule.
   - Durable update: add or revise the relevant skill rule/example.
   - Avoid: treating ordinary task-specific preference as a universal rule without evidence.

3. **No-change decision**
   - Trace signal: task difficulty came from unique external data or a one-time constraint.
   - Durable outcome: explain why no reusable skill improvement is warranted.

4. **Package structure improvement**
   - Trace signal: worker repeatedly misses guidance because an entry file is too long, badly ordered, or points weakly to references.
   - Durable update: reorganize the package flow, split/merge files, rename reference files, or add a routing note in `SKILL.md`.

5. **Bad update example**
   - Trace signal: tool output contains private paths, raw trace internals, or exact task data.
   - Avoided update: do not paste those into the skill. Extract only the reusable operational pattern.

### Package tree rendering guidance

A package tree is better than only showing `SKILL.md`, but it should be bounded:

- Use relative paths under the absolute skill root so the prompt does not repeat long private paths on every line.
- Mark `SKILL.md` as `[entry]` rather than `primary`.
- Include ordinary guidance/source assets such as markdown, templates, scripts, examples, references, and small config files.
- Exclude hidden directories, caches, generated outputs, dependency folders, raw traces, and binary-heavy artifacts unless explicitly part of the skill package's durable guidance.
- Cap depth and/or total entries for large packages, then show an omitted-count note so the agent knows to inspect the filesystem if needed.

### Proposed concise target message shape

```text
Self-improvement requested for the target worker.

Use the listed work trace files as the evidence package.

Work trace manifest: <manifestPath>
Work trace root: <workTraceRootPath>
Work trace files:
1. <filePath>

Previous evolver run ids for continuity context: <ids>   # only when present

Editable skill packages:
1. <skillName>
   Root directory: <skillRootPath>
   Package tree:
   .
   ├── SKILL.md [entry]
   ├── references/
   │   └── ...
   └── templates/
       └── ...

Dynamic task constraints:
- Edit only inside the listed editable skill root directories.
- If you make meaningful durable skill package changes, send exactly one `skill_update` message to target AgentRun `<targetAgentRunId>` with `reference_files` limited to updated or directly relevant surviving files inside the editable roots.
- If no reusable skill improvement is warranted, make no file changes and explain why.
```

Alternative even shorter version: remove the `Dynamic task constraints` lines except final target id/message type, relying fully on `agent.md`; however, keeping these three bullets is a practical compromise because they bind the dynamic paths and target id to the task.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility issue: this is an internal prompt contract cleanup.
- The test suite currently guards against inlining work trace bodies and exact `raw_traces.jsonl`; the latter assertion is too narrow because current prompt still contains `raw_traces*.jsonl`.
- Grant enforcement means final notification safety does not depend solely on wording.

## Open Unknowns / Risks

- Need product decision on whether a stable raw-trace read prohibition should be added to `agent.md` before deleting the per-message negative.
- Need product decision on how short the runtime message should be: “minimal task packet” vs “task packet with 2-3 dynamic guardrails.”

## Notes For Architect Reviewer

Design should treat the runtime message as a task packet owner and the Skill Self-Evolver agent definition as the stable policy owner. Do not move dynamic paths/target ids into agent.md. Do not rely on prompt wording for final-message enforcement already owned by the direct-message grant.
