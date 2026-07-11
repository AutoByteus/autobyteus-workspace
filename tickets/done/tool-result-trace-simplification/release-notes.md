# Reliable Split Tool Traces Across Runtimes

> Archived delivery notes only. The user requested repository finalization without a new release/version, so these notes were not published.

## Highlights

- Persists each tool invocation as a distinct call followed by a correlated terminal result instead of repeating call metadata on the result.
- Preserves native AutoByteus model-issued arguments before preprocessing, approval, or execution, including large command and patch payloads.
- Records Claude and ordinary Codex calls as soon as authoritative arguments are available, while deferring Codex hosted-search placeholders until the terminal action supplies the real query/open/find arguments.
- Correlates call/result pairs across active and rotated raw-trace files so run history, Memory inspection, compaction/recovery, and generated work traces produce one coherent interaction.
- Keeps success with `null`, failure, denial, and controlled interruption unambiguous through physically present result and error fields.

## Reliability And Recovery

- Tool identity now includes both turn id and tool-call id, so provider call ids reused in different turns do not collide.
- Duplicate or malformed terminal events are suppressed or skipped instead of receiving fabricated identity or arguments.
- An early call left unmatched by abrupt process loss remains pending/unknown and is not automatically retried or treated as successful.

## Compatibility And Data

- Existing historical split and superset trace rows remain readable without rewriting stored files.
- No migration, Memory Sync change, schema-version branch, compatibility writer, or historical backfill is required.
- Working Context remains a separate provider-protocol projection and may retain fields required by the model protocol even though new raw result rows stay minimal.

## Validation

- Durable coverage spans seven updated existing test files, with no test path added or removed.
- Live Codex validation covered recorder persistence and the current hosted-search lifecycle.
- A real OpenAI `gpt-5.4-mini` native journey proved that one model-issued `write_file` call is already physical at tool start, then exactly one correlated minimal result follows before successful assistant continuation.
- Final API/E2E confidence is `98.3%`; live Claude and LM Studio transport remain explicitly outside the validated provider set.
