# Embedding Model Evaluation Report

- Package: `project-task-semantic-search` (Project Task `autobyteus-71`)
- Author: Solution Designer, 2026-10-18
- Purpose: choose a default local CPU embedding model for Project Task search and the reusable embedding layer, with evidence the user can trust and re-run.
- Status: evidence for requirements decision DEC-002 and the design's model catalog. Round 2 supersedes round 1's conclusion.

## 1. Summary

- **Recommended default: MongoDB LEAF-IR (`MongoDB/mdbr-leaf-ir`, Apache-2.0, 23M parameters, 24 MB).**
  - It is in the top quality tier on the user's real Tasks: right Task in the top 5 for 98.6% of 69 reworded queries, and first for 87.0%.
  - It is by far the cheapest to run: on the server's WebAssembly runtime it indexes 4.6× faster than Granite and 22× faster than Voyage 4 nano (today's 170 Tasks in 18 s), answers a query in about 5 ms, and peaks at about 480 MB.
- **Equal-quality alternatives with different trade-offs:**
  - IBM Granite Embedding Small English R2: best first-place accuracy (92.8%); reads up to 8K tokens.
  - Voyage 4 nano: best top-5 (100%), but 22× the CPU and about 1.3 GB of memory.
  - Google EmbeddingGemma 2: multilingual (100+ languages), Apache-2.0, but about 9× Granite's CPU.
- **The model must be switchable.** Quality differences between the top four are 2–4 queries out of 69; the right choice depends on environment and language. The design therefore treats the model as a replaceable catalog entry (REQ-015).
- **Today's board search finds none** of the reworded queries.

## 2. Method

### 2.1 Data

- **Corpus:** the user's real Project Tasks, read-only from `~/.autobyteus/server-data/projects/*/tasks/*/task.json`. 167–170 Tasks during the runs (Tasks were being created meanwhile), in 7 Projects.
- **Description length:** median 2,461 characters, about 640 tokens on average; p90 4,532 characters; max 24,805.
- **Language:** English except one Task.
- **Privacy:** no Task content is copied into the repository; the query files hold query text and target keys only.

### 2.2 Queries

- **`probes/queries.json` (40 queries, round 1) and `probes/queries70.json` (69 queries, round 2 = the 40 + 29 new):** each query is written deliberately in different words from its target Task(s), with 1–3 relevant Task keys. Examples:
  - "group symbol turned into a lightning bolt" → the team-icon Task;
  - "stop companies from selling a closed modified copy of our code" → the relicensing Task;
  - "the shipping role should read the repository's publishing rules" → the Delivery Engineer RELEASE.md Task.
- **`probes/offtopic.json`:** 8 clearly unrelated queries ("recipe for banana bread", "weather in Berlin tomorrow", "asdkjh qwezx plmok", "xyz", …), used to check that nonsense can yield "no match". Two entries in that file ("token", "docker") are on-topic single words and are excluded from the off-topic statistics.

### 2.3 Metrics

- **recall@k:** a relevant Task appears within the first k results.
- **MRR:** mean of 1 / rank of the first relevant Task.
- **Off-topic separation:** the best achievable share of correctly separated queries when thresholding the top score: real queries above, off-topic below.
- **Cost:** model load time, indexing time per Task, query time, process memory (RSS) after loading and after indexing, and download size.

With 69 queries, one query is 1.45 percentage points. Differences of 1–3 queries are within noise.

### 2.4 How each model is run

- Each model uses the query/document prompts and pooling from its own model card or `config_sentence_transformers.json` and `1_Pooling/config.json`, or its ONNX `sentence_embedding` output where the export provides one.
- Embeddings are L2-normalized; similarity is cosine.
- **Indexed text:** the whole Task description up to 1,024 tokens (512 where the model's limit is 512). Round 1 also compared chunking (≈ 220-word windows, best chunk) and first-512 tokens.
- **Runtimes:**
  - Quality and native cost: `@huggingface/transformers` 4.3.1 with `onnxruntime-node` (CPU), `probes/bench2.mjs`.
  - Production-candidate cost: `onnxruntime-web` 1.30.0 (WebAssembly, Node build, 4 threads) + `@huggingface/tokenizers` 0.2.0, `probes/lean2.mjs`. It gave identical rankings to native for every model tested.
- **Host:** Apple M1 Max, 10 cores, 64 GB, Node 22.23.1. Other agents' test suites were running concurrently, so timings are indicative. A typical laptop is assumed 2–3× slower.

### 2.5 Candidate discovery and licence filter

- **Round 1** used a candidate list from prior knowledge plus a Hugging Face licence/size check. The user correctly challenged it: it included old models (Jina v2 from 2023) and missed 2025–2026 releases.
- **Round 2** rebuilt the list from:
  - current web sources: 2026 leaderboard articles, papers and model cards;
  - the Hugging Face API: licence, gating, parameter count, creation date and ONNX files for every compact model found.
- **Licence rule:** AutoByteus is distributed under AGPL-3.0 and a commercial licence, so a model must permit commercial use.
  - Non-commercial models (Jina v3, Jina v5 small/nano: CC BY-NC 4.0) were tested for reference only.
  - Gemma-terms models (EmbeddingGemma v1) carry use-policy pass-through obligations.

## 3. Results — Round 2 (current models, 69 queries, whole-Task indexing)

### 3.1 Candidates

| Model | Maker | Released | Licence | Params | Languages | Max tokens |
| --- | --- | --- | --- | --- | --- | --- |
| mdbr-leaf-ir (LEAF-IR) | MongoDB | 2025-08 | Apache-2.0 | 23M | English | 512 |
| granite-embedding-small-english-r2 | IBM | 2025-07 | Apache-2.0 | 47M | English | 8,192 |
| granite-embedding-97m-multilingual-r2 | IBM | 2026-04 | Apache-2.0 | 97M | 200+ | 32,768 |
| embeddinggemma-300m (v1) | Google | 2025-07 | Gemma terms | 308M | 100+ | 2,048 |
| embeddinggemma-2 (text) | Google | 2026-09 | Apache-2.0 | 270M text (740M with vision/audio) | 100+ | 8,192 |
| voyage-4-nano | Voyage AI | 2026-01 | Apache-2.0 | 346M | multilingual | 32,000 |
| harrier-oss-v1-270m | Microsoft | 2026-03 | MIT | 270M | multilingual | — |
| jina-embeddings-v5-text-nano-retrieval | Jina AI | 2026-02 | CC BY-NC 4.0 | 239M | multilingual | 8,192 |
| gte-modernbert-base | Alibaba | 2025-01 | Apache-2.0 | 149M | English | 8,192 |
| Qwen3-Embedding-0.6B | Alibaba Qwen | 2025-06 | Apache-2.0 | 600M | multilingual | 32K |

Found but not tested:

- Bekko embedding v1 (2026, MIT; Japanese-focused).
- Snowflake arctic-embed-m-v2.0 (2024).
- Nomic embed v2 MoE (2025; no ONNX export in its repository).
- Granite 311M multilingual R2 (larger sibling of the 97M; ONNX 313 MB).
- Larger models (Qwen3-Embedding 4B/8B, harrier 0.6B/27B) are out of the compact class.

### 3.2 Quality (`probes/current-models-analysis.md`)

| Model (ONNX dtype) | r@1 | r@5 | r@10 | MRR | Off-topic separated | Top-score cut (real min / off-topic max) |
| --- | --- | --- | --- | --- | --- | --- |
| Voyage 4 nano (q4) | 0.913 | **1.000** | 1.000 | **0.952** | 100% | 0.322 / 0.263 |
| Granite small English R2 (q8) | **0.928** | 0.957 | 1.000 | 0.946 | 100% | 0.786 / 0.773 |
| EmbeddingGemma 2 (q8) | 0.913 | 0.971 | 0.986 | 0.940 | 98.7% | 0.673 / 0.693 |
| **LEAF-IR (q8)** | 0.870 | 0.986 | 1.000 | 0.920 | 100% | 0.210 / 0.177 |
| EmbeddingGemma 2 (q4) | 0.884 | 0.942 | 0.986 | 0.916 | 97.4% | 0.660 / 0.690 |
| EmbeddingGemma v1 (q4) | 0.855 | 0.986 | 1.000 | 0.913 | 100% | 0.313 / 0.300 |
| Jina v5 nano retrieval (q4) | 0.870 | 0.928 | 0.957 | 0.900 | 100% | 0.329 / 0.214 |
| GTE-ModernBERT (q8) | 0.812 | 0.957 | 0.971 | 0.875 | 100% | 0.557 / 0.544 |
| Qwen3-Embedding 0.6B (q8) | 0.797 | 0.942 | 0.942 | 0.866 | 98.7% | 0.372 / 0.395 |
| harrier-oss-v1 270M (q4) | 0.797 | 0.913 | 0.942 | 0.846 | 100% | 0.405 / 0.360 |
| Granite multilingual R2 97M (quint8) | 0.710 | 0.913 | 0.971 | 0.795 | 98.7% | 0.741 / 0.754 |

### 3.3 Cost on the native CPU runtime (`probes/current-models-results.jsonl`)

| Model | Download | Load ms (cached) | ms per Task | Query ms | RSS loaded / after indexing |
| --- | --- | --- | --- | --- | --- |
| LEAF-IR | 24 MB | 77 | 37 | 1.7 | 145 / 251 MB |
| Granite small R2 | 55 MB | 240 | 122 | 3.0 | 188 / 626 MB |
| Granite multilingual 97M | 124 MB | (first load) | 117 | 3.9 | 715 / 882 MB |
| GTE-ModernBERT | 154 MB | (first load) | 326 | 7.5 | 464 / 858 MB |
| EmbeddingGemma v1 q4 | ≈ 200 MB | 1,200 | 488 | 13 | 542 / 579 MB |
| Jina v5 nano q4 | 155 MB | (first load) | 511 | 18 | 428 / 625 MB |
| Voyage 4 nano q4 | 252 MB | (first load) | 844 | 33 | 384 / 907 MB |
| EmbeddingGemma 2 q4 / q8 | ≈ 210 / ≈ 350 MB | (first load) | 947 / 989 | 30 / 63 | 801 / 1,151–1,306 MB |
| Qwen3-Embedding 0.6B q8 | 625 MB | (first load) | 1,138 | 48 | 1,273 / 2,238 MB |
| harrier 270M q4 | 226 MB | 2,523 | 2,088 | 24 | 493 / 566 MB |

### 3.4 Cost on the production-candidate WebAssembly runtime (`probes/lean2.mjs`, `probes/lean.mjs`, 4 threads)

| Model | ms per Task | Today's 170 Tasks | Query ms (median) | RSS loaded / peak | Rankings vs native |
| --- | --- | --- | --- | --- | --- |
| **LEAF-IR** | **106** | **18 s** | **5** | 267 / 476 MB | identical |
| Granite small R2 | 487 | 82 s | 9 | 369 / 718 MB | identical |
| Voyage 4 nano | 2,304 | 392 s | 171 | 821 / 1,277 MB | identical |
| EmbeddingGemma 2 (`model_quantized`; empty modality inputs) | 4,270 | 730 s (171 Tasks) | 151 | 1,134 / 1,522 MB | r@1 0.913, r@5 0.957, r@10 0.986, MRR 0.940 (native q8: 0.913 / 0.971 / 0.986 / 0.940) |

EmbeddingGemma 2 on WASM was run after the architecture review (AR-001), `probes/egemma2-wasm-q8.json`. Its ONNX graph also takes `image_features`, `video_features` and `audio_features` (`[tokens, 512]`); text-only use feeds them empty. A worker-thread probe (`probes/worker-thread-probe/`) confirmed ort-web threads work inside a Node `worker_thread` (LEAF-IR 555 → 233 ms/text from 1 to 4 threads, on a shared machine).

Thread scaling (Granite, WASM): 1 thread 1,481 ms/Task; 4 threads 487; 8 threads 548. Use 4 threads at most.

## 4. Results — Round 1 (superseded for model choice; still valid for method questions)

40 queries.

| Model | Indexed text | r@1 | r@5 | r@10 | MRR |
| --- | --- | --- | --- | --- | --- |
| Granite small R2 | first 1,024 tokens | 0.875 | 0.925 | 1.000 | 0.907 |
| Granite small R2 | chunks (best chunk) | 0.800 | 0.950 | 0.975 | 0.858 |
| EmbeddingGemma v1 | chunks | 0.825 | 1.000 | 1.000 | 0.888 |
| Arctic embed xs | chunks | 0.625 | 0.850 | 0.900 | 0.720 |
| bge-small en v1.5 | first 512 tokens | 0.675 | 0.825 | 0.900 | 0.751 |
| Nomic embed v1.5 | chunks | 0.600 | 0.825 | 0.900 | 0.701 |
| Jina v2 small en | first 1,024 tokens | 0.600 | 0.775 | 0.875 | 0.692 |
| Multilingual E5 small | chunks | 0.475 | 0.700 | 0.850 | 0.584 |
| BM25 keyword ranking | — | 0.550 | 0.775 | 0.850 | 0.644 |
| Current board search (whole-query substring) | — | 0 | 0 | 0 | 0 |

Method findings that still hold:

- **Whole Task vs chunks:** indexing the whole Task (one vector) gives better first results than splitting into chunks (MRR 0.906 vs 0.838 for Granite on WASM). Chunks slightly raise r@5 but generic sections ("Done when…") cause false matches.
- **No keyword fusion:** adding keyword ranking (BM25, reciprocal-rank fusion) lowers the first result (Granite r@1 0.875 → 0.700). Exact text matches belong in a separate first tier, not in a fused score.
- **Relative cut-off needed:** scores are compressed on this homogeneous corpus (every Task scores high for any query), so a fixed absolute cut-off cannot define "matches". A rule "within a margin of the best score, and only when the best score clears a floor" works (Granite: margin 0.03 kept all 40 targets, showed 1 Task typically and 9 at p90). Margin and floor are model-specific and belong to each model's catalog entry.

## 5. Conclusions

1. **Default model:** LEAF-IR, for top-tier quality at the lowest CPU, memory and download cost. That matters most for the future high-volume collections the user plans (agent conversations).
2. **Catalog alternatives, verified on the same data:** Granite small English R2 (better first result, long inputs); EmbeddingGemma 2 (multilingual environments).
3. **Not recommended:**
   - Voyage 4 nano: quality is excellent but the cost is out of proportion for CPU use.
   - Qwen3 0.6B, harrier 270M, GTE-ModernBERT, Granite multilingual 97M: lower quality here.
   - Jina v5: non-commercial licence.
4. **Model-specific settings:** each model has its own prompts, pooling, token limit and relevance thresholds. A model switch must re-index, because vectors from different models are not comparable.

## 6. Limits

- **Small set:** 69 queries written by the Solution Designer; good for ranking models, not an exact accuracy promise.
- **One corpus, one language:** English software Tasks from one user. Multilingual quality was not measured.
- **Fast host:** timings come from a fast machine under concurrent load.
- **Quantized exports:** only community/official ONNX exports at the listed dtypes were tested.

## 7. Reproduce

All scripts are in `probes/`. They read the Task folder read-only and take every path as an argument.

```bash
# dependencies in their own folders
npm --prefix <deps> install @huggingface/transformers@4.3.1
npm --prefix <deps2> install onnxruntime-web@1.30.0 @huggingface/tokenizers@0.2.0
# round 2 quality + native cost (one model key per run; see MODELS in bench2.mjs)
node probes/bench2.mjs <deps> <modelsCache> ~/.autobyteus/server-data probes/queries70.json probes/offtopic.json leafir <dumpDir>
python3 -I probes/analyze2.py <dumpDir>
# WASM cost
node probes/lean2.mjs <deps2> <modelsCache>/onnx-community/mdbr-leaf-ir-ONNX model_quantized ~/.autobyteus/server-data probes/queries70.json 4 512 mean "Represent this sentence for searching relevant passages: " ""
# baselines
python3 -I probes/lexical.py ~/.autobyteus/server-data probes/queries.json
```
