# Investigation Notes — AGY native `generate_image` output path

## Investigation Meta
- Package: `agy-native-image-output-path`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path`, branch `codex/agy-native-image-output-path`
- Base: `origin/personal` @ `fcd3e83a4` (fetched 2026-09-28); finalization target `personal`
- Owner: Solution Designer. Date: 2026-09-28. AGY CLI `1.2.12` (`/Users/normy/.local/bin/agy`).

## Initial Request And Clarifications
The user runs the Daily Assistant on the Antigravity CLI runtime. After native `generate_image`, the AutoByteus Activity tool card shows `{"provider_state": "DONE", "output": null}`. The model itself reports the full path (`/Users/normy/.gemini/antigravity-cli/brain/010c6db0-…/golden_retriever_dog_1790572457860.jpg`). The user asked for experiments: is the missing path an AutoByteus integration defect, or does AGY not expose it? If the path can be obtained, the user wants AutoByteus's mapped `generate_image` result to show it.

## Source Log
| ID | Source | Finding |
| --- | --- | --- |
| E-001 | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` L83–116 | For `generate_image`, `arguments` is forced to `{}` and success result is hard-coded `{provider_state:"DONE", output:null}`, with comment "Its native DONE does not provide a path". Other tools pass `tool_info.output` through. |
| E-002 | `probe-evidence/raw-stream.ndjson` (native `agy -p … --output-format stream-json`, conv `89b51dcf-…`) | `generate_image` DONE `step_update` contains only `tool_info.name` and `tool_info.parameters` (`ImageName`, `Prompt`); **no `output` key**. The final assistant text includes the path. |
| E-003 | `probe-evidence/probe2.ndjson` + `probe.py` (conv `ca3dd328-…`) | Same-turn control: `run_command` DONE **does** include `tool_info.output` (`"hello-probe\r\n"`); `generate_image` DONE does not. So the omission is AGY's stream-json contract for this tool, not an AutoByteus parsing loss. |
| E-004 | `~/.gemini/antigravity-cli/brain/<conversation_id>/.system_generated/steps/<step_index>/output.txt` | AGY persists the internal tool result the model sees: `Using prompt: …\n\nGenerated image is saved at /Users/normy/.gemini/antigravity-cli/brain/<conv>/<ImageName>_<epochms>.jpg.\n\n Do not output the path …`. The `<step_index>` equals the stream `step_update.step_index` (verified at 2 and 4). |
| E-005 | `probe.py` timing check | At the moment the `generate_image` DONE event is read from stdout, `steps/<step_index>/output.txt` already exists with the path (also true for `run_command`). The image file is present in the brain dir. No wait/finalization needed. |
| E-006 | User's real AutoByteus run conv `010c6db0-b642-42e6-b2aa-aba1a6d95236` | `steps/2/output.txt` exists with `…/golden_retriever_dog_1790572457860.jpg`, i.e. the path was available on disk during the AutoByteus-driven run too; our converter simply never reads it. |
| E-007 | `tickets/done/agy-runtime-image-codex-prep-20260926` SR-018..SR-021, E-054/E-055 | An earlier design read `transcript.jsonl` `media[]` with baseline offsets, copied bytes into run memory and added a finalizing turn gate. The user rejected that as overscoped (E-055: AGY owns storage; only make the tool callable). Requirement REQ-002 then explicitly excluded reading AGY brain storage and showing an app-owned path. `steps/<n>/output.txt` was **not known** in that ticket (grep: no hits). |
| E-008 | `file-change-output-path.ts`, `file-change-event-processor.ts` L300–319 | Generic processor: for generated-output tools (`generate_image` included), a success `result.file_path` or any `*output*path*` key produces a `FILE_CHANGE` `generated_output` entry (Artifacts tab). So exposing a path under such a key would also create an Artifacts entry; exposing it only as `output` text would not. |

| E-009 | `agy-agent-run-backend.ts` L25/L42; converter L24/L37 | Conversation id is already known without lookup: `context.runtimeContext.conversationId` (from AGY `init`, persisted for `--conversation` resume) is passed to `AgyStreamEventConverter`, which already rejects events whose `conversation_id` differs. Every `step_update` also carries `conversation_id` + `step_index`. Path is therefore computed directly: `~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/steps/<step_index>/output.txt` — no directory search. |
| E-010 | Historical scan of all 483 local brain conversations | 7 historical `generate_image` calls in 6 conversations. The 3 made since the `steps/` layout existed all have `output.txt` with a path to an existing image inside the conversation dir (3/3). The 4 older calls (2026-06-16, 2026-08-07) have no `steps/` directory at all; transcript step type then was `GENERATE_IMAGE`. Earliest conversation with `steps/`: 2026-08-11. ⇒ the layout is ~7 weeks old and has changed once; it is undocumented. `agy changelog` 1.2.8 references "step output data" as an internal concept. |
| E-011 | `probe-evidence/probe3.py`, `probe3.ndjson` — exact production mode (`--new-project`, stdin `stream-json`, long-lived process), conv `5b1ab95d-…` | Turn 1 single image (step 2) and turn 2 two parallel `generate_image` calls (steps 6, 7): each DONE's own `output.txt` existed at event time, path matched its `ImageName`, file existed. 3/3. |
| E-012 | `probe-evidence/probe4.py`, `probe4.ndjson` — resumed `--conversation 5b1ab95d-…` | Step numbering continues (step 12); `output.txt` present at DONE with correct path. 1/1. |

| E-013 | `agy-agent-run-backend.ts` L97–105; `tests/unit/.../agy-stream-event-converter.test.ts` | `convert` is synchronous and called from the backend's serialized async queue; ~20 unit call sites rely on sync `convert`. Existing tests encode the old policy (`arguments: {}`, `output: null`); e2e `agy-native-image-codex-skill.e2e.test.ts` L102 expects `output: null`. |
| E-014 | `agent-execution/domain/agent-run-file-change-path.ts`; `api/rest/run-file-changes.ts` | Outside-workspace absolute paths are kept absolute in the projection; `/runs/:runId/file-change-content` serves only a projected entry that exists as a file. ⇒ Artifacts preview of a brain-dir image works without shared-code change. |
| E-015 | `agent-tools/media/media-tool-contract.ts` L68–69 | AutoByteus's own media tools return `MediaToolResult = { file_path }`. |
| E-016 | `file-change-output-path.ts` `extractKnownGeneratedResultPath`; processor L300–319 | A generated-output tool success with `result.file_path` yields one `generated_output` FILE_CHANGE `available` entry; `ImageName`/`Prompt`/`AspectRatio` arg keys do not match the explicit output-path key rule. |

## Runtime, Probe, Or Reproduction Findings
- Reliability summary (AGY 1.2.12): 8/8 live or post-layout calls resolved correctly (E-004–E-006, E-011, E-012), covering single, parallel, multi-turn, resumed and AutoByteus-driven runs. 0/4 pre-2026-08-11 calls would resolve (older layout) → fallback required.
- Answer to the user's question: **both**. AGY's stream-json genuinely omits `output` for `generate_image` (E-002/E-003), and AutoByteus additionally hard-codes `output: null` and drops parameters (E-001). The path is, however, reliably retrievable from AGY's per-step output file keyed by the same `step_index` (E-004–E-006).
- Filename pattern: `<ImageName>_<epoch ms>.jpg` in `brain/<conversation_id>/`.

## Assumptions, Unknowns, And Risks
- `steps/<n>/output.txt` is an undocumented AGY internal; layout and text may drift across versions → must fail safely (fall back to current `output: null`, never fail the tool).
- Security: read must be confined to `~/.gemini/antigravity-cli/brain/<validated conversation uuid>/.system_generated/steps/<integer>/output.txt`, bounded size, no symlink following.
- Artifacts preview of a file outside the workspace (AGY brain dir): **verified** by E-014 (absolute projected path served by the existing content route).
- Only single-machine local AGY is supported (server and AGY share a home dir) — true for current runtime.

## Requirement Implications
Showing the path reverses part of approved REQ-002/AC-002 of the prior ticket ("does not search AGY brain…, create an app-owned image path"). Needs explicit new user approval; the scope can stay much smaller than the rejected SR-018/019 design (no transcript scanning, no copy, no turn gating).
