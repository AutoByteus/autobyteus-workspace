# Investigation Notes

Use one canonical file:
- `tickets/done/skill-prompt-absolute-paths/investigation-notes.md`

Purpose:
- capture durable investigation evidence in enough detail that later stages can reuse the work without repeating the same major searches unless facts have changed
- keep the artifact readable with short synthesis sections, but preserve concrete evidence, source paths, URLs, commands, and observations

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The change is localized to skill-content formatting before prompt exposure plus targeted tests. The runtime architecture, tool contract surface, and workspace model do not need a broad redesign for this ticket.
- Investigation Goal: Determine why AutoByteus team-local skills still lead agents to emit wrong absolute `read_file` paths even when the correct skill root is already present in the prompt, and identify the smallest robust mitigation.
- Primary Questions To Resolve:
  - Does AutoByteus inject the correct absolute skill base path today?
  - Is the wrong path caused by backend path resolution or by model-side path construction?
  - What prompt-side change can reduce this failure mode without changing the on-disk skill authoring format?
  - Should the fix apply only to preloaded prompt injection or also to `load_skill` output?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-08 | Trace | User-provided AutoByteus runtime screenshots in chat thread | Confirm the exact runtime failure shape | The prompt shown to the agent includes the correct `Skill Base Path` for `architect-designer`, but the emitted `read_file` call still targeted `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/design-principles.md`, dropping `agents/architect-designer/` entirely | No |
| 2026-04-08 | Code | `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Inspect how preloaded skills are injected today | The processor injects `**Skill Base Path:** \`<abs-path>\`` but appends `skill.content` unchanged, so relative Markdown links remain relative in the prompt | Yes |
| 2026-04-08 | Code | `autobyteus-ts/src/tools/skill/load-skill.ts` | Check whether on-demand skill loading has the same weakness | `load_skill` also returns `skill.content` unchanged after printing `Skill Base Path`, so the same relative-link failure mode exists there too | Yes |
| 2026-04-08 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts` | Verify how skill paths become registry entries before prompt injection | `prepareSkills()` registers path-based configured skills and rewrites `config.skills` to skill names, so prompt injection later looks them up from the registry by name | No |
| 2026-04-08 | Code | `autobyteus-ts/src/tools/file/read-file.ts` | Confirm whether `read_file` corrects bad model paths | `read_file` resolves relative paths only against the workspace root and otherwise uses the supplied absolute path directly; it does not repair a wrong absolute path emitted by the model | No |
| 2026-04-08 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architect-designer/SKILL.md` | Inspect the real skill content that triggered the failure | The skill uses relative Markdown links such as `(design-principles.md)`, `(common-design-practices.md)`, `(references/common-design-patterns.md)`, and `(templates/design-spec-template.md)` | No |
| 2026-04-08 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architect-reviewer/SKILL.md` | Check adjacent skill patterns and parent-relative references | The reviewer skill includes the same relative shared reads plus a parent-relative reference `../architect-designer/references/spine-first-design-examples.md` | No |
| 2026-04-08 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architect-designer/agent.md` and `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architect-reviewer/agent.md` | Rule out plain agent-definition text as the source of the bad path | Neither `agent.md` mentions `design-principles.md` or `common-design-practices.md`; the path arithmetic pressure comes from the skill body, not the base role prompt | No |
| 2026-04-08 | Command | `python3 - <<'EOF' ... print(link lines from architect-designer SKILL.md) ... EOF` | Enumerate the exact markdown-link forms used in the real skill | Confirmed relative links are standard Markdown links, which makes prompt-side rewrite feasible without changing skill authorship | No |
| 2026-04-08 | Command | `rg -n "markdown link|\\[[^]]+\\]\\(|resolve.*relative|rewrite.*path|absolute path" autobyteus-ts/src -g '!**/dist/**'` | Look for an existing markdown-link rewrite helper | No existing helper or reusable utility was found for rewriting markdown link targets in skill content | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `AvailableSkillsProcessor.process(...)` for preloaded skill injection in the system prompt
  - `loadSkill(...)` in `autobyteus-ts/src/tools/skill/load-skill.ts` for explicit on-demand skill loading
- Execution boundaries:
  - `AgentFactory.prepareSkills(...)` registers configured skill paths into the `SkillRegistry`
  - `AvailableSkillsProcessor` reads from `SkillRegistry` and emits the preloaded skills block
  - `read_file` executes the final path string the model emits
- Owning subsystems / capability areas:
  - `autobyteus-ts/src/agent/system-prompt-processor/`
  - `autobyteus-ts/src/tools/skill/`
  - `autobyteus-ts/src/tools/file/`
- Optional modules involved:
  - none beyond the existing skill registry and tool modules
- Folder / file placement observations:
  - The likely fix belongs in a shared skill-content formatting utility under the `skills/` or `agent/system-prompt-processor/` area, then reused by both prompt injection and `load_skill`

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | `AvailableSkillsProcessor.process` | Injects skill catalog and detailed preloaded skill sections into the system prompt | Emits absolute `Skill Base Path` but leaves internal skill links relative | Primary observed bug surface; should consume a formatted skill-body helper rather than raw `skill.content` |
| `autobyteus-ts/src/tools/skill/load-skill.ts` | `loadSkill` | Returns a formatted skill block for on-demand use | Repeats the same raw-content behavior as `AvailableSkillsProcessor` | Good candidate to share the same formatting utility for consistency |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | `prepareSkills` | Registers configured skill paths and normalizes them to skill names | Confirms the registry already knows the correct absolute root path before prompt construction | No fix needed here; upstream data is already correct |
| `autobyteus-ts/src/tools/file/read-file.ts` | `readFile` | Resolves and reads the file path chosen by the agent | Does not correct wrong absolute paths | Confirms the mitigation must happen before or during prompt exposure, not inside `read_file` |
| `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architect-designer/SKILL.md` | Skill body | Real-world relative skill references | Uses plain relative Markdown links that can be programmatically resolved against the skill root | Good fixture shape for tests |
| `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architect-reviewer/SKILL.md` | Skill body | Parent-relative cross-skill reference example | Includes `../architect-designer/...` link that should still rewrite correctly when the target exists | Tests should cover parent-relative resolution too |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-08 | Trace | User screenshots of the AutoByteus team run | Prompt included the correct absolute skill root, yet the model still emitted a path rooted at the team directory | The failure is model-side path arithmetic, not missing backend knowledge of the skill root |
| 2026-04-08 | Script | `python3` snippet printing all markdown-link lines from `architect-designer/SKILL.md` | All referenced internal files use standard Markdown link syntax | Safe to target Markdown link rewriting first instead of broad text rewriting |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: `N/A`
- Version / tag / commit / release: `N/A`
- Files, endpoints, or examples examined: `N/A`
- Relevant behavior, contract, or constraint learned: `N/A`
- Confidence and freshness: `N/A`

### Reproduction / Environment Setup

- Required services, mocks, or emulators: none for Stage 1
- Required config, feature flags, or env vars: none beyond local repo checkout and sibling `autobyteus-agents` repo for inspection
- Required fixtures, seed data, or accounts: user-provided runtime screenshots plus real local skill files
- External repos, samples, or artifacts cloned/downloaded for investigation: none
- Setup commands that materially affected the investigation:
  - `git fetch origin`
  - `git worktree add -b codex/skill-prompt-absolute-paths /Users/normy/autobyteus_org/autobyteus-worktrees/skill-prompt-absolute-paths origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - dedicated worktree is active and should remain until Stage 10 cleanup

## External / Internet Findings

No external or internet sources were required for this investigation stage.

## Constraints

- Technical constraints:
  - Skills must remain portable on disk; the authored `SKILL.md` should keep relative links.
  - Prompt rewriting should avoid broad text substitution that could mutate prose examples or unrelated text.
  - External URLs, anchors, and unresolved link targets must remain unchanged.
- Environment constraints:
  - The observed failure is in AutoByteus runtime, not Codex runtime.
  - `read_file` respects absolute paths as supplied and will not rescue a bad absolute path.
- Third-party / API constraints:
  - none discovered

## Unknowns / Open Questions

- Unknown: Whether the ticket should harden only preloaded prompt injection or also align `load_skill` output in the same patch.
- Why it matters: Both surfaces currently expose raw relative links to the model, but only the preloaded path is directly implicated by the reported bug.
- Planned follow-up: Decide in Stage 2/3 whether the shared formatter should serve both surfaces for consistency.

## Implications

### Requirements Implications

- The core requirement should focus on eliminating model-side path arithmetic for resolvable internal skill links by presenting absolute targets directly in the prompt/output.
- Acceptance criteria should explicitly cover child-relative links, sibling-folder links, and parent-relative links when those targets exist.

### Design Implications

- The fix should likely be a small shared formatter that:
  - scans skill Markdown for Markdown link targets,
  - resolves relative targets against `skill.rootPath`,
  - replaces only resolvable relative targets with absolute filesystem paths,
  - leaves external URLs, anchors, absolute paths, and missing targets untouched.
- The formatter can be shared by `AvailableSkillsProcessor` and `load_skill` to avoid duplicate formatting behavior.

### Implementation / Placement Implications

- The implementation should remain in `autobyteus-ts`, not `autobyteus-server-ts`, because the relevant skill-content rendering surfaces live there.
- Tests belong near `available-skills-processor` and `load_skill`, with fixtures shaped like the architect skills that triggered the issue.

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.

### 2026-04-08 Re-Entry Update

- Trigger: `Initial ticket bootstrap`
- New evidence: `N/A`
- Updated implications: `N/A`
