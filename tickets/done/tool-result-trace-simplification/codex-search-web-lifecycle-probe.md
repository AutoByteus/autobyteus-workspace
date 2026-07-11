# Codex `search_web` Lifecycle Probe

## Status And Authority

- Status: Complete evidence supplement, including a 2026-07-11 full-frame/result-body audit and post-turn grace capture.
- Probe dates: 2026-07-10 and 2026-07-11.
- Scope: Directly establish when Codex App Server exposes `search_web` query/action data, whether the current AutoByteus parser/converter loses earlier data, and whether another client-visible event exposes the underlying search-result body.
- Related requirements: REQ-004, REQ-006, REQ-010.
- Related acceptance criteria: AC-003, AC-010, AC-011.
- Authority: This is an investigation supplement. It supplies the evidence behind the requirements and design; it does not replace them.
- Approval: Evidence was presented in the current user conversation. The user accepted the provider-late and no-client-result conclusions, then approved provider-specific call timing with a minimal separate result rather than terminal-only persistence for all runtimes.

## Question

The historical corpus contained 1,376 Codex `search_web` pairs whose persisted start-side `tool_args` were `{}` while the terminal row contained query/action data. Persisted output alone could not distinguish:

1. genuinely provider-late information;
2. information present at start but missed by the AutoByteus parser/converter; or
3. mixed behavior.

This probe observes the Codex App Server protocol directly, runs the captured payloads through the current repository parser and converter, and audits the complete client-visible frame stream for a separate result body.

## Environment

| Item | Value |
| --- | --- |
| Codex executable | `/Users/normy/.local/bin/codex` |
| Version | `codex-cli 0.144.0` |
| Surface | `codex app-server --stdio` raw JSON-RPC |
| Model | `gpt-5.4-mini` |
| Approval policy | `never` |
| Thread mode | ephemeral, experimental raw events enabled |
| Probe working directory | isolated temporary directory |
| AutoByteus source under test | ticket bootstrap source at `3effb76ab56d4d1bb876ad0623a8e5eb7093a584` |

The prompt required all three built-in web-search action families in one turn: a search, an opened result page, and find-in-page.

## Exact Probe Method

1. Start `codex app-server --stdio`.
2. Send `initialize`, `initialized`, `thread/start`, and `turn/start` JSON-RPC frames.
3. Capture every newline-delimited JSON-RPC stdout frame until `turn/completed`.
4. Select lifecycle/approval/web-search frames without changing their payloads.
5. Feed each captured `item/started` and `item/completed` frame to the repository's actual:
   - `CodexItemEventPayloadParser.resolveWebSearchArguments(...)`; and
   - `CodexThreadEventConverter.convert(...)`.
6. Generate the installed protocol schema with:

   ```bash
   codex app-server generate-json-schema \
     --out /tmp/codex-schema-inspect
   ```

7. Audit the complete 214-frame JSONL recursively for result/snippet/source/citation fields and enumerate every method/item type.
8. Repeat a one-search probe while continuing capture for three seconds after `turn/completed`, then audit all 39 frames and verify that no post-turn frame arrived.
9. Re-scan the mutable local corpus with the same compound `(turn_id, tool_call_id)` classification used in the original corpus analysis.

Temporary evidence files and their SHA-256 hashes at probe completion:

| File | SHA-256 |
| --- | --- |
| `/tmp/codex-web-search-lifecycle-multiaction-selected.json` | `5fce333ea7419a37e80b53a297673cdc96c32322c61beef11975bcea0547ea26` |
| `/tmp/codex-web-search-lifecycle-multiaction-raw.jsonl` | `632c3a350c99161cc90cdbcb85f774460b0028caabbc5d6a91c537d682c94a6e` |
| `/tmp/codex-web-search-converter-parser-output.json` | `c0fee2fb1f157f832c64da78052bf27e1da6fa15e921f40f5eb6f25d54907bdf` |
| `/tmp/codex-web-search-lifecycle-grace-raw.jsonl` | `95e5829b1f53c0b43f1ec1ff369f93874c8cfe04edb7b720b9df5d81fc4dc4ad` |
| `/tmp/codex-web-search-lifecycle-grace-selected.json` | `1b40a567b06f0a848536a058f60c5e27ea1bbd93e6fce429b35ded8de4c94445` |
| `/tmp/codex-schema-inspect/codex_app_server_protocol.v2.schemas.json` | `d63862328243c871d988a58c48ae2846e9aef5b2519afd6b8710fcbb125ca7e5` |
| `/tmp/classify_search_web_arg_differences.out` | `f396b124f6aaaf01946b3c4a8cffa4a7c0f6a4e087f9135d6969aaa677f2b61e` |
| `/tmp/codex-web-search-lifecycle-multiaction-probe.mjs` | `6b326afc325d0808c2804c4257bfb580a49325bf2047ce0792d815d748151d3a` |
| `/tmp/codex-web-search-converter-parser-probe.ts` | `5399faf36f90fbe43606e83fdd24ee57d03a7f34b38c01b29352e538863ae50c` |
| `/tmp/classify_search_web_arg_differences.py` | `2607cb0ae8171367dfe7a7e450f247825bd72554734218d705f4e4bc1cbc133b` |

The full raw JSONL captures are intentionally not copied into the ticket because they contain unrelated provider/developer frames and encrypted reasoning material. They remain temporary local evidence; the selected payload facts needed for this decision are reproduced below.

## Direct App-Server Observations

### Search action

Start:

```json
{
  "method": "item/started",
  "params": {
    "item": {
      "type": "webSearch",
      "id": "ws_...",
      "query": "",
      "action": { "type": "other" }
    }
  }
}
```

Completion:

```json
{
  "method": "item/completed",
  "params": {
    "item": {
      "type": "webSearch",
      "id": "ws_...",
      "query": "\"OpenAI Codex CLI app server protocol\"",
      "action": {
        "type": "search",
        "query": "\"OpenAI Codex CLI app server protocol\"",
        "queries": ["\"OpenAI Codex CLI app server protocol\""]
      }
    }
  }
}
```

### Open-page action

The start again contained `query: ""` and `action.type: "other"`. Completion contained the selected URL as `item.query` and `action: {"type":"openPage","url":"..."}`.

### Find-in-page action

The start again contained `query: ""` and `action.type: "other"`. Completion contained a descriptive query and `action: {"type":"findInPage","url":"...","pattern":"Codex"}`.

### Other lifecycle surfaces

- No approval request occurred for the built-in web searches.
- No intermediate event exposed actionable query/action data between `item/started` and `item/completed`.
- Each `rawResponseItem/completed` `web_search_call` also contained the terminal action, but it arrived at completion rather than before it.
- The generated 0.144.0 schema requires a `query` string on `WebSearchThreadItem`, but the live start payload satisfies that schema with the empty string and represents the unknown action as `other`. The schema therefore does not imply early availability of the real query.

### Complete-frame and result-body audit

The original probe retained 214/214 client-visible JSON-RPC frames received from initialization through `turn/completed`. The smaller selected file was only a review projection; it was not the capture source. A recursive audit of the full JSONL found:

- three `item/started(webSearch)` / `item/completed(webSearch)` pairs;
- three `rawResponseItem/completed(web_search_call)` items;
- no web-search result, search-result, snippet, source, or citation-body property;
- an eventual assistant message containing the model's synthesized answer;
- encrypted reasoning items whose internal contents are not part of the observable structured tool-result contract.

The follow-up probe captured 39/39 frames and deliberately waited three seconds after `turn/completed`. No frame arrived after turn completion. Its web-search completion again contained action metadata only.

The generated schema independently defines:

- `WebSearchThreadItem` with `id`, `query`, and optional `action`;
- `WebSearchCallResponseItem` with `id`, `status`, and optional `action`.

Neither type defines a raw search-result body. Codex necessarily obtains search data internally, but the tested App Server surface does not expose that body to its client. This finding is scoped to client-visible Codex App Server 0.144.0 behavior; it does not claim access to provider-internal/encrypted data or guarantee that future protocol versions cannot add another field.

## Parser And Converter Comparison

| Action | Provider start data | Parser start output | Converted start event | Provider completion data | Parser completion output | Converted terminal event |
| --- | --- | --- | --- | --- | --- | --- |
| Search | empty query, `other` | `{}` | `TOOL_EXECUTION_STARTED`, `arguments:{}` | query + search action + queries | query/action/queries | `TOOL_EXECUTION_SUCCEEDED` with complete arguments |
| Open page | empty query, `other` | `{}` | `TOOL_EXECUTION_STARTED`, `arguments:{}` | URL + `openPage` | query/action type | `TOOL_EXECUTION_SUCCEEDED` with complete arguments |
| Find in page | empty query, `other` | `{}` | `TOOL_EXECUTION_STARTED`, `arguments:{}` | query + `findInPage` + URL/pattern | query/action type | `TOOL_EXECUTION_SUCCEEDED` with the currently defined argument projection |

The repository parser does not drop an earlier query: the start payload has none to extract. It correctly ignores the non-actionable empty query/`other` action and correctly extracts the terminal fields that its current normalized contract defines.

`resolveWebSearchResult(...)` currently constructs a normalized completion object from status plus the same terminal action metadata (and an explicit result only if the provider ever supplies one). In the observed frames there was no explicit result. The normalized object is therefore completion metadata, not a raw search-engine result body.

## Historical Classification

### Original immutable observation used by the task

- 1,376 differing `search_web` call/result pairs.
- Every call-side argument object was `{}`.
- Every terminal row supplied additional query/action data.
- Start source: `TOOL_EXECUTION_STARTED`.
- Terminal source: `TOOL_EXECUTION_SUCCEEDED`.

### Later mutable-corpus re-scan

The corpus changed while investigation continued, so a later scan found 1,375 rather than 1,376 differing pairs:

| Terminal action | Count |
| --- | ---: |
| `search` | 603 |
| `openPage` | 629 |
| `findInPage` | 143 |
| **Total** | **1,375** |

All 1,375 retained the same empty-start/enriched-terminal and start/terminal source-event pattern. The one-record delta is a mutable-corpus observation, not a reclassification of the original scan.

## Classification Decision

| Candidate classification | Evidence | Decision |
| --- | --- | --- |
| Genuine provider-late information | Direct app-server starts contain empty query/`other`; completions contain the real values for all three action families. Historical source and shape match this lifecycle. | **Confirmed for the observed `search_web` difference class.** |
| Local extraction defect | The actual parser/converter produces `{}` from the genuinely empty start and complete normalized arguments from completion. | **Rejected; no evidence of a start-side parser loss.** |
| Mixed behavior within the 1,376 differing records | All original differing records and all 1,375 records in the later re-scan share the same empty-start/terminal-enrichment structure. | **No mixed subclass observed.** |

The direct probe is representative rather than a time machine for every historical provider frame. The classification of the full historical class is therefore an evidence-backed inference: the live provider lifecycle, current extraction behavior, persisted source events, and every stored difference shape agree.

## Design Consequence

Earlier extraction cannot supply a real web-search query because the upstream start payload does not contain one. That provider-specific limitation does not justify delaying native AutoByteus or Claude calls whose arguments are already authoritative.

The revised consequence is:

1. At the Codex converter boundary, represent the placeholder web-search start with arguments absent rather than an authoritative `{}`. Preserve explicit `{}` for genuinely known no-argument calls.
2. Let the provider-agnostic memory accumulator defer any call whose normalized arguments are absent.
3. When terminal web-search action data arrives, append `tool_call` with the real query/action first, then append a separate minimal `tool_result` containing only identity and outcome fields.
4. Keep ordinary Codex calls, Claude calls, and native AutoByteus calls at their earlier authoritative boundaries.
5. Do not introduce `tool_call_update`, a combined terminal call, provider-native reparsing inside persistence, or historical migration.

Codex owns its model-context compaction and internal hosted-search data. AutoByteus records the client-visible activity for evidence; it does not need to make native/Claude persistence mimic that provider-internal lifecycle.
