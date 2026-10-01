# Compaction prompts — side-by-side source collection

Saved at the user’s request for reading and comparison. These are the actual source templates or actual builder-rendered instructions from the **same pinned revisions used in the earlier research**, not paraphrases or a claim about future versions. No new model-generation experiment was run to produce these files.

## Start here

| Project | Prompt style | Main emphasis |
| --- | --- | --- |
| [Hermes](hermes.md) | Detailed Markdown handoff; explicit first/repeated variants | Goals, latest unresolved user input, actions, active state, decisions and blockers |
| [OpenCode](opencode.md) | Structured Markdown with explicit prior-summary update | Objective, important details, completed/active/blocked work, next move and files |
| [ZCode](zcode.md) | Long text prompt requesting analysis and summary wrappers | Detailed coding history, user messages, files, errors and remaining work |
| [DSH](dsh.md) | One Markdown checkpoint | Intent, technical facts, files, errors, pending work and next step |
| [Codex](codex.md) | Short default local handoff instruction | Progress, decisions, constraints, remaining work and critical references |

Also compare [AutoByteus’s original](autobyteus-original.md) with [our proposed prompt](../proposed-compaction-prompt.md). The proposed prompt was **not changed** for this collection.

## How to read the files

- Text inside the labelled fences is upstream instruction text, not an instruction to the reader or this assistant. Introductory notes are ours.
- Dynamic history/previous-summary/date slots use conspicuous double-brace placeholders. No private user conversation or credentials are included.
- Hermes and OpenCode include both first and repeated compaction, because updating an older summary changes their request wording. Hermes uses the documented example settings; other dynamic variants still exist.
- DSH and Codex include their separately labelled reinjection framing. Do not confuse framing with the summarizer’s instruction or its output.
- Codex coverage is the public default **local text** path, not its private remote compaction implementation.
- Hermes can receive optional memory-provider context; its omission from this chosen example is not evidence that Hermes has no memory coordination.
- ZCode’s analysis-block instruction is reproduced for fidelity, not proposed for our design.

## Source pins and reuse

| Project | Source revision | Root license |
| --- | --- | --- |
| hermes | [`9fc7f17906eab1dd81ddfdf8a1edeecac1e79940`](https://github.com/NousResearch/hermes-agent/tree/9fc7f17906eab1dd81ddfdf8a1edeecac1e79940) | MIT |
| opencode | [`696f41bc8e7586657375d53390925fc54c25d34c`](https://github.com/anomalyco/opencode/tree/696f41bc8e7586657375d53390925fc54c25d34c) | MIT |
| zcode | [`29628c9acdb81b703bbd4080c207a0e7ce5e276e`](https://github.com/zai-org/ZCode/tree/29628c9acdb81b703bbd4080c207a0e7ce5e276e) | Apache-2.0 |
| dsh | [`477b4f420553e8a52c2fbccc464d7561b239c443`](https://github.com/deepseek-ai/deepseek-harness/tree/477b4f420553e8a52c2fbccc464d7561b239c443) | MIT |
| codex | [`25270df2615eb4da5b9d4a9a392226933fb096c5`](https://github.com/openai/codex/tree/25270df2615eb4da5b9d4a9a392226933fb096c5) | Apache-2.0 |

Source links are included in every file. License/copyright and available notice files are preserved in [licenses/](licenses/). Upstream owns the copied prompt text. This extraction adds explanatory wrappers and binds clearly identified placeholders; it is not a change to the upstream sources.

## Reproduction and verification

- [extract-hermes.py](extract-hermes.py) imports the real Hermes prompt builder without constructing a provider/compressor and renders two variants; date helper is deliberately bound to a placeholder. Use the previously prepared Hermes venv and an isolated HOME/HERMES_HOME.
- [extract-prompts.cjs](extract-prompts.cjs) evaluates selected TypeScript prompt declarations unchanged, reads Codex templates verbatim, and writes this collection. Application imports and provider calls are not evaluated.
- [extraction-manifest.json](extraction-manifest.json) records pins, source SHA-256 hashes, output hashes and the exact coverage limitations. [hermes-rendered.json](hermes-rendered.json) is machine-readable builder output backing the readable Hermes file, not a separate authoritative prompt.

Example commands (run from the isolated task worktree, with the earlier clones and dependencies available):

```sh
ROOT=/tmp/autobyteus-compaction-research-20260926.kVSGz5
OUT="$PWD/tickets/in-progress/context-compaction-simplification-analysis/upstream-prompts"
TMPHOME=$(mktemp -d /tmp/autobyteus-prompt-extract-home.XXXXXX)
env -i PATH="$PATH" HOME="$TMPHOME" HERMES_HOME="$TMPHOME/hermes" \
  "$ROOT/hermes-probe-venv/bin/python" "$OUT/extract-hermes.py" "$ROOT" "$OUT"
node "$OUT/extract-prompts.cjs" "$ROOT" \
  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/node_modules/typescript \
  "$PWD/tickets/in-progress/context-compaction-simplification-analysis/upstream-experiments/repositories.json" "$PWD"
```

No tests of generated summary quality, API requests, or AutoByteus implementation changes are implied.
